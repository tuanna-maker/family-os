
CREATE OR REPLACE FUNCTION public.run_sos_load_test(
  _n int DEFAULT 100,
  _household_id uuid DEFAULT NULL,
  _triggerer uuid DEFAULT NULL,
  _guard uuid DEFAULT NULL
)
RETURNS TABLE(
  metric text,
  value_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, care, platform
AS $$
DECLARE
  _hh uuid := COALESCE(_household_id, (SELECT id FROM public.families ORDER BY created_at LIMIT 1));
  _user uuid := COALESCE(_triggerer, (SELECT owner_id FROM public.families WHERE id = _hh));
  _g uuid := COALESCE(_guard, (SELECT user_id FROM public.user_roles WHERE role IN ('security_admin','security_staff') LIMIT 1));
  _t0 timestamptz; _t1 timestamptz; _t2 timestamptz; _t3 timestamptz;
  _ids uuid[];
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
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
  _t1 := clock_timestamp();

  PERFORM care.fanout_sos_alert(u) FROM unnest(_ids) AS u;
  _t2 := clock_timestamp();

  UPDATE care.sos_event
     SET status='acknowledged'::care.sos_status,
         ack_at = clock_timestamp(),
         ack_by = _g
   WHERE id = ANY(_ids);
  INSERT INTO care.sos_timeline (event_id, actor_id, kind, payload)
  SELECT id, _g, 'acknowledged'::care.sos_timeline_kind, '{}'::jsonb
  FROM unnest(_ids) AS id;
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
  UNION ALL SELECT 'outbox_rows', count(*)::numeric FROM platform.outbox WHERE aggregate_id = ANY(_ids)
  UNION ALL SELECT 'notification_rows', count(*)::numeric FROM platform.notification WHERE aggregate_id = ANY(_ids);

  -- Cleanup
  DELETE FROM platform.notification WHERE aggregate_id = ANY(_ids);
  DELETE FROM platform.outbox WHERE aggregate_id = ANY(_ids);
  DELETE FROM care.sos_timeline WHERE event_id = ANY(_ids);
  DELETE FROM care.sos_event WHERE id = ANY(_ids);
END $$;

REVOKE ALL ON FUNCTION public.run_sos_load_test(int, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_sos_load_test(int, uuid, uuid, uuid) TO authenticated;
