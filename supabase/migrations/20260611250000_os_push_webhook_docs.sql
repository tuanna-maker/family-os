-- Push khi app tắt: deploy Edge Functions + Database Webhooks (Dashboard).
--
-- 1) dispatch-security-request-push
--    Table: public.security_requests | Events: INSERT
--    Payload: { "request_id": "<NEW.id>" } hoặc để webhook gửi record
--
-- 2) dispatch-notification-push
--    Table: public.notifications | Events: INSERT
--    Payload: { "notification_id": "<NEW.id>" }
--
-- 3) dispatch-chat-push (đã có)
--    Table: public.security_chat_messages | Events: INSERT
--
-- App mobile cũng gọi các function sau khi gửi (firePushDispatch / fireChatPushDispatch).

COMMENT ON TABLE public.security_requests IS
  'Yêu cầu bảo an. OS push khi tắt app: webhook INSERT → dispatch-security-request-push + platform.device_token (guard).';

COMMENT ON TABLE public.notifications IS
  'Thông báo cư dân. OS push khi tắt app: webhook INSERT → dispatch-notification-push + platform.device_token (family).';
