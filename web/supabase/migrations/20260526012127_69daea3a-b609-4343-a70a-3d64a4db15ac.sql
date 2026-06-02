
-- ============ 1. RLS: guard_shifts — residents of project can SELECT ============
DROP POLICY IF EXISTS guard_shifts_select ON public.guard_shifts;
CREATE POLICY guard_shifts_select ON public.guard_shifts
FOR SELECT
USING (
  (auth.uid() = guard_id)
  OR is_security_user(auth.uid())
  OR is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND is_bql_of_project(auth.uid(), project_id))
  OR (project_id IS NOT NULL AND is_resident_of_project(auth.uid(), project_id))
);

-- ============ 2. RLS: security_requests — guards see only their project ============
DROP POLICY IF EXISTS sec_select_security_project ON public.security_requests;
CREATE POLICY sec_select_security_project ON public.security_requests
FOR SELECT
USING (
  is_security_user(auth.uid())
  AND project_id IS NOT NULL
  AND project_id IN (
    SELECT project_id FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('security_admin','security_staff')
      AND project_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS sec_update_security_project ON public.security_requests;
CREATE POLICY sec_update_security_project ON public.security_requests
FOR UPDATE
USING (
  is_security_user(auth.uid())
  AND project_id IS NOT NULL
  AND project_id IN (
    SELECT project_id FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('security_admin','security_staff')
      AND project_id IS NOT NULL
  )
);

-- ============ 3. RPC: list guards of a project (project-scoped directory) ============
CREATE OR REPLACE FUNCTION public.list_project_guards(_project_id uuid)
RETURNS TABLE (
  guard_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  role app_role,
  on_shift_today boolean,
  next_shift_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must belong to this project (resident, BQL, security staff, or super admin)
  IF NOT (
    is_super_admin(auth.uid())
    OR is_bql_of_project(auth.uid(), _project_id)
    OR is_resident_of_project(auth.uid(), _project_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.project_id = _project_id
        AND ur.role IN ('security_admin','security_staff')
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of project';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id AS guard_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    ur.role,
    EXISTS (
      SELECT 1 FROM public.guard_shifts gs
      WHERE gs.guard_id = ur.user_id
        AND gs.project_id = _project_id
        AND gs.shift_date = CURRENT_DATE
        AND gs.status IN ('scheduled','checked_in')
    ) AS on_shift_today,
    (
      SELECT MIN(gs.start_at) FROM public.guard_shifts gs
      WHERE gs.guard_id = ur.user_id
        AND gs.project_id = _project_id
        AND gs.start_at >= now()
        AND gs.status = 'scheduled'
    ) AS next_shift_at
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.project_id = _project_id
    AND ur.role IN ('security_admin','security_staff')
  ORDER BY ur.role DESC, p.full_name NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_project_guards(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_project_guards(uuid) TO authenticated;

-- ============ 4. RPC: list guard shifts for a project window ============
CREATE OR REPLACE FUNCTION public.list_project_guard_shifts(
  _project_id uuid,
  _from date,
  _to date
)
RETURNS TABLE (
  shift_id uuid,
  guard_id uuid,
  guard_name text,
  guard_avatar text,
  shift_date date,
  shift_type text,
  start_at timestamptz,
  end_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _to < _from THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;
  IF (_to - _from) > 60 THEN
    RAISE EXCEPTION 'date range too large (max 60 days)';
  END IF;

  IF NOT (
    is_super_admin(auth.uid())
    OR is_bql_of_project(auth.uid(), _project_id)
    OR is_resident_of_project(auth.uid(), _project_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.project_id = _project_id
        AND ur.role IN ('security_admin','security_staff')
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of project';
  END IF;

  RETURN QUERY
  SELECT
    gs.id AS shift_id,
    gs.guard_id,
    p.full_name AS guard_name,
    p.avatar_url AS guard_avatar,
    gs.shift_date,
    gs.shift_type,
    gs.start_at,
    gs.end_at,
    gs.status
  FROM public.guard_shifts gs
  LEFT JOIN public.profiles p ON p.id = gs.guard_id
  WHERE gs.project_id = _project_id
    AND gs.shift_date BETWEEN _from AND _to
  ORDER BY gs.shift_date ASC, gs.start_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid,date,date) TO authenticated;
