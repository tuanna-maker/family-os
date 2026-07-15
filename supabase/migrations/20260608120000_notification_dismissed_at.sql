-- Thông báo đã xóa trong app Family — ẩn vĩnh viễn (kể cả cài lại).
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_user_active_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;
