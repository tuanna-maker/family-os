-- Sửa hiển thị lịch trực: resident check đủ + guard đọc cả dữ liệu legacy

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
  )
  OR EXISTS (
    SELECT 1
    FROM public.apartments a
    JOIN public.apartment_residents ar ON ar.apartment_id = a.id AND ar.move_out_date IS NULL
    JOIN public.families f ON f.id = ar.family_id
    WHERE a.project_id = _project_id
      AND f.owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.list_my_guard_shifts(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _limit int DEFAULT 60
)
RETURNS SETOF public.guard_shifts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_ctx AS (
    SELECT
      auth.uid() AS uid,
      COALESCE(
        array_agg(DISTINCT ur.tenant_id) FILTER (WHERE ur.tenant_id IS NOT NULL),
        ARRAY[]::uuid[]
      ) AS tenant_ids
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  )
  SELECT gs.*
  FROM public.guard_shifts gs
  CROSS JOIN my_ctx mc
  WHERE mc.uid IS NOT NULL
    AND (
      gs.guard_id = mc.uid
      OR gs.guard_id = ANY (mc.tenant_ids)
    )
    AND (_from IS NULL OR gs.shift_date >= _from)
    AND (_to IS NULL OR gs.shift_date <= _to)
  ORDER BY gs.shift_date DESC, gs.start_at DESC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_guard_shifts(date, date, int) TO authenticated;

-- Idempotent: sửa lại guard_id / project_id nếu còn sai
UPDATE public.guard_shifts gs
SET
  guard_id = ur.user_id,
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
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  AND gs.guard_id IS DISTINCT FROM ur.user_id;

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
