CREATE OR REPLACE FUNCTION public.saas_observability_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_health record;
  _err_24h bigint;
  _warn_24h bigint;
  _total_24h bigint;
  _unack_alerts bigint;
  _critical_alerts bigint;
  _audit_24h bigint;
  _degraded_recent bigint;
  _active_users_24h bigint;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden: SaaS admin only';
  END IF;

  SELECT status, duration_ms, created_at, checks
    INTO _last_health
  FROM public.health_checks
  ORDER BY created_at DESC LIMIT 1;

  SELECT
    count(*) FILTER (WHERE level IN ('error','fatal')),
    count(*) FILTER (WHERE level = 'warn'),
    count(*),
    count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO _err_24h, _warn_24h, _total_24h, _active_users_24h
  FROM public.app_logs
  WHERE ts >= now() - interval '24 hours';

  SELECT
    count(*) FILTER (WHERE acknowledged = false),
    count(*) FILTER (WHERE severity = 'critical' AND acknowledged = false)
    INTO _unack_alerts, _critical_alerts
  FROM public.system_alerts
  WHERE created_at >= now() - interval '7 days';

  SELECT count(*) INTO _audit_24h FROM public.audit_logs
   WHERE created_at >= now() - interval '24 hours';

  SELECT count(*) INTO _degraded_recent FROM public.health_checks
   WHERE created_at >= now() - interval '24 hours' AND status <> 'healthy';

  RETURN jsonb_build_object(
    'health_status', COALESCE(_last_health.status, 'unknown'),
    'health_duration_ms', COALESCE(_last_health.duration_ms, 0),
    'health_checked_at', _last_health.created_at,
    'health_checks', COALESCE(_last_health.checks, '{}'::jsonb),
    'degraded_24h', _degraded_recent,
    'errors_24h', _err_24h,
    'warns_24h', _warn_24h,
    'logs_24h', _total_24h,
    'error_rate_pct', CASE WHEN _total_24h > 0
      THEN round((_err_24h::numeric / _total_24h::numeric) * 100, 2)
      ELSE 0 END,
    'active_users_24h', _active_users_24h,
    'unack_alerts', _unack_alerts,
    'critical_alerts', _critical_alerts,
    'audit_24h', _audit_24h
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_observability_timeseries(_hours int DEFAULT 24)
RETURNS TABLE(hour timestamptz, app text, level text, log_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _hours < 1 OR _hours > 168 THEN _hours := 24; END IF;

  RETURN QUERY
  SELECT m.hour, m.app, m.level, m.log_count
  FROM public.metrics_hourly m
  WHERE m.hour >= now() - (_hours || ' hours')::interval
  ORDER BY m.hour ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.saas_observability_recent_alerts(_limit int DEFAULT 20)
RETURNS TABLE(
  id uuid, severity text, source text, message text, context jsonb,
  acknowledged boolean, acknowledged_by uuid, acknowledged_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT a.id, a.severity, a.source, a.message, a.context,
         a.acknowledged, a.acknowledged_by, a.acknowledged_at, a.created_at
  FROM public.system_alerts a
  ORDER BY a.acknowledged ASC, a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END; $$;

CREATE OR REPLACE FUNCTION public.saas_observability_recent_errors(_limit int DEFAULT 30)
RETURNS TABLE(
  id bigint, ts timestamptz, level text, app text, message text,
  context jsonb, user_id uuid, user_name text, request_id text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT l.id, l.ts, l.level, l.app, l.message, l.context,
         l.user_id, p.full_name AS user_name, l.request_id
  FROM public.app_logs l
  LEFT JOIN public.profiles p ON p.id = l.user_id
  WHERE l.level IN ('error','fatal','warn')
    AND l.ts >= now() - interval '24 hours'
  ORDER BY l.ts DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END; $$;

CREATE OR REPLACE FUNCTION public.saas_observability_recent_audit(_limit int DEFAULT 30)
RETURNS TABLE(
  id uuid, actor_id uuid, actor_name text, action text,
  target_table text, target_id text, metadata jsonb, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT a.id, a.actor_id, p.full_name AS actor_name, a.action,
         a.target_table, a.target_id, a.metadata, a.created_at
  FROM public.audit_logs a
  LEFT JOIN public.profiles p ON p.id = a.actor_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END; $$;

CREATE OR REPLACE FUNCTION public.saas_observability_ack_alert(_alert_id uuid)
RETURNS public.system_alerts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.system_alerts%ROWTYPE;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.system_alerts
     SET acknowledged = true, acknowledged_by = auth.uid(), acknowledged_at = now()
   WHERE id = _alert_id
   RETURNING * INTO _row;
  RETURN _row;
END; $$;