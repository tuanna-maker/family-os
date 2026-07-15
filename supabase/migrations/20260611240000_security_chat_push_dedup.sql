-- Idempotent chat push: tránh gửi Expo push trùng khi client + webhook cùng gọi dispatch.

ALTER TABLE public.security_chat_messages
  ADD COLUMN IF NOT EXISTS push_dispatched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.security_chat_messages.push_dispatched_at IS
  'Set when dispatch-chat-push has sent Expo push for this message (idempotent).';
