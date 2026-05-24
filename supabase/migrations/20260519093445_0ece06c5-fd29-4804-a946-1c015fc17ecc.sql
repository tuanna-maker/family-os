-- ============ ELDERLY PROFILES ============
CREATE TABLE public.elderly_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  age INTEGER,
  relation TEXT,
  conditions TEXT[] NOT NULL DEFAULT '{}',
  doctor TEXT,
  phone TEXT,
  address TEXT,
  safe_status TEXT NOT NULL DEFAULT 'ok' CHECK (safe_status IN ('ok','warn','alert')),
  safe_note TEXT,
  safe_last_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.elderly_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY elderly_profiles_select ON public.elderly_profiles
  FOR SELECT USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY elderly_profiles_insert ON public.elderly_profiles
  FOR INSERT WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY elderly_profiles_update ON public.elderly_profiles
  FOR UPDATE USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY elderly_profiles_delete ON public.elderly_profiles
  FOR DELETE USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_elderly_profiles_updated
  BEFORE UPDATE ON public.elderly_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_elderly_profiles_family ON public.elderly_profiles(family_id);

-- ============ CARE NOTES ============
CREATE TABLE public.care_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  elderly_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_notes_select ON public.care_notes
  FOR SELECT USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY care_notes_insert ON public.care_notes
  FOR INSERT WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY care_notes_delete ON public.care_notes
  FOR DELETE USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE INDEX idx_care_notes_elderly ON public.care_notes(elderly_id, created_at DESC);

-- ============ MEDICINE LOGS ============
CREATE TABLE public.medicine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  reminder_id UUID NOT NULL REFERENCES public.medicine_reminders(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taken_by UUID NOT NULL,
  note TEXT
);

ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY medicine_logs_select ON public.medicine_logs
  FOR SELECT USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY medicine_logs_insert ON public.medicine_logs
  FOR INSERT WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = taken_by);
CREATE POLICY medicine_logs_delete ON public.medicine_logs
  FOR DELETE USING (auth.uid() = taken_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE INDEX idx_medicine_logs_reminder ON public.medicine_logs(reminder_id, taken_at DESC);

-- ============ SAFE CHECKS ============
CREATE TABLE public.safe_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  elderly_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warn','alert')),
  note TEXT,
  checked_by UUID NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safe_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY safe_checks_select ON public.safe_checks
  FOR SELECT USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY safe_checks_insert ON public.safe_checks
  FOR INSERT WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = checked_by);
CREATE POLICY safe_checks_delete ON public.safe_checks
  FOR DELETE USING (auth.uid() = checked_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE INDEX idx_safe_checks_elderly ON public.safe_checks(elderly_id, checked_at DESC);