
-- 1. Enable pg_net for cron HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. REVOKE metrics_hourly from public roles
REVOKE ALL ON public.metrics_hourly FROM anon, authenticated;

-- 3. system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  source text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unack ON public.system_alerts (created_at DESC) WHERE acknowledged = false;

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_select_alerts" ON public.system_alerts;
CREATE POLICY "super_admin_select_alerts" ON public.system_alerts
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super_admin_update_alerts" ON public.system_alerts;
CREATE POLICY "super_admin_update_alerts" ON public.system_alerts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 4. Health alert checker
CREATE OR REPLACE FUNCTION public.check_health_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  degraded_count int;
BEGIN
  SELECT COUNT(*) INTO degraded_count
  FROM (
    SELECT status FROM public.health_checks
    ORDER BY created_at DESC
    LIMIT 2
  ) recent
  WHERE status <> 'healthy';

  IF degraded_count >= 2 THEN
    INSERT INTO public.system_alerts(severity, source, message, context)
    SELECT 'critical', 'health-check', 'Hệ thống degraded 2 lần liên tiếp',
      jsonb_build_object('checked_at', now())
    WHERE NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE source = 'health-check'
        AND created_at > now() - INTERVAL '10 minutes'
        AND acknowledged = false
    );
  END IF;
END;
$$;

-- 5. Cleanup function for app_logs > 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_app_logs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.app_logs WHERE ts < now() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 6. Index for app_logs querying
CREATE INDEX IF NOT EXISTS idx_app_logs_ts_level ON public.app_logs (ts DESC, level);
CREATE INDEX IF NOT EXISTS idx_app_logs_app_ts ON public.app_logs (app, ts DESC);
