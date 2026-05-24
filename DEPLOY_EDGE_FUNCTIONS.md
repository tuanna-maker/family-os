# Deploy Edge Functions (Lovable / Supabase CLI)

Repo đã có code; **deploy lên Supabase project** qua Lovable hoặc CLI.

## Files

| Path | Mô tả |
|------|--------|
| `supabase/migrations/20260523120000_observability.sql` | Tables observability + RLS |
| `supabase/functions/log-ingest/` | Batch logs từ mobile |
| `supabase/functions/health-check/` | DB/auth probe (cron 1 phút) |
| `supabase/functions/metrics-aggregate/` | RPC metrics (cron 5 phút) |
| `supabase/config.toml` | `verify_jwt` per function |

## CLI (tùy chọn)

```bash
supabase link --project-ref bigarvjahnxiuovepaxm
supabase db push
supabase functions deploy log-ingest
supabase functions deploy health-check
supabase functions deploy metrics-aggregate
```

## Cron (Dashboard)

- `health-check`: `*/1 * * * *`
- `metrics-aggregate`: `*/5 * * * *`

## Verify

```bash
curl -X POST "$SUPABASE_URL/functions/v1/health-check" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Mobile: `VITE_ENABLE_LOGGING=true` hoặc production build → `initLogger` POST `/functions/v1/log-ingest`.

**Lovable (Supabase only):** gửi [LOVABLE_SUPABASE_DEPLOY.md](./LOVABLE_SUPABASE_DEPLOY.md) — observability.  
**Quét hoá đơn mobile:** gửi [LOVABLE_SCAN_RECEIPT_DEPLOY.md](./LOVABLE_SCAN_RECEIPT_DEPLOY.md) — Edge `scan-receipt`.

Prompt tóm tắt: [PRODUCTION_READINESS_TODO.md §6](./PRODUCTION_READINESS_TODO.md#6-deploy-edge-functions--lovable).
