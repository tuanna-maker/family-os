
-- ===== device_token table =====
CREATE TABLE IF NOT EXISTS platform.device_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  app text NOT NULL CHECK (app IN ('family','guard','web')),
  device_id text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_token_user ON platform.device_token(user_id);
CREATE INDEX IF NOT EXISTS idx_device_token_app  ON platform.device_token(app);

ALTER TABLE platform.device_token ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_token_own_select ON platform.device_token
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY device_token_own_insert ON platform.device_token
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY device_token_own_update ON platform.device_token
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY device_token_own_delete ON platform.device_token
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Helper: list on-duty guards =====
CREATE OR REPLACE FUNCTION care.on_duty_guards()
RETURNS TABLE(guard_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT gs.guard_id
  FROM public.guard_shifts gs
  WHERE gs.status = 'checked_in'
    AND gs.check_in_at IS NOT NULL
    AND gs.check_in_at > now() - interval '12 hours';
$$;

GRANT EXECUTE ON FUNCTION care.on_duty_guards() TO authenticated;

-- ===== Fan-out function =====
CREATE OR REPLACE FUNCTION care.fanout_sos_alert(_event_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, care, platform
AS $$
DECLARE
  _ev care.sos_event%ROWTYPE;
  _count int := 0;
  _payload jsonb;
BEGIN
  SELECT * INTO _ev FROM care.sos_event WHERE id = _event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  _payload := jsonb_build_object(
    'event_id', _ev.id,
    'household_id', _ev.household_id,
    'severity', _ev.severity,
    'trigger_kind', _ev.trigger_kind,
    'location', _ev.location,
    'triggered_at', _ev.created_at
  );

  -- 1) Outbox event for downstream dispatcher (FCM worker)
  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
  VALUES ('sos_event', _ev.id::text, 'sos.triggered', _payload, 'P0');

  -- 2) Per-guard notification rows (in_app + fcm channel) for on-duty guards
  WITH ins AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key)
    SELECT g.guard_id,
           _ev.household_id,
           'fcm',
           'P0',
           'sos.triggered',
           'KHẨN CẤP: SOS từ hộ ' || _ev.household_id::text,
           'Có yêu cầu cứu trợ. Vui lòng tiếp nhận ngay.',
           _payload,
           'sos:' || _ev.id::text || ':' || g.guard_id::text
    FROM care.on_duty_guards() g
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM ins;

  -- Timeline entry
  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_ev.id, NULL, 'dispatched'::care.sos_timeline_kind,
          jsonb_build_object('fanout_count', _count));

  RETURN _count;
END $$;

GRANT EXECUTE ON FUNCTION care.fanout_sos_alert(uuid) TO authenticated;

-- ===== Wire trigger_sos to call fanout automatically =====
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
  _existing boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_member(_uid, _household_id) THEN
    RAISE EXCEPTION 'Not a family member of household';
  END IF;

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

  -- Fan-out (P0 outbox + per-guard notifications)
  PERFORM care.fanout_sos_alert(_event_id);

  RETURN _event_id;
END $$;
