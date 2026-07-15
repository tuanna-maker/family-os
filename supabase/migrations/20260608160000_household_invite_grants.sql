-- Fix "permission denied for table invite" — grants + SECURITY DEFINER RPC fallback

GRANT USAGE ON SCHEMA household TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON household.invite TO authenticated, service_role;
GRANT SELECT ON household.family_quota TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION household.gen_invite_token() TO authenticated, service_role;

-- Public RPC so mobile/web work even when PostgREST schema exposure differs
CREATE OR REPLACE FUNCTION public.create_household_invite(
  _household_id uuid,
  _invited_email text DEFAULT NULL,
  _invited_phone text DEFAULT NULL,
  _expires_in_days int DEFAULT 7,
  _role public.app_role DEFAULT 'family_member'
)
RETURNS TABLE (invite_id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = household, public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tok text;
  _exp timestamptz;
  _row household.invite%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.families f WHERE f.id = _household_id AND f.owner_id = _uid
  ) THEN
    RAISE EXCEPTION 'Chỉ chủ hộ mới được tạo lời mời';
  END IF;

  _tok := household.gen_invite_token();
  _exp := now() + (_expires_in_days || ' days')::interval;

  INSERT INTO household.invite (
    household_id, token, role, invited_by, invited_email, invited_phone, expires_at
  ) VALUES (
    _household_id, _tok, _role, _uid, NULLIF(trim(_invited_email), ''), NULLIF(trim(_invited_phone), ''), _exp
  )
  RETURNING * INTO _row;

  RETURN QUERY SELECT _row.id, _row.token, _row.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household_invite(uuid, text, text, int, public.app_role) TO authenticated;
