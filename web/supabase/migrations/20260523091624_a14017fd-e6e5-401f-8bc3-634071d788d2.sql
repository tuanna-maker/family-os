
-- =====================
-- GUARD_SHIFTS
-- =====================
CREATE TABLE public.guard_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id uuid NOT NULL,
  project_id uuid,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_type text NOT NULL CHECK (shift_type IN ('morning','afternoon','night')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_location jsonb,
  check_out_location jsonb,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','checked_in','checked_out','missed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_guard_shifts_guard ON public.guard_shifts(guard_id, shift_date DESC);
CREATE INDEX idx_guard_shifts_project ON public.guard_shifts(project_id, shift_date DESC);

ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guard_shifts_select" ON public.guard_shifts FOR SELECT
USING (
  auth.uid() = guard_id
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id))
);

CREATE POLICY "guard_shifts_insert" ON public.guard_shifts FOR INSERT
WITH CHECK (
  public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR auth.uid() = guard_id
);

CREATE POLICY "guard_shifts_update" ON public.guard_shifts FOR UPDATE
USING (
  auth.uid() = guard_id
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "guard_shifts_delete" ON public.guard_shifts FOR DELETE
USING (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_guard_shifts_updated
BEFORE UPDATE ON public.guard_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- PATROL_LOGS
-- =====================
CREATE TABLE public.patrol_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id uuid NOT NULL,
  shift_id uuid REFERENCES public.guard_shifts(id) ON DELETE SET NULL,
  project_id uuid,
  route_code text,
  checkpoint_code text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scan_method text NOT NULL DEFAULT 'qr' CHECK (scan_method IN ('qr','nfc','manual')),
  location jsonb,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patrol_logs_guard ON public.patrol_logs(guard_id, scanned_at DESC);
CREATE INDEX idx_patrol_logs_project ON public.patrol_logs(project_id, scanned_at DESC);
CREATE INDEX idx_patrol_logs_shift ON public.patrol_logs(shift_id);

ALTER TABLE public.patrol_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patrol_logs_select" ON public.patrol_logs FOR SELECT
USING (
  auth.uid() = guard_id
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id))
);

CREATE POLICY "patrol_logs_insert" ON public.patrol_logs FOR INSERT
WITH CHECK (
  auth.uid() = guard_id
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "patrol_logs_delete" ON public.patrol_logs FOR DELETE
USING (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()));

-- =====================
-- INCIDENTS
-- =====================
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  reporter_id uuid,
  assigned_to uuid,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title text NOT NULL,
  description text,
  location text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  photos jsonb DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_incidents_project ON public.incidents(project_id, created_at DESC);
CREATE INDEX idx_incidents_status ON public.incidents(status, severity);
CREATE INDEX idx_incidents_assigned ON public.incidents(assigned_to);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_select" ON public.incidents FOR SELECT
USING (
  auth.uid() = reporter_id
  OR auth.uid() = assigned_to
  OR public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id))
);

CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (reporter_id IS NULL OR auth.uid() = reporter_id)
);

CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE
USING (
  public.is_security_user(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND public.is_bql_manager_of_project(auth.uid(), project_id))
);

CREATE POLICY "incidents_delete" ON public.incidents FOR DELETE
USING (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_incidents_updated
BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
