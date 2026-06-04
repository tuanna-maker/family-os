-- Chat trực tiếp cư dân ↔ bảo an (Family app)
CREATE TABLE IF NOT EXISTS public.security_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('resident', 'guard', 'system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_chat_user_created
  ON public.security_chat_messages (user_id, created_at);

ALTER TABLE public.security_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_chat_select_own ON public.security_chat_messages;
CREATE POLICY security_chat_select_own ON public.security_chat_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS security_chat_insert_own ON public.security_chat_messages;
CREATE POLICY security_chat_insert_own ON public.security_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND sender_role = 'resident');

CREATE OR REPLACE FUNCTION public.security_chat_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_role = 'resident' THEN
    INSERT INTO public.security_chat_messages (user_id, family_id, sender_role, body)
    VALUES (
      NEW.user_id,
      NEW.family_id,
      'guard',
      'Bảo an đã nhận tin. Đội trực sẽ phản hồi trong vài phút.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_chat_auto_reply ON public.security_chat_messages;
CREATE TRIGGER trg_security_chat_auto_reply
  AFTER INSERT ON public.security_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.security_chat_auto_reply();

GRANT SELECT, INSERT ON public.security_chat_messages TO authenticated;
