CREATE TABLE IF NOT EXISTS platform.web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL CHECK (metric IN ('LCP','INP','CLS','FCP','TTFB')),
  value numeric NOT NULL,
  rating text CHECK (rating IN ('good','needs-improvement','poor')),
  route text,
  page text,
  nav_type text,
  ua text
);

CREATE INDEX IF NOT EXISTS web_vitals_metric_ts_idx ON platform.web_vitals (metric, ts DESC);
CREATE INDEX IF NOT EXISTS web_vitals_route_ts_idx ON platform.web_vitals (route, ts DESC);

GRANT ALL ON platform.web_vitals TO service_role;
ALTER TABLE platform.web_vitals ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS; nobody else can read/write.