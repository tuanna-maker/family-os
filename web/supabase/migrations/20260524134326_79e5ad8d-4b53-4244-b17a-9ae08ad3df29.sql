
-- Fix fanout_sos_alert: 'dispatched' -> 'dispatch'
CREATE OR REPLACE FUNCTION care.fanout_sos_alert(_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'care', 'platform'
AS $function$
DECLARE
  _ev care.sos_event%ROWTYPE;
  _count int := 0;
  _payload jsonb;
BEGIN
  SELECT * INTO _ev FROM care.sos_event WHERE id = _event_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  _payload := jsonb_build_object(
    'event_id', _ev.id, 'household_id', _ev.household_id,
    'severity', _ev.severity, 'trigger_kind', _ev.trigger_kind,
    'location', _ev.location, 'triggered_at', _ev.created_at
  );

  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
  VALUES ('sos_event', _ev.id::text, 'sos.triggered', _payload, 'P0');

  WITH ins AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key)
    SELECT g.guard_id, _ev.household_id, 'fcm', 'P0', 'sos.triggered',
           'KHẨN CẤP: SOS từ hộ ' || _ev.household_id::text,
           'Có yêu cầu cứu trợ. Vui lòng tiếp nhận ngay.',
           _payload,
           'sos:' || _ev.id::text || ':' || g.guard_id::text
    FROM care.on_duty_guards() g
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM ins;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_ev.id, NULL, 'dispatch'::care.sos_timeline_kind,
          jsonb_build_object('fanout_count', _count));
  RETURN _count;
END $function$;

-- Fix trigger_sos timeline kind: 'triggered' -> 'created'
CREATE OR REPLACE FUNCTION public.trigger_sos(_household_id uuid, _trigger_kind care.sos_trigger_kind DEFAULT 'button'::care.sos_trigger_kind, _severity care.sos_severity DEFAULT 'high'::care.sos_severity, _location jsonb DEFAULT NULL::jsonb, _device_info jsonb DEFAULT '{}'::jsonb, _notes text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'care'
AS $function$
DECLARE _uid uuid := auth.uid(); _event_id uuid;
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
  IF _event_id IS NOT NULL THEN RETURN _event_id; END IF;

  INSERT INTO care.sos_event(household_id, triggered_by, trigger_kind, severity, location, device_info, notes)
  VALUES (_household_id, _uid, _trigger_kind, _severity, _location, COALESCE(_device_info,'{}'::jsonb), _notes)
  RETURNING id INTO _event_id;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id, _uid, 'created'::care.sos_timeline_kind,
          jsonb_build_object('trigger_kind', _trigger_kind, 'severity', _severity, 'location', _location));

  PERFORM care.fanout_sos_alert(_event_id);
  RETURN _event_id;
END $function$;

-- Fix acknowledge_sos: 'acknowledged' -> 'ack'
CREATE OR REPLACE FUNCTION public.acknowledge_sos(_event_id uuid, _notes text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'care'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT (public.is_security_user(_uid) OR public.is_super_admin(_uid)) THEN
    RAISE EXCEPTION 'Only security/guard can acknowledge';
  END IF;

  UPDATE care.sos_event
     SET status = 'acknowledged'::care.sos_status,
         ack_at = COALESCE(ack_at, now()), ack_by = COALESCE(ack_by, _uid)
   WHERE id = _event_id AND status IN ('triggered','dispatched');
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found or not ackable'; END IF;

  INSERT INTO care.dispatch_assignment(event_id, guard_id, status, accepted_at)
  VALUES (_event_id, _uid, 'accepted'::care.dispatch_status, now())
  ON CONFLICT DO NOTHING;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id, _uid, 'ack'::care.sos_timeline_kind, jsonb_build_object('notes', _notes));
END $function$;

-- Fix resolve_sos: 'resolved'->'resolve', 'cancelled'->'cancel'
CREATE OR REPLACE FUNCTION public.resolve_sos(_event_id uuid, _notes text DEFAULT NULL::text, _cancelled boolean DEFAULT false)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'care'
AS $function$
DECLARE _uid uuid := auth.uid(); _ev care.sos_event%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  SELECT * INTO _ev FROM care.sos_event WHERE id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  IF NOT (
    public.is_security_user(_uid) OR public.is_super_admin(_uid)
    OR EXISTS (SELECT 1 FROM care.dispatch_assignment d WHERE d.event_id = _event_id AND d.guard_id = _uid)
    OR (_uid = _ev.triggered_by AND _cancelled AND _ev.status = 'triggered'::care.sos_status)
  ) THEN RAISE EXCEPTION 'Not allowed to resolve'; END IF;

  UPDATE care.sos_event
     SET status = CASE WHEN _cancelled THEN 'cancelled'::care.sos_status ELSE 'resolved'::care.sos_status END,
         resolved_at = CASE WHEN _cancelled THEN resolved_at ELSE now() END,
         resolved_by = CASE WHEN _cancelled THEN resolved_by ELSE _uid END,
         cancelled_at = CASE WHEN _cancelled THEN now() ELSE cancelled_at END,
         notes = COALESCE(notes,'') || COALESCE(E'\n' || _notes, '')
   WHERE id = _event_id;

  INSERT INTO care.sos_timeline(event_id, actor_id, kind, payload)
  VALUES (_event_id, _uid,
          CASE WHEN _cancelled THEN 'cancel'::care.sos_timeline_kind ELSE 'resolve'::care.sos_timeline_kind END,
          jsonb_build_object('notes', _notes));
