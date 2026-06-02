-- 1) Extensions + private schema for key storage
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.encryption_keys (
  name text PRIMARY KEY,
  key  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.encryption_keys ENABLE ROW LEVEL SECURITY;

INSERT INTO private.encryption_keys(name, key)
VALUES ('health_profile', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION private.get_enc_key(_name text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = private AS $$
  SELECT key FROM private.encryption_keys WHERE name = _name;
$$;
REVOKE ALL ON FUNCTION private.get_enc_key(text) FROM PUBLIC, anon, authenticated;

-- 2) Add encrypted columns
ALTER TABLE public.health_profiles
  ADD COLUMN IF NOT EXISTS blood_type_enc bytea,
  ADD COLUMN IF NOT EXISTS allergies_enc  bytea,
  ADD COLUMN IF NOT EXISTS conditions_enc bytea;

-- 3) Backfill from plaintext (if columns still exist & have data)
DO $$
DECLARE _k text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_profiles' AND column_name='blood_type'
  ) THEN
    _k := private.get_enc_key('health_profile');
    UPDATE public.health_profiles
       SET blood_type_enc = CASE WHEN blood_type IS NOT NULL AND blood_type_enc IS NULL
                                 THEN pgp_sym_encrypt(blood_type, _k) ELSE blood_type_enc END,
           allergies_enc  = CASE WHEN allergies  IS NOT NULL AND allergies_enc  IS NULL
                                 THEN pgp_sym_encrypt(allergies,  _k) ELSE allergies_enc  END,
           conditions_enc = CASE WHEN conditions IS NOT NULL AND conditions_enc IS NULL
                                 THEN pgp_sym_encrypt(conditions, _k) ELSE conditions_enc END;
  END IF;
END $$;

-- 4) Drop plaintext columns
ALTER TABLE public.health_profiles
  DROP COLUMN IF EXISTS blood_type,
  DROP COLUMN IF EXISTS allergies,
  DROP COLUMN IF EXISTS conditions;

-- 5) Block direct SELECT of encrypted bytea columns from clients
-- (RLS already restricts rows; revoke column-level SELECT for the bytea cols)
REVOKE SELECT (blood_type_enc, allergies_enc, conditions_enc)
  ON public.health_profiles FROM anon, authenticated;

-- 6) Read function with emergency override
CREATE OR REPLACE FUNCTION public.get_health_profiles(_family_id uuid)
RETURNS TABLE(
  id uuid, family_id uuid, member_id uuid, name text, dob date,
  blood_type text, allergies text, conditions text,
  notes text, created_at timestamptz, updated_at timestamptz,
  emergency_unlocked boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, private, care
AS $$
DECLARE
  _uid uuid := auth.uid();
  _key text;
  _is_member boolean;
  _emergency boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  _is_member := public.is_family_member(_uid, _family_id);
  _emergency := (public.is_security_user(_uid) OR public.is_super_admin(_uid))
                AND EXISTS (
                  SELECT 1 FROM care.sos_event
                  WHERE household_id = _family_id
                    AND status IN ('triggered'::care.sos_status,
                                   'acknowledged'::care.sos_status,
                                   'dispatched'::care.sos_status)
                );

  IF NOT (_is_member OR public.is_super_admin(_uid) OR _emergency) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Audit emergency reads
  IF _emergency AND NOT _is_member THEN
    PERFORM public.log_audit('health_emergency_read', 'health_profiles',
      _family_id::text, jsonb_build_object('actor', _uid));
  END IF;

  _key := private.get_enc_key('health_profile');

  RETURN QUERY
  SELECT hp.id, hp.family_id, hp.member_id, hp.name, hp.dob,
    CASE WHEN hp.blood_type_enc IS NOT NULL
         THEN pgp_sym_decrypt(hp.blood_type_enc, _key) END,
    CASE WHEN hp.allergies_enc IS NOT NULL
         THEN pgp_sym_decrypt(hp.allergies_enc, _key) END,
    CASE WHEN hp.conditions_enc IS NOT NULL
         THEN pgp_sym_decrypt(hp.conditions_enc, _key) END,
    hp.notes, hp.created_at, hp.updated_at,
    (_emergency AND NOT _is_member) AS emergency_unlocked
  FROM public.health_profiles hp
  WHERE hp.family_id = _family_id
  ORDER BY hp.created_at;
END $$;

REVOKE ALL ON FUNCTION public.get_health_profiles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_health_profiles(uuid) TO authenticated;

-- 7) Upsert function (encrypts on write)
CREATE OR REPLACE FUNCTION public.upsert_health_profile_enc(
  _id uuid,
  _family_id uuid,
  _name text,
  _dob date,
  _blood_type text,
  _allergies text,
  _conditions text,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
  _key text;
  _out_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_member(_uid, _family_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  _key := private.get_enc_key('health_profile');

  IF _id IS NOT NULL THEN
    UPDATE public.health_profiles SET
      name = _name,
      dob  = _dob,
      blood_type_enc = CASE WHEN _blood_type IS NOT NULL AND length(_blood_type) > 0
                            THEN pgp_sym_encrypt(_blood_type, _key) ELSE NULL END,
      allergies_enc  = CASE WHEN _allergies  IS NOT NULL AND length(_allergies)  > 0
                            THEN pgp_sym_encrypt(_allergies,  _key) ELSE NULL END,
      conditions_enc = CASE WHEN _conditions IS NOT NULL AND length(_conditions) > 0
                            THEN pgp_sym_encrypt(_conditions, _key) ELSE NULL END,
      notes = _notes,
      updated_at = now()
    WHERE id = _id AND family_id = _family_id
    RETURNING id INTO _out_id;
  ELSE
    INSERT INTO public.health_profiles
      (family_id, created_by, name, dob, blood_type_enc, allergies_enc, conditions_enc, notes)
    VALUES (
      _family_id, _uid, _name, _dob,
      CASE WHEN _blood_type IS NOT NULL AND length(_blood_type) > 0
           THEN pgp_sym_encrypt(_blood_type, _key) END,
      CASE WHEN _allergies  IS NOT NULL AND length(_allergies)  > 0
           THEN pgp_sym_encrypt(_allergies,  _key) END,
      CASE WHEN _conditions IS NOT NULL AND length(_conditions) > 0
           THEN pgp_sym_encrypt(_conditions, _key) END,
      _notes
    )
    RETURNING id INTO _out_id;
  END IF;

  RETURN _out_id;
END $$;

REVOKE ALL ON FUNCTION public.upsert_health_profile_enc(uuid, uuid, text, date, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_health_profile_enc(uuid, uuid, text, date, text, text, text, text) TO authenticated;