-- Household schema for family invites (mobile + web)

CREATE SCHEMA IF NOT EXISTS household;

CREATE TABLE IF NOT EXISTS household.invite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'family_member',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  invited_phone text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_invite_household ON household.invite(household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_household_invite_token ON household.invite(token);

CREATE TABLE IF NOT EXISTS household.family_quota (
  household_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  storage_used_bytes bigint NOT NULL DEFAULT 0,
  storage_limit_bytes bigint NOT NULL DEFAULT 5368709120,
  members_count int NOT NULL DEFAULT 0,
  members_limit int NOT NULL DEFAULT 20,
  notifications_month int NOT NULL DEFAULT 0,
  notifications_limit int NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Token 48 ký tự hex (2×UUID), không cần pgcrypto/gen_random_bytes
CREATE OR REPLACE FUNCTION household.gen_invite_token()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = household, public
AS $$
  SELECT lower(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
$$;

ALTER TABLE household.invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE household.family_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS household_invite_select ON household.invite;
CREATE POLICY household_invite_select ON household.invite
FOR SELECT USING (
  public.is_family_member(auth.uid(), household_id)
  OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = household_id AND f.owner_id = auth.uid())
);

DROP POLICY IF EXISTS household_invite_insert ON household.invite;
CREATE POLICY household_invite_insert ON household.invite
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.families f WHERE f.id = household_id AND f.owner_id = auth.uid())
);

DROP POLICY IF EXISTS household_invite_update ON household.invite;
CREATE POLICY household_invite_update ON household.invite
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.families f WHERE f.id = household_id AND f.owner_id = auth.uid())
);

DROP POLICY IF EXISTS household_quota_select ON household.family_quota;
CREATE POLICY household_quota_select ON household.family_quota
FOR SELECT USING (
  public.is_family_member(auth.uid(), household_id)
  OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = household_id AND f.owner_id = auth.uid())
);

GRANT USAGE ON SCHEMA household TO authenticated;
GRANT SELECT, INSERT, UPDATE ON household.invite TO authenticated;
GRANT SELECT ON household.family_quota TO authenticated;
GRANT EXECUTE ON FUNCTION household.gen_invite_token() TO authenticated;