END $function$;

-- Fix load-test helper: 'acknowledged' -> 'ack', filter notifs by data->>'event_id'
CREATE OR REPLACE FUNCTION public.run_sos_load_test(_n int DEFAULT 100, _household_id uuid DEFAULT NULL, _triggerer uuid DEFAULT NULL, _guard uuid DEFAULT NULL)
RETURNS TABLE(metric text, value_ms numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, care, platform
AS $$
DECLARE
  _hh uuid := COALESCE(_household_id, (SELECT id FROM public.families ORDER BY created_at LIMIT 1));
  _user uuid := COALESCE(_triggerer, (SELECT owner_id FROM public.families WHERE id = _hh));
  _g uuid := COALESCE(_guard, (SELECT user_id FROM public.user_roles WHERE role IN ('security_admin','security_staff') LIMIT 1));
  _t0 timestamptz; _t1 timestamptz; _t2 timestamptz; _t3 timestamptz; _ids uuid[]; _id_texts text[];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can run load test';
  END IF;

  DELETE FROM care.sos_event WHERE notes = 'LOADTEST';

  _t0 := clock_timestamp();
  WITH ins AS (
    INSERT INTO care.sos_event (household_id, triggered_by, trigger_kind, severity, location, device_info, notes, created_at)
    SELECT _hh, _user, 'button'::care.sos_trigger_kind, 'high'::care.sos_severity,
           jsonb_build_object('lat',10.77,'lng',106.7), '{}'::jsonb, 'LOADTEST', clock_timestamp()
    FROM generate_series(1, _n)
    RETURNING id
  )
  SELECT array_agg(id) INTO _ids FROM ins;
  _id_texts := ARRAY(SELECT u::text FROM unnest(_ids) AS u);
  _t1 := clock_timestamp();

  PERFORM care.fanout_sos_alert(u) FROM unnest(_ids) AS u;
  _t2 := clock_timestamp();

  UPDATE care.sos_event
     SET status='acknowledged'::care.sos_status,
         ack_at = clock_timestamp(), ack_by = _g
   WHERE id = ANY(_ids);
  INSERT INTO care.sos_timeline (event_id, actor_id, kind, payload)
  SELECT id, _g, 'ack'::care.sos_timeline_kind, '{}'::jsonb FROM unnest(_ids) AS id;
  _t3 := clock_timestamp();

  RETURN QUERY
  SELECT 'count'::text, _n::numeric
  UNION ALL SELECT 'insert_total_ms', round(extract(milliseconds FROM _t1 - _t0)::numeric, 1)
  UNION ALL SELECT 'fanout_total_ms', round(extract(milliseconds FROM _t2 - _t1)::numeric, 1)
  UNION ALL SELECT 'ack_total_ms', round(extract(milliseconds FROM _t3 - _t2)::numeric, 1)
  UNION ALL SELECT 'wall_total_ms', round(extract(milliseconds FROM _t3 - _t0)::numeric, 1)
  UNION ALL SELECT 'ack_avg_ms', round(avg(extract(milliseconds FROM (e.ack_at - e.created_at)))::numeric, 1) FROM care.sos_event e WHERE id = ANY(_ids)
  UNION ALL SELECT 'ack_p50_ms', round(percentile_cont(0.50) WITHIN GROUP (ORDER BY extract(milliseconds FROM (e.ack_at - e.created_at)))::numeric, 1) FROM care.sos_event e WHERE id = ANY(_ids)
  UNION ALL SELECT 'ack_p95_ms', round(percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(milliseconds FROM (e.ack_at - e.created_at)))::numeric, 1) FROM care.sos_event e WHERE id = ANY(_ids)
  UNION ALL SELECT 'ack_p99_ms', round(percentile_cont(0.99) WITHIN GROUP (ORDER BY extract(milliseconds FROM (e.ack_at - e.created_at)))::numeric, 1) FROM care.sos_event e WHERE id = ANY(_ids)
  UNION ALL SELECT 'ack_max_ms', round(max(extract(milliseconds FROM (e.ack_at - e.created_at)))::numeric, 1) FROM care.sos_event e WHERE id = ANY(_ids)
  UNION ALL SELECT 'outbox_rows', count(*)::numeric FROM platform.outbox WHERE aggregate_id = ANY(_id_texts)
  UNION ALL SELECT 'notification_rows', count(*)::numeric FROM platform.notification WHERE (data->>'event_id') = ANY(_id_texts);

  DELETE FROM platform.notification WHERE (data->>'event_id') = ANY(_id_texts);
  DELETE FROM platform.outbox WHERE aggregate_id = ANY(_id_texts);
  DELETE FROM care.sos_timeline WHERE event_id = ANY(_ids);
  DELETE FROM care.sos_event WHERE id = ANY(_ids);
END $$;
