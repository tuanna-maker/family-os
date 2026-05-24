# Lovable — Triển khai Supabase (migration + Edge Functions)

> **Mục đích:** Bạn dùng **Lovable chỉ để cập nhật Supabase** (project `bigarvjahnxiuovepaxm`).  
> **Không** port sang TanStack server routes, **không** sửa monorepo `family-os` trên Lovable.  
> Mobile apps (`apps/family`, `apps/guard`) đã gọi `POST {VITE_SUPABASE_URL}/functions/v1/log-ingest`.

---

## Cách gửi cho Lovable

Gửi **theo thứ tự** (1 tin nhắn hoặc nhiều tin nếu giới hạn ký tự):

| Bước | Gửi gì |
|------|--------|
| 1 | Copy nguyên khối **PROMPT** bên dưới |
| 2 | Đính kèm / paste **FILE 1** (migration SQL) |
| 3 | Paste lần lượt **FILE 2, 3, 4** (3 Edge Functions) |
| 4 | Paste **FILE 5** (`config.toml` snippet) + **Cron + Verify** |

Hoặc upload file `LOVABLE_SUPABASE_DEPLOY.md` này vào chat Lovable.

**Không gửi:** `apps/*`, `packages/*`, `scan-receipt` (đã có serverFn trên project — chỉ kiểm tra tồn tại).

---

## PROMPT (copy từ đây → Lovable)

```text
Bạn chỉ làm việc trên SUPABASE project bigarvjahnxiuovepaxm — KHÔNG port sang TanStack routes, KHÔNG tạo src/routes/api trên Lovable app.

Nhiệm vụ:
1. Apply migration SQL (FILE 1) — tạo bảng app_logs, request_traces, health_checks, rate_limits, materialized view metrics_hourly, function refresh_metrics_views(). Migration phụ thuộc function public.has_role() đã có sẵn trên project.
2. Deploy 3 Supabase Edge Functions (Deno) đúng nội dung FILE 2–4:
   - log-ingest
   - health-check
   - metrics-aggregate
3. Cấu hình supabase/config.toml theo FILE 5 (verify_jwt = false cho 3 function trên).
4. Bật Supabase Cron (hoặc pg_cron gọi Edge URL):
   - health-check: */1 * * * *
   - metrics-aggregate: */5 * * * *
5. CORS Edge log-ingest: cho phép capacitor://localhost, https://localhost, origin web app.

KHÔNG deploy lại scan-receipt trừ khi Dashboard chưa có function đó.

Sau khi xong, báo:
- Migration đã apply (tên file 20260523120000_observability)
- URL 3 functions
- Cron đã bật
- curl verify health-check + log-ingest (dùng anon key, không paste secret)

Mobile monorepo (ngoài Lovable) sẽ gọi:
POST https://<project>.supabase.co/functions/v1/log-ingest
Body: { "logs": [{ "level","message","app":"family"|"guard","session_id","ts", ... }] }
```

---

## FILE 1 — Migration

**Đường dẫn repo:** `supabase/migrations/20260523120000_observability.sql`

```sql
-- Observability + rate limiting schema (Prompt 4 Part C)

-- ===== app_logs (partitioned by day) =====
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
CREATE POLICY app_logs_insert_service ON public.app_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY app_logs_select_admin ON public.app_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ===== request_traces =====
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
CREATE POLICY request_traces_service ON public.request_traces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== health_checks =====
CREATE TABLE IF NOT EXISTS public.health_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('healthy','degraded','down')),
  checks jsonb NOT NULL DEFAULT '{}',
  duration_ms int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_created ON public.health_checks (created_at DESC);

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_checks_read_admin ON public.health_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY health_checks_insert_service ON public.health_checks FOR INSERT TO service_role WITH CHECK (true);

-- ===== rate_limits =====
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limits_service ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== metrics materialized view (refresh via metrics-aggregate) =====
CREATE MATERIALIZED VIEW IF NOT EXISTS public.metrics_hourly AS
SELECT
  date_trunc('hour', created_at) AS hour,
  app,
  level,
  count(*) AS log_count
FROM public.app_logs
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_hourly ON public.metrics_hourly (hour, app, level);

CREATE OR REPLACE FUNCTION public.refresh_metrics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.metrics_hourly;
END;
$$;

COMMENT ON TABLE public.app_logs IS 'Mobile structured logs; partition + purge >30d via pg_cron';
```

