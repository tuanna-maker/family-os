-- Push chat tức thì: Edge Function `dispatch-chat-push` + Expo Push API.
-- App gọi function sau khi gửi tin; webhook DB (tùy chọn) đảm bảo push khi client cũ.

COMMENT ON TABLE public.security_chat_messages IS
  'Chat cư dân ↔ bảo vệ. Push: deploy supabase/functions/dispatch-chat-push, bật Database Webhook INSERT → dispatch-chat-push (Supabase Dashboard → Database → Webhooks).';
