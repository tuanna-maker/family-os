-- Resident scope + guard directory RPCs (used by web + mobile family app)
-- DROP required when OUT/return row type changed vs existing function on remote DB.

DROP FUNCTION IF EXISTS public.resolve_user_primary_apartment(uuid);
DROP FUNCTION IF EXISTS public.list_project_guards(uuid);
DROP FUNCTION IF EXISTS public.list_project_guard_shifts(uuid, date, date);

CREATE OR REPLACE FUNCTION public.resolve_user_primary_apartment(_user_id uuid)
RETURNS TABLE (
  apartment_id uuid,
  project_id uuid,
  tenant_id uuid,
  block_id uuid,
  family_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.project_id, p.tenant_id, a.block_id, ar.family_id
  FROM public.apartment_residents ar
  JOIN public.apartments a ON a.id = ar.apartment_id
  JOIN public.projects p ON p.id = a.project_id
  WHERE ar.move_out_date IS NULL
    AND (
      auth.uid() = _user_id
      OR public.is_saas_admin(auth.uid())
    )
    AND (
      public.is_family_member(_user_id, ar.family_id)
      OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = ar.family_id AND f.owner_id = _user_id)
    )
  ORDER BY ar.is_primary DESC, ar.move_in_date DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_project_guards(_project_id uuid)
RETURNS TABLE (
  guard_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  role text,
  on_shift_today boolean,
  next_shift_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today_shifts AS (
    SELECT gs.guard_id, gs.start_at, gs.status
    FROM public.guard_shifts gs
    WHERE gs.project_id = _project_id
      AND gs.shift_date = CURRENT_DATE
      AND gs.status IN ('scheduled', 'checked_in')
  ),
  on_duty AS (
    SELECT DISTINCT guard_id FROM today_shifts
    WHERE status = 'checked_in'
       OR start_at::date = CURRENT_DATE
  ),
  next_shift AS (
    SELECT DISTINCT ON (guard_id) guard_id, start_at AS next_at
    FROM public.guard_shifts
    WHERE project_id = _project_id
      AND shift_date >= CURRENT_DATE
      AND start_at > now()
      AND status = 'scheduled'
    ORDER BY guard_id, start_at
  )
  SELECT
    ur.user_id,
    pr.full_name,
    pr.avatar_url,
    pr.phone,
    ur.role::text,
    EXISTS (SELECT 1 FROM on_duty od WHERE od.guard_id = ur.user_id),
    ns.next_at
  FROM public.user_roles ur
  LEFT JOIN public.profiles pr ON pr.id = ur.user_id
  LEFT JOIN next_shift ns ON ns.guard_id = ur.user_id
  WHERE ur.project_id = _project_id
    AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
    AND public.is_resident_of_project(auth.uid(), _project_id)
  ORDER BY ur.role, pr.full_name;
$$;

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.id,
    gs.guard_id,
    pr.full_name,
    pr.avatar_url,
    gs.shift_date,
    gs.shift_type::text,
    gs.start_at,
    gs.end_at,
    gs.status::text
  FROM public.guard_shifts gs
  LEFT JOIN public.profiles pr ON pr.id = gs.guard_id
  WHERE gs.project_id = _project_id
    AND gs.shift_date BETWEEN _from AND _to
    AND public.is_resident_of_project(auth.uid(), _project_id)
  ORDER BY gs.shift_date, gs.start_at;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_user_primary_apartment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_guards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid, date, date) TO authenticated;
