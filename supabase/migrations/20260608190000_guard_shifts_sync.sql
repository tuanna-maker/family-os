-- Đồng bộ guard_shifts: sửa dữ liệu cũ + chuẩn hoá khi insert/update

-- 1) Sửa guard_id nhầm tenant_id
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
  AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role);

-- 2) Sửa project_id NULL hoặc không phải project
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

CREATE OR REPLACE FUNCTION public.normalize_guard_shift_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _pid uuid;
BEGIN
  SELECT ur.user_id, ur.project_id
  INTO _uid, _pid
  FROM public.user_roles ur
  WHERE ur.tenant_id = NEW.guard_id
    AND ur.user_id IS NOT NULL
    AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
  ORDER BY (ur.project_id IS NOT NULL) DESC
  LIMIT 1;

  IF _uid IS NOT NULL THEN
    NEW.guard_id := _uid;
    IF NEW.project_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id) THEN
      NEW.project_id := _pid;
    END IF;
  END IF;

  IF NEW.project_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id) THEN
    SELECT ur.project_id INTO _pid
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.guard_id
      AND ur.project_id IS NOT NULL
      AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
    LIMIT 1;
    IF _pid IS NOT NULL THEN
      NEW.project_id := _pid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_guard_shift ON public.guard_shifts;
CREATE TRIGGER trg_normalize_guard_shift
BEFORE INSERT OR UPDATE ON public.guard_shifts
FOR EACH ROW EXECUTE FUNCTION public.normalize_guard_shift_row();

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
  SELECT gs.*
  FROM public.guard_shifts gs
  WHERE gs.guard_id = auth.uid()
    AND (_from IS NULL OR gs.shift_date >= _from)
    AND (_to IS NULL OR gs.shift_date <= _to)
  ORDER BY gs.shift_date DESC, gs.start_at DESC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_guard_shifts(date, date, int) TO authenticated;
