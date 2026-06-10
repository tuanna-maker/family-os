-- Sửa lịch trực cho nhanvienbaove@ và dữ liệu legacy guard_id = tenant_id
-- Chạy SAU 20260608200000 và 20260608210000 (idempotent nếu chạy lại)

-- 1) guard_id nhầm tenant_id → user_id bảo vệ
UPDATE public.guard_shifts gs
SET guard_id = ur.user_id
FROM public.user_roles ur
WHERE ur.tenant_id = gs.guard_id
  AND ur.user_id IS NOT NULL
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  AND gs.guard_id IS DISTINCT FROM ur.user_id;

-- 2) project_id nhầm user_id → project thật
UPDATE public.guard_shifts gs
SET project_id = ur.project_id
FROM public.user_roles ur
WHERE gs.project_id = ur.user_id
  AND ur.project_id IS NOT NULL
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  AND gs.project_id IS DISTINCT FROM ur.project_id;

-- 3) project_id NULL / sai → project từ user_roles theo guard_id
UPDATE public.guard_shifts gs
SET project_id = ur.project_id
FROM public.user_roles ur
WHERE gs.guard_id = ur.user_id
  AND ur.project_id IS NOT NULL
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  AND (
    gs.project_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = gs.project_id)
  );

-- 4) Gán ca legacy (guard_id = tenant) về nhân viên bảo vệ cùng tenant
UPDATE public.guard_shifts gs
SET guard_id = pick.user_id
FROM (
  SELECT DISTINCT ON (ur.tenant_id)
    ur.tenant_id,
    ur.user_id
  FROM public.user_roles ur
  WHERE ur.tenant_id IS NOT NULL
    AND ur.user_id IS NOT NULL
    AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  ORDER BY ur.tenant_id, (ur.role = 'security_staff'::public.app_role) DESC
) pick
WHERE gs.guard_id = pick.tenant_id
  AND gs.guard_id IS DISTINCT FROM pick.user_id;

CREATE OR REPLACE FUNCTION public.list_my_guard_shifts(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _limit int DEFAULT 90
)
RETURNS SETOF public.guard_shifts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_roles AS (
    SELECT ur.user_id, ur.tenant_id, ur.project_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  ),
  legacy_ids AS (
    SELECT DISTINCT gid
    FROM (
      SELECT tenant_id AS gid FROM my_roles WHERE tenant_id IS NOT NULL
      UNION
      SELECT user_id AS gid FROM my_roles
    ) x
    WHERE gid IS NOT NULL
  )
  SELECT gs.*
  FROM public.guard_shifts gs
  WHERE auth.uid() IS NOT NULL
    AND public.is_security_user(auth.uid())
    AND (
      gs.guard_id = auth.uid()
      OR gs.guard_id IN (SELECT gid FROM legacy_ids)
    )
    AND (_from IS NULL OR gs.shift_date >= _from)
    AND (_to IS NULL OR gs.shift_date <= _to)
  ORDER BY gs.shift_date DESC, gs.start_at DESC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_guard_shifts(date, date, int) TO authenticated;

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
  project_guard_keys AS (
    SELECT DISTINCT k.gid
    FROM (
      SELECT ur.user_id AS gid
      FROM public.user_roles ur
      CROSS JOIN project_ctx pc
      WHERE ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
        AND (
          ur.project_id = pc.project_id
          OR (ur.project_id IS NULL AND ur.tenant_id = pc.tenant_id)
        )
      UNION
      SELECT ur.tenant_id AS gid
      FROM public.user_roles ur
      CROSS JOIN project_ctx pc
      WHERE ur.tenant_id IS NOT NULL
        AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
        AND (
          ur.project_id = pc.project_id
          OR (ur.project_id IS NULL AND ur.tenant_id = pc.tenant_id)
        )
    ) k
    WHERE k.gid IS NOT NULL
  )
  SELECT
    gs.id,
    COALESCE(ur_legacy.user_id, gs.guard_id) AS guard_id,
    pr.full_name,
    pr.avatar_url,
    gs.shift_date,
    gs.shift_type::text,
    gs.start_at,
    gs.end_at,
    gs.status::text
  FROM public.guard_shifts gs
  CROSS JOIN project_ctx pc
  LEFT JOIN public.user_roles ur_legacy
    ON ur_legacy.tenant_id = gs.guard_id
    AND ur_legacy.user_id IS NOT NULL
    AND ur_legacy.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(ur_legacy.user_id, gs.guard_id)
  WHERE gs.shift_date BETWEEN _from AND _to
    AND public.is_resident_of_project(auth.uid(), _project_id)
    AND (
      gs.project_id = pc.project_id
      OR gs.guard_id IN (SELECT pgk.gid FROM project_guard_keys pgk)
    )
  ORDER BY gs.shift_date, gs.start_at;
$$;

GRANT EXECUTE ON FUNCTION public.list_project_guard_shifts(uuid, date, date) TO authenticated;

-- RLS: đảm bảo policy tồn tại (idempotent)
ALTER TABLE public.guard_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guard_shifts_select_security ON public.guard_shifts;
CREATE POLICY guard_shifts_select_security ON public.guard_shifts
FOR SELECT TO authenticated
USING (
  public.is_security_user(auth.uid())
  AND (
    guard_id = auth.uid()
    OR guard_id IN (
      SELECT ur.tenant_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id IS NOT NULL
        AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
    )
  )
);

GRANT SELECT, UPDATE ON public.guard_shifts TO authenticated;
