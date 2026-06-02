-- Observability + rate limiting schema
CREATE TABLE IF NOT EXISTS public.app_logs (
  id bigint GENERATED ALWAYS AS IDENTITY,
  level text NOT NULL CHECK (level IN ('debug','info','warn','error','fatal')),
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  app text NOT NULL CHECK (app IN ('family','guard')),
  session_id text,
  device_info jsonb NOT NULL DEFAULT '{}',
  request_id text,
  ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS public.app_logs_default PARTITION OF public.app_logs DEFAULT;

CREATE INDEX IF NOT EXISTS idx_app_logs_ts ON public.app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user ON public.app_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON public.app_logs (level, created_at DESC);

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_logs_insert_service ON public.app_logs;
CREATE POLICY app_logs_insert_service ON public.app_logs FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS app_logs_select_admin ON public.app_logs;
CREATE POLICY app_logs_select_admin ON public.app_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.request_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  parent_id text,
  span_name text NOT NULL,
  duration_ms int NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  attrs jsonb NOT NULL DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_traces_req ON public.request_traces (request_id);
CREATE INDEX IF NOT EXISTS idx_request_traces_created ON public.request_traces (created_at DESC);
ALTER TABLE public.request_traces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS request_traces_service ON public.request_traces;
CREATE POLICY request_traces_service ON public.request_traces FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.health_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('healthy','degraded','down')),
  checks jsonb NOT NULL DEFAULT '{}',
  duration_ms int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON public.health_checks (created_at DESC);
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS health_checks_read_admin ON public.health_checks;
CREATE POLICY health_checks_read_admin ON public.health_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS health_checks_insert_service ON public.health_checks;
CREATE POLICY health_checks_insert_service ON public.health_checks FOR INSERT TO service_role WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rate_limits_service ON public.rate_limits;
CREATE POLICY rate_limits_service ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.metrics_hourly AS
SELECT date_trunc('hour', created_at) AS hour, app, level, count(*) AS log_count
FROM public.app_logs GROUP BY 1, 2, 3;
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_hourly ON public.metrics_hourly (hour, app, level);

CREATE OR REPLACE FUNCTION public.refresh_metrics_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.metrics_hourly;
END;
$$;

COMMENT ON TABLE public.app_logs IS 'Mobile structured logs; partition + purge >30d via pg_cron';