-- Khi bảo vệ trả lời chat → ghi public.notifications để app Gia đình poll / realtime bắn banner OS.

CREATE OR REPLACE FUNCTION public.security_chat_notify_resident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preview text;
BEGIN
  IF NEW.sender_role <> 'guard' THEN
    RETURN NEW;
  END IF;

  IF NEW.body ~* 'Bảo an đã nhận tin' OR NEW.body ~* 'Security received your message' THEN
    RETURN NEW;
  END IF;

  preview := public.security_chat_preview_body(NEW.body, COALESCE(NEW.message_type, 'text'));

  INSERT INTO public.notifications (user_id, family_id, type, ref_id, title, body, dedupe_key)
  VALUES (
    NEW.user_id,
    NEW.family_id,
    'security.chat',
    NEW.id::text,
    'Đội bảo an',
    preview,
    'security.chat:' || NEW.id::text
  )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS security_chat_notify_resident_trg ON public.security_chat_messages;
CREATE TRIGGER security_chat_notify_resident_trg
  AFTER INSERT ON public.security_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.security_chat_notify_resident();
