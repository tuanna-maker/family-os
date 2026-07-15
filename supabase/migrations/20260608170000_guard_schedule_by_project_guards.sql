-- Lịch trực: khớp theo bảo vệ thuộc dự án (không chỉ guard_shifts.project_id — có thể NULL/sai)

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
  WHERE gs.shift_date BETWEEN _from AND _to
    AND public.is_resident_of_project(auth.uid(), _project_id)
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = gs.guard_id
        AND ur.project_id = _project_id
        AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
    )
  ORDER BY gs.shift_date, gs.start_at;
$$;

GRANT EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid, date, date) TO authenticated;
