
-- household.invite
CREATE TABLE household.invite (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE,
  invited_by      uuid NOT NULL,
  invited_email   text,
  invited_phone   text,
  role            public.app_role NOT NULL DEFAULT 'family_member',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     timestamptz,
  accepted_by     uuid,
  revoked_at      timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (role IN ('family_owner','family_member')),
  CHECK (accepted_at IS NULL OR accepted_by IS NOT NULL)
);

CREATE INDEX idx_invite_household ON household.invite(household_id);
CREATE INDEX idx_invite_pending  ON household.invite(household_id) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_invite_token    ON household.invite(token) WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE household.invite ENABLE ROW LEVEL SECURITY;

CREATE POLICY invite_member_read ON household.invite
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), household_id));

CREATE POLICY invite_owner_insert ON household.invite
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(auth.uid(), household_id) AND invited_by = auth.uid());

CREATE POLICY invite_owner_update ON household.invite
  FOR UPDATE TO authenticated
  USING (public.is_family_owner(auth.uid(), household_id))
  WITH CHECK (public.is_family_owner(auth.uid(), household_id));

-- household.family_quota
CREATE TABLE household.family_quota (
  household_id          uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  storage_used_bytes    bigint NOT NULL DEFAULT 0 CHECK (storage_used_bytes >= 0),
  storage_limit_bytes   bigint NOT NULL DEFAULT 10737418240,
  members_count         int    NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  members_limit         int    NOT NULL DEFAULT 8,
  notifications_month   int    NOT NULL DEFAULT 0,
  notifications_limit   int    NOT NULL DEFAULT 10000,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_family_quota_updated
  BEFORE UPDATE ON household.family_quota
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE household.family_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY quota_member_read ON household.family_quota
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), household_id));

-- Auto-create quota row when a family is created
CREATE OR REPLACE FUNCTION household.ensure_quota_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO household.family_quota(household_id)
  VALUES (NEW.id)
  ON CONFLICT (household_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_families_ensure_quota
  AFTER INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION household.ensure_quota_row();

INSERT INTO household.family_quota(household_id)
SELECT id FROM public.families
ON CONFLICT (household_id) DO NOTHING;

-- Bridge views
CREATE OR REPLACE VIEW household.v_household AS
SELECT id, name, owner_id, created_at FROM public.families;

CREATE OR REPLACE VIEW household.v_member AS
SELECT ur.user_id, ur.family_id AS household_id, ur.role, ur.created_at
FROM public.user_roles ur
WHERE ur.family_id IS NOT NULL
  AND ur.role IN ('family_owner','family_member');

GRANT SELECT ON household.v_household TO authenticated;
GRANT SELECT ON household.v_member TO authenticated;

-- Token generator using gen_random_uuid (always available)
CREATE OR REPLACE FUNCTION household.gen_invite_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

REVOKE EXECUTE ON FUNCTION household.gen_invite_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION household.gen_invite_token() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION household.ensure_quota_row() FROM PUBLIC, anon;
