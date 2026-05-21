
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  family_id uuid,
  type text NOT NULL,
  ref_id text,
  title text NOT NULL,
  body text,
  due_at timestamptz,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_user_dedupe_uidx ON public.notifications(user_id, dedupe_key);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_self ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE POLICY notifications_update_self ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY notifications_delete_self ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
