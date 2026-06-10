-- Guard đọc được ca trực của mình (kể cả guard_id legacy = tenant_id)

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
    SELECT DISTINCT tenant_id AS gid
    FROM my_roles
    WHERE tenant_id IS NOT NULL
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

DROP POLICY IF EXISTS guard_shifts_update_own ON public.guard_shifts;
CREATE POLICY guard_shifts_update_own ON public.guard_shifts
FOR UPDATE TO authenticated
USING (
  public.is_security_user(auth.uid())
  AND (
    guard_id = auth.uid()
    OR guard_id IN (
      SELECT ur.tenant_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id IS NOT NULL
    )
  )
)
WITH CHECK (guard_id = auth.uid());

GRANT SELECT, UPDATE ON public.guard_shifts TO authenticated;

-- Chuẩn hoá lại dữ liệu (idempotent)
UPDATE public.guard_shifts gs
SET guard_id = ur.user_id,
    project_id = COALESCE(
      CASE
        WHEN gs.project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = gs.project_id)
        THEN gs.project_id
      END,
      ur.project_id
    )
FROM public.user_roles ur
WHERE ur.tenant_id = gs.guard_id
  AND ur.user_id IS NOT NULL
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role');

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
