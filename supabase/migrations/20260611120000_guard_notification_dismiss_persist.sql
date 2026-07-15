-- Guard app: ẩn thông báo vĩnh viễn (kể cả cài lại app).

ALTER TABLE platform.notification
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_user_active_idx
  ON platform.notification (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.guard_inbox_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.security_requests(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guard_inbox_dismissals_user_request_uidx UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS guard_inbox_dismissals_user_idx
  ON public.guard_inbox_dismissals (user_id);

ALTER TABLE public.guard_inbox_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY guard_inbox_dismissals_select_self ON public.guard_inbox_dismissals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY guard_inbox_dismissals_insert_self ON public.guard_inbox_dismissals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY guard_inbox_dismissals_delete_self ON public.guard_inbox_dismissals
  FOR DELETE USING (auth.uid() = user_id);