---

## FILE 2 — Edge Function `log-ingest`

**Đường dẫn repo:** `supabase/functions/log-ingest/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-session-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const logs = Array.isArray(body.logs) ? body.logs : [body];

    const rows = logs.slice(0, 50).map((l: Record<string, unknown>) => ({
      level: String(l.level ?? "info").slice(0, 10),
      message: String(l.message ?? "").slice(0, 2000),
      context: l.context ?? {},
      user_id: l.user_id ?? null,
      app: l.app === "guard" ? "guard" : "family",
      session_id: String(l.session_id ?? "").slice(0, 64),
      device_info: l.device_info ?? {},
      request_id: requestId,
      ts: l.ts ?? new Date().toISOString(),
    }));

    const { error } = await supabase.from("app_logs").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: rows.length, request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## FILE 3 — Edge Function `health-check`

**Đường dẫn repo:** `supabase/functions/health-check/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = performance.now();
  const checks: Record<string, unknown> = {};

  try {
    const { error: dbErr } = await supabase.from("families").select("id").limit(1);
    checks.db = dbErr ? { ok: false, error: dbErr.message } : { ok: true };
  } catch (e) {
    checks.db = { ok: false, error: String(e) };
  }

  try {
    const { error: authErr } = await supabase.auth.getSession();
    checks.auth = authErr ? { ok: false, error: authErr.message } : { ok: true };
  } catch (e) {
    checks.auth = { ok: false, error: String(e) };
  }

  const durationMs = Math.round(performance.now() - started);
  const allOk = Object.values(checks).every((c) => (c as { ok: boolean }).ok);

  await supabase.from("health_checks").insert({
    status: allOk ? "healthy" : "degraded",
    checks,
    duration_ms: durationMs,
  });

  return new Response(JSON.stringify({ status: allOk ? "healthy" : "degraded", checks, duration_ms: durationMs }), {
    headers: { "Content-Type": "application/json" },
    status: allOk ? 200 : 503,
  });
});
```

---

## FILE 4 — Edge Function `metrics-aggregate`

**Đường dẫn repo:** `supabase/functions/metrics-aggregate/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Cron-triggered metrics rollup (refresh materialized views / aggregate tables). */
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.rpc("refresh_metrics_views");
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, refreshed_at: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## FILE 5 — `supabase/config.toml` (snippet)

```toml
project_id = "bigarvjahnxiuovepaxm"

[functions.log-ingest]
verify_jwt = false

[functions.health-check]
verify_jwt = false

[functions.metrics-aggregate]
verify_jwt = false
```

---

## Tham chiếu client (không cần Lovable sửa — chỉ để verify contract)

Mobile monorepo đã gửi log như sau (`packages/shared-utils/src/logger.ts`):

- URL: `{VITE_SUPABASE_URL}/functions/v1/log-ingest`
- Method: `POST`
- Body: `{ "logs": [ { "level", "message", "app": "family"|"guard", "session_id", "ts", "context?", "user_id?", "device_info?" } ] }`

---

## Cron (Lovable / Supabase Dashboard)

| Function | Schedule |
|----------|----------|
| `health-check` | `*/1 * * * *` |
| `metrics-aggregate` | `*/5 * * * *` |

Gọi bằng **service role** hoặc Supabase scheduled Edge invocations.

---

## Verify (chạy sau deploy)

```bash
# Thay $SUPABASE_URL và keys từ Dashboard
curl -s -X POST "$SUPABASE_URL/functions/v1/health-check" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

curl -s -X POST "$SUPABASE_URL/functions/v1/log-ingest" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"level":"info","message":"lovable-deploy-test","app":"family","session_id":"test","ts":"2026-05-23T12:00:00Z"}]}'
```

Kiểm tra bảng `app_logs` và `health_checks` có row mới.

---

## Checklist deliverable từ Lovable

- [ ] Migration `20260523120000_observability` applied
- [ ] Edge: `log-ingest`, `health-check`, `metrics-aggregate` deployed
- [ ] Cron 1 phút / 5 phút bật
- [ ] `scan-receipt`: xác nhận **đã có** (không deploy trùng)
- [ ] curl verify OK (không paste secret trong chat)
