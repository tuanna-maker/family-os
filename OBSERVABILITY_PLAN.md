# OBSERVABILITY_PLAN.md

> Mobile (Capacitor) → Edge Functions + Postgres · 2026-05-23

## Architecture

```
Mobile App                    Supabase Edge (Deno)              Postgres
──────────                    ──────────────────              ────────
logger.info()  ──batch──►  log-ingest          ──insert──►  app_logs (partitioned)
navigation/errors          verify JWT (optional)              request_traces
Capacitor crash ─────────► level=fatal                        health_checks
                                                             metrics_hourly (MV)

pg_cron (1 min)  ────────►  health-check
pg_cron (5 min)  ────────►  metrics-aggregate → refresh_metrics_views()
Alert cron       ────────►  Slack/Telegram webhook
```

## C1. Logging

### Client (`packages/shared-utils/src/logger.ts`)

- Batch: **10 logs** or **5s** flush → `POST /functions/v1/log-ingest`
- Auto: `window.onerror`, `unhandledrejection`
- API: `logger.navigation()`, `logger.apiError()`, `logger.slowQuery(>1000ms)`

### Edge: `supabase/functions/log-ingest/index.ts`

```ts
POST { logs: [{ level, message, context, user_id, app, session_id, device_info, ts }] }
→ INSERT app_logs (max 50/request)
```

### Schema: `supabase/migrations/20260523120000_observability.sql`

- `app_logs` — partitioned by `created_at`, retention **30d** (pg_cron purge)
- RLS: insert `service_role`; select `super_admin`

### Integration checklist

- [x] Call `initLogger({ app: 'family' })` in `apps/family/src/main.tsx` (PROD or `VITE_ENABLE_LOGGING=true`)
- [x] Call `initLogger({ app: 'guard' })` in `apps/guard/src/main.tsx` (PROD or `VITE_ENABLE_LOGGING=true`)
- [ ] Attach `X-Request-Id` (uuid v7) on fetch wrapper
- [ ] Wire TanStack Router `onResolved` → `logger.navigation()`

---

## C2. Tracing

| Item | Implementation |
|------|----------------|
| Request ID | Header `X-Request-Id` + `X-Session-Id` from client |
| DB comment | Edge functions: `/* req=${requestId} */` prefix on raw SQL |
| Storage | `request_traces` table (request_id, parent_id, span_name, duration_ms, attrs) |
| Export | Optional OpenTelemetry → Grafana Tempo / Honeycomb |

---

## C3. Monitoring & alerting

### `health-check` Edge Function

- Cron **every 1 min** (Supabase scheduled function)
- Probes: DB (`families` select 1), auth session
- Writes `health_checks` row

### `metrics-aggregate` Edge Function

- Cron **every 5 min**
- Calls `refresh_metrics_views()` → `metrics_hourly` MV

### Alert rules (pg_cron + webhook)

| Rule | Condition | Channel |
|------|-----------|---------|
| Error rate | >5% 5xx in 5 min | Slack |
| Latency | p95 > 2s | Slack |
| SOS SLA | Unassigned > 3 min | Telegram + Push |
| DB pool | Saturation > 80% | PagerDuty |

### Metrics view (extend)

```sql
-- Future: edge_function_latency, dau_mau, sos_response_time
```

---

## C4. Crash reporting (mobile)

| Option | Recommendation |
|--------|----------------|
| `@capacitor-community/sentry` | Preferred for native crashes + symbolication |
| Roll-your-own | `logger.fatal()` → log-ingest (implemented) |

### Source maps

- Upload `dist/assets/*.js.map` to Sentry on CI release
- Capacitor: map stack traces via `android/app/build/outputs/mapping/` (ProGuard)

---

## Deploy

```bash
supabase functions deploy log-ingest --no-verify-jwt   # optional: verify in function
supabase functions deploy health-check
supabase functions deploy metrics-aggregate
supabase db push   # applies 20260523120000_observability.sql
```

### Scheduled triggers (config.toml)

```toml
[functions.health-check]
schedule = "*/1 * * * *"

[functions.metrics-aggregate]
schedule = "*/5 * * * *"
```

---

## Files added

| Path | Purpose |
|------|---------|
| `packages/shared-utils/src/logger.ts` | Client batch logger |
| `supabase/functions/log-ingest/index.ts` | Log ingestion |
| `supabase/functions/health-check/index.ts` | Health probe |
| `supabase/functions/metrics-aggregate/index.ts` | MV refresh |
| `supabase/migrations/20260523120000_observability.sql` | Tables + MV + RLS |
