
-- =====================================================
-- WAVE 2: care.sos_event / sos_timeline / dispatch_assignment
-- =====================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE care.sos_status AS ENUM ('triggered','acknowledged','dispatched','resolved','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE care.sos_trigger_kind AS ENUM ('button','fall','noise','manual','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE care.sos_severity AS ENUM ('low','normal','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE care.dispatch_status AS ENUM ('pending','accepted','enroute','onsite','completed','cancelled','reassigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE care.sos_timeline_kind AS ENUM ('created','ack','dispatch','escalate','resolve','cancel','note','assignment_update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- TABLE: care.sos_event ----------
CREATE TABLE IF NOT EXISTS care.sos_event (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL,
  triggered_by  uuid NOT NULL,
  trigger_kind  care.sos_trigger_kind NOT NULL DEFAULT 'button',
  severity      care.sos_severity NOT NULL DEFAULT 'high',
  status        care.sos_status NOT NULL DEFAULT 'triggered',
  location      jsonb,
  device_info   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ack_at        timestamptz,
  ack_by        uuid,
  resolved_at   timestamptz,
  resolved_by   uuid,
  cancelled_at  timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sos_event_household_active
  ON care.sos_event(household_id)
  WHERE status IN ('triggered','acknowledged','dispatched');
CREATE INDEX IF NOT EXISTS idx_sos_event_created ON care.sos_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_event_status ON care.sos_event(status);

ALTER TABLE care.sos_event ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION care.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_sos_event_updated ON care.sos_event;
CREATE TRIGGER trg_sos_event_updated BEFORE UPDATE ON care.sos_event
FOR EACH ROW EXECUTE FUNCTION care.tg_set_updated_at();

-- ---------- TABLE: care.sos_timeline (append-only) ----------
CREATE TABLE IF NOT EXISTS care.sos_timeline (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES care.sos_event(id) ON DELETE CASCADE,
  actor_id    uuid,
  kind        care.sos_timeline_kind NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sos_timeline_event ON care.sos_timeline(event_id, created_at);
ALTER TABLE care.sos_timeline ENABLE ROW LEVEL SECURITY;

-- ---------- TABLE: care.dispatch_assignment ----------
CREATE TABLE IF NOT EXISTS care.dispatch_assignment (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES care.sos_event(id) ON DELETE CASCADE,
  guard_id     uuid NOT NULL,
  status       care.dispatch_status NOT NULL DEFAULT 'pending',
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  enroute_at   timestamptz,
  arrived_at   timestamptz,
  completed_at timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_event ON care.dispatch_assignment(event_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_guard_open
  ON care.dispatch_assignment(guard_id)
  WHERE status IN ('pending','accepted','enroute','onsite');
ALTER TABLE care.dispatch_assignment ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_dispatch_updated ON care.dispatch_assignment;
CREATE TRIGGER trg_dispatch_updated BEFORE UPDATE ON care.dispatch_assignment
FOR EACH ROW EXECUTE FUNCTION care.tg_set_updated_at();

-- ---------- HELPERS (SECURITY DEFINER, no recursion) ----------
CREATE OR REPLACE FUNCTION care.is_guard_on_event(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM care.dispatch_assignment d
    WHERE d.event_id = _event_id AND d.guard_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION care.can_view_event(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM care.sos_event e
    WHERE e.id = _event_id AND (
      public.is_family_member(_user_id, e.household_id)
      OR care.is_guard_on_event(_user_id, _event_id)
      OR public.is_super_admin(_user_id)
      OR public.is_security_user(_user_id)
    )
  );
$$;

-- Replace placeholder
CREATE OR REPLACE FUNCTION care.has_active_sos_override(_user_id uuid, _household_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM care.sos_event e
    WHERE e.household_id = _household_id
      AND e.status IN ('triggered','acknowledged','dispatched')
      AND (
        public.is_family_member(_user_id, _household_id)
        OR EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = e.id AND d.guard_id = _user_id)
        OR public.is_security_user(_user_id)
        OR public.is_super_admin(_user_id)
      )
  );
$$;

-- ---------- RLS: care.sos_event ----------
DROP POLICY IF EXISTS sos_event_select ON care.sos_event;
CREATE POLICY sos_event_select ON care.sos_event FOR SELECT TO authenticated
USING (
  public.is_family_member(auth.uid(), household_id)
  OR EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = id AND d.guard_id = auth.uid())
  OR public.is_super_admin(auth.uid())
  OR public.is_security_user(auth.uid())
);

DROP POLICY IF EXISTS sos_event_insert ON care.sos_event;
CREATE POLICY sos_event_insert ON care.sos_event FOR INSERT TO authenticated
WITH CHECK (
  public.is_family_member(auth.uid(), household_id)
  AND auth.uid() = triggered_by
);

DROP POLICY IF EXISTS sos_event_update ON care.sos_event;
CREATE POLICY sos_event_update ON care.sos_event FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = id AND d.guard_id = auth.uid())
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (auth.uid() = triggered_by AND status = 'triggered')  -- self-cancel only while pending
);

DROP POLICY IF EXISTS sos_event_delete ON care.sos_event;
CREATE POLICY sos_event_delete ON care.sos_event FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ---------- RLS: care.sos_timeline ----------
DROP POLICY IF EXISTS sos_timeline_select ON care.sos_timeline;
CREATE POLICY sos_timeline_select ON care.sos_timeline FOR SELECT TO authenticated
USING (care.can_view_event(auth.uid(), event_id));

DROP POLICY IF EXISTS sos_timeline_insert ON care.sos_timeline;
CREATE POLICY sos_timeline_insert ON care.sos_timeline FOR INSERT TO authenticated
WITH CHECK (
  care.can_view_event(auth.uid(), event_id)
  AND (actor_id IS NULL OR actor_id = auth.uid() OR public.is_super_admin(auth.uid()))
);

-- ---------- RLS: care.dispatch_assignment ----------
DROP POLICY IF EXISTS dispatch_select ON care.dispatch_assignment;
CREATE POLICY dispatch_select ON care.dispatch_assignment FOR SELECT TO authenticated
USING (
  auth.uid() = guard_id
  OR care.can_view_event(auth.uid(), event_id)
);

DROP POLICY IF EXISTS dispatch_insert ON care.dispatch_assignment;
CREATE POLICY dispatch_insert ON care.dispatch_assignment FOR INSERT TO authenticated
WITH CHECK (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS dispatch_update ON care.dispatch_assignment;
CREATE POLICY dispatch_update ON care.dispatch_assignment FOR UPDATE TO authenticated
USING (
  auth.uid() = guard_id
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS dispatch_delete ON care.dispatch_assignment;
CREATE POLICY dispatch_delete ON care.dispatch_assignment FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ---------- GRANTS ----------
GRANT USAGE ON SCHEMA care TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON care.sos_event TO authenticated;
GRANT SELECT, INSERT ON care.sos_timeline TO authenticated;
GRANT SELECT, INSERT, UPDATE ON care.dispatch_assignment TO authenticated;

-- ---------- REALTIME ----------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE care.sos_event;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE care.sos_timeline;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE care.dispatch_assignment;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE care.sos_event REPLICA IDENTITY FULL;
ALTER TABLE care.sos_timeline REPLICA IDENTITY FULL;
ALTER TABLE care.dispatch_assignment REPLICA IDENTITY FULL;
