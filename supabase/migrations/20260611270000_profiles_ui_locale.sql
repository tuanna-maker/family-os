-- Ngôn ngữ UI (Family / push) — đồng bộ từ app khi cư dân đổi ngôn ngữ.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_locale text NOT NULL DEFAULT 'vi'
  CHECK (ui_locale IN ('vi', 'en'));
