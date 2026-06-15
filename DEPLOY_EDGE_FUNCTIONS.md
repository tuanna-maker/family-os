# Deploy Edge Functions (Lovable / Supabase CLI)

Repo đã có code; **deploy lên Supabase project** qua Lovable hoặc CLI.

## Files

| Path | Mô tả |
|------|--------|
| `supabase/migrations/20260523120000_observability.sql` | Tables observability + RLS |
| `supabase/functions/log-ingest/` | Batch logs từ mobile |
| `supabase/functions/health-check/` | DB/auth probe (cron 1 phút) |
| `supabase/functions/metrics-aggregate/` | RPC metrics (cron 5 phút) |
| `supabase/functions/dispatch-chat-push/` | Push tin chat qua Expo Push API |
| `supabase/functions/dispatch-notification-push/` | Push thông báo `public.notifications` (Family) |
| `supabase/functions/dispatch-security-request-push/` | Push yêu cầu mới tới Guard |
| `supabase/config.toml` | `verify_jwt` per function |

## CLI (tùy chọn)

```bash
supabase link --project-ref bigarvjahnxiuovepaxm
supabase db push
supabase functions deploy log-ingest
supabase functions deploy health-check
supabase functions deploy metrics-aggregate
supabase functions deploy dispatch-chat-push
supabase functions deploy dispatch-notification-push
supabase functions deploy dispatch-security-request-push
```

## Push khi app tắt (OS notification)

1. Deploy 3 function push ở trên.
2. User bật thông báo trong app; token Expo lưu `platform.device_token`.
3. **Database Webhooks** (Dashboard → Database → Webhooks):

| Table | Event | Function |
|-------|-------|----------|
| `public.security_chat_messages` | INSERT | `dispatch-chat-push` |
| `public.notifications` | INSERT | `dispatch-notification-push` |
| `public.security_requests` | INSERT | `dispatch-security-request-push` |

App mobile cũng gọi function sau khi gửi (`fireChatPushDispatch`, `firePushDispatch`).

**Android release:** cần `google-services.json` trong `mobile/family` và `mobile/guard` để FCM nhận push khi app bị kill.

## Push chat (Messenger-style)

1. Deploy function `dispatch-chat-push` (dùng `SUPABASE_SERVICE_ROLE_KEY` + Expo Push, không cần Firebase).
2. App mobile đã gọi function sau mỗi lần gửi tin (`fireChatPushDispatch`).
3. **Khuyến nghị — Database Webhook** (Dashboard → Database → Webhooks → Create):
   - **Table:** `public.security_chat_messages`
   - **Events:** `INSERT`
   - **Type:** Supabase Edge Function → `dispatch-chat-push`
   - Webhook gửi kèm service role → push vẫn chạy kể cả app cũ chưa gọi function.

**Điều kiện:** User bật thông báo trong app; token Expo đã lưu `platform.device_token`.

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
**Push chat mobile:** gửi [LOVABLE_CHAT_PUSH_DEPLOY.md](./LOVABLE_CHAT_PUSH_DEPLOY.md) — Edge `dispatch-chat-push`.

Prompt tóm tắt: [PRODUCTION_READINESS_TODO.md §6](./PRODUCTION_READINESS_TODO.md#6-deploy-edge-functions--lovable).
