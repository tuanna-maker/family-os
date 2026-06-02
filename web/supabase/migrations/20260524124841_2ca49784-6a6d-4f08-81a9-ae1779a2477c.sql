
-- Fix self-reference bug in care policies
DROP POLICY IF EXISTS sos_event_select ON care.sos_event;
DROP POLICY IF EXISTS sos_event_update ON care.sos_event;

CREATE POLICY sos_event_select ON care.sos_event
  FOR SELECT TO authenticated
  USING (
    public.is_family_member(auth.uid(), household_id)
    OR EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = sos_event.id AND d.guard_id = auth.uid())
    OR public.is_super_admin(auth.uid())
    OR public.is_security_user(auth.uid())
  );

CREATE POLICY sos_event_update ON care.sos_event
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = sos_event.id AND d.guard_id = auth.uid())
    OR public.is_security_user(auth.uid())
    OR public.is_super_admin(auth.uid())
    OR (auth.uid() = triggered_by AND status = 'triggered'::care.sos_status)
  );

-- ===== RPC: trigger_sos =====
CREATE OR REPLACE FUNCTION public.trigger_sos(
  _household_id uuid,
  _trigger_kind care.sos_trigger_kind DEFAULT 'button',
  _severity care.sos_severity DEFAULT 'high',
  _location jsonb DEFAULT NULL,
  _device_info jsonb DEFAULT '{}'::jsonb,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, care
AS $$
DECLARE
  _uid uuid := auth.uid();
  _event_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_member(_uid, _household_id) THEN
    RAISE EXCEPTION 'Not a family member of household';
  END IF;

  -- reuse active event in last 5 minutes to avoid double-trigger
  SELECT id INTO _event_id FROM care.sos_event
   WHERE household_id = _household_id
     AND status IN ('triggered','acknowledged','dispatched')
     AND created_at > now() - interval '5 minutes'
   ORDER BY created_at DESC LIMIT 1;

  IF _event_id IS NOT NULL THEN
    RETURN _event_id;
  END IF;

  INSERT INTO care.sos_event(household_id, triggered_by, trigger_kind, severity, location, device_info, notes)
  VALUES (_household_id, _uid, _trigger_kind, _severity, _location, COALESCE(_device_info,'{}'::jsonb), _notes)
  RETURNING id INTO _event_id;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id, _uid, 'triggered'::care.sos_timeline_kind,
          jsonb_build_object('trigger_kind', _trigger_kind, 'severity', _severity, 'location', _location));

  RETURN _event_id;
END $$;

GRANT EXECUTE ON FUNCTION public.trigger_sos(uuid, care.sos_trigger_kind, care.sos_severity, jsonb, jsonb, text) TO authenticated;

-- ===== RPC: acknowledge_sos =====
CREATE OR REPLACE FUNCTION public.acknowledge_sos(_event_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, care
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT (public.is_security_user(_uid) OR public.is_super_admin(_uid)) THEN
    RAISE EXCEPTION 'Only security/guard can acknowledge';
  END IF;

  UPDATE care.sos_event
     SET status = 'acknowledged'::care.sos_status,
         ack_at = COALESCE(ack_at, now()),
         ack_by = COALESCE(ack_by, _uid)
   WHERE id = _event_id
     AND status IN ('triggered','dispatched');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not ackable';
  END IF;

  -- upsert dispatch assignment
  INSERT INTO care.dispatch_assignment(event_id, guard_id, status, accepted_at)
  VALUES (_event_id, _uid, 'accepted'::care.dispatch_status, now())
  ON CONFLICT DO NOTHING;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id, _uid, 'acknowledged'::care.sos_timeline_kind,
          jsonb_build_object('notes', _notes));
END $$;

GRANT EXECUTE ON FUNCTION public.acknowledge_sos(uuid, text) TO authenticated;

-- ===== RPC: resolve_sos =====
CREATE OR REPLACE FUNCTION public.resolve_sos(_event_id uuid, _notes text DEFAULT NULL, _cancelled boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, care
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ev care.sos_event%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT * INTO _ev FROM care.sos_event WHERE id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  -- Allow: assigned guard, security, super_admin, or triggerer (cancel only when still triggered)
  IF NOT (
    public.is_security_user(_uid)
    OR public.is_super_admin(_uid)
    OR EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = _event_id AND d.guard_id = _uid)
    OR (_uid = _ev.triggered_by AND _cancelled AND _ev.status = 'triggered'::care.sos_status)
  ) THEN
    RAISE EXCEPTION 'Not allowed to resolve';
  END IF;

  UPDATE care.sos_event
     SET status = CASE WHEN _cancelled THEN 'cancelled'::care.sos_status ELSE 'resolved'::care.sos_status END,
         resolved_at = CASE WHEN _cancelled THEN resolved_at ELSE now() END,
         resolved_by = CASE WHEN _cancelled THEN resolved_by ELSE _uid END,
         cancelled_at = CASE WHEN _cancelled THEN now() ELSE cancelled_at END,
         notes = COALESCE(notes,'') || COALESCE(E'\n' || _notes, '')
   WHERE id = _event_id;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id,
          _uid,
          CASE WHEN _cancelled THEN 'cancelled'::care.sos_timeline_kind ELSE 'resolved'::care.sos_timeline_kind END,
          jsonb_build_object('notes', _notes));
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_sos(uuid, text, boolean) TO authenticated;
