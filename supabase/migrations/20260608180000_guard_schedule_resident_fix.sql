-- Sửa lịch trực: resident check rộng hơn + khớp ca theo project/tenant/guard

CREATE OR REPLACE FUNCTION public.is_resident_of_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apartments a
    JOIN public.apartment_residents ar ON ar.apartment_id = a.id AND ar.move_out_date IS NULL
    WHERE a.project_id = _project_id
      AND public.is_family_member(_user_id, ar.family_id)
  );
$$;

DROP FUNCTION IF EXISTS public.list_project_guard_shifts(uuid, date, date);

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
  WITH project_ctx AS (
    SELECT p.id AS project_id, p.tenant_id
    FROM public.projects p
    WHERE p.id = _project_id
  ),
  project_guards AS (
    SELECT DISTINCT ur.user_id AS guard_id
    FROM public.user_roles ur
    CROSS JOIN project_ctx pc
    WHERE ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
      AND (
        ur.project_id = pc.project_id
        OR (ur.project_id IS NULL AND ur.tenant_id = pc.tenant_id)
        OR (ur.project_id IS NULL AND ur.tenant_id IS NULL)
      )
  )
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
  CROSS JOIN project_ctx pc
  WHERE gs.shift_date BETWEEN _from AND _to
    AND public.is_resident_of_project(auth.uid(), _project_id)
    AND (
      gs.project_id = pc.project_id
      OR (gs.project_id IS NULL AND gs.guard_id IN (SELECT pg.guard_id FROM project_guards pg))
      OR gs.guard_id IN (SELECT pg.guard_id FROM project_guards pg)
    )
  ORDER BY gs.shift_date, gs.start_at;
$$;

GRANT EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid, date, date) TO authenticated;
