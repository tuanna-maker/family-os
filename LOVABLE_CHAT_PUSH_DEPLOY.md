# Lovable — Deploy push chat `dispatch-chat-push`

> Mobile (`apps/family`, `apps/guard`) gọi `supabase.functions.invoke("dispatch-chat-push", { body: { message_id } })` sau khi gửi tin.  
> Function đọc `platform.device_token` và gửi qua **Expo Push API** (không cần Firebase).  
> **Chỉ làm Supabase** — không sửa TanStack / web app trên Lovable.

---

## Cách gửi Lovable

| Bước | Gửi |
|------|-----|
| 1 | Copy khối **PROMPT** |
| 2 | Paste **FILE 1** (migrations SQL — nếu chưa chạy) |
| 3 | Paste **FILE 2** (Edge Function code) |
| 4 | Paste **FILE 3** (config snippet) |
| 5 | Yêu cầu Lovable tạo **Database Webhook** (bước 4 trong PROMPT) |

Hoặc upload file `LOVABLE_CHAT_PUSH_DEPLOY.md` vào chat Lovable.

---

## PROMPT (copy → Lovable)

```text
Deploy push thông báo chat cho Supabase project bigarvjahnxiuovepaxm.

Mobile monorepo (family-os) gọi:
  supabase.functions.invoke("dispatch-chat-push", { body: { message_id: "<uuid>" } })
  JWT user tự gửi — verify_jwt = true.

Nhiệm vụ:

1. Apply migrations SQL (FILE 1) nếu chưa có trên DB:
   - 20260611140000_security_chat_messages.sql
   - 20260611150000_security_chat_media.sql
   - 20260611160000_security_chat_notifications.sql
   (Chỉ chạy phần chưa apply — đừng drop bảng đang dùng.)

2. Deploy Edge Function dispatch-chat-push đúng nội dung FILE 2.

3. supabase/config.toml: [functions.dispatch-chat-push] verify_jwt = true (FILE 3).

4. Database Webhook (Dashboard → Database → Webhooks → Create):
   - Name: security_chat_push
   - Table: public.security_chat_messages
   - Events: INSERT
   - Type: Supabase Edge Functions
   - Function: dispatch-chat-push
   (Webhook tự gửi service role — push chạy kể cả app cũ.)

5. Secrets Edge Function: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto khi deploy).
   KHÔNG cần FCM, Firebase, hay LOVABLE_API_KEY.

6. Verify:
   - Có ít nhất 1 row trong platform.device_token (app family hoặc guard, token ExponentPushToken[...]).
   - Gửi tin chat từ app → invoke function → response { ok: true, tokens: N, sent: N }.
   - Hoặc INSERT test row security_chat_messages + webhook → cùng response.

Báo lại:
- Migrations đã apply (liệt kê)
- URL function: https://bigarvjahnxiuovepaxm.supabase.co/functions/v1/dispatch-chat-push
- Webhook đã tạo (có/không)
- Kết quả verify (không paste service_role key)
```

---

## FILE 1 — Migrations (chạy SQL Editor nếu thiếu)

Áp dụng **theo thứ tự** từ repo `family-os`:

1. `supabase/migrations/20260611140000_security_chat_messages.sql`
2. `supabase/migrations/20260611150000_security_chat_media.sql`
3. `supabase/migrations/20260611160000_security_chat_notifications.sql`

> Paste từng file đầy đủ từ repo — không rút gọn trong chat Lovable nếu giới hạn ký tự; gửi nhiều tin hoặc upload file.

---

## FILE 2 — Edge Function

**Đường dẫn repo:** `supabase/functions/dispatch-chat-push/index.ts`

Paste toàn bộ nội dung file từ repo (237 dòng). Lovable tạo path:

`supabase/functions/dispatch-chat-push/index.ts`

---

## FILE 3 — `supabase/config.toml` (snippet)

```toml
[functions.dispatch-chat-push]
verify_jwt = true
```

---

## Database Webhook (Lovable / Dashboard thủ công)

| Field | Giá trị |
|-------|----------|
| Table | `public.security_chat_messages` |
| Events | `INSERT` |
| Function | `dispatch-chat-push` |

Payload webhook gửi `{ type, table, record }` — function đã xử lý `record.id`.

---

## Verify sau deploy

1. **SQL Editor:** `SELECT user_id, app, left(token, 30) FROM platform.device_token LIMIT 5;`  
   Phải có token dạng `ExponentPushToken[...]` sau khi user mở app và bật thông báo.

2. **Gửi tin** từ app Family hoặc Guard (APK mới có `fireChatPushDispatch`).

3. **Edge Functions → dispatch-chat-push → Logs:** xem `{ ok: true, sent: 1 }` hoặc lỗi.

4. Điện thoại nhận máy **thoát app** → banner trong vài giây.

---

## Checklist deliverable Lovable

- [ ] Migrations chat (11140000, 11150000, 11160000) applied
- [ ] Edge `dispatch-chat-push` deployed
- [ ] `verify_jwt = true` trong config
- [ ] Database Webhook INSERT → `dispatch-chat-push`
- [ ] Verify logs OK (không paste secret)
