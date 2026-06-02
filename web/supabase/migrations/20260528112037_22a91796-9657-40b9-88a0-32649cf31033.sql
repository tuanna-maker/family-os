-- ============ list_all_guards ============
CREATE OR REPLACE FUNCTION public.list_all_guards()
RETURNS TABLE(
  guard_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  role app_role,
  project_id uuid,
  project_code text,
  project_name text,
  tenant_id uuid,
  tenant_name text,
  on_shift_today boolean,
  next_shift_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden: SaaS admin only';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id AS guard_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    ur.role,
    ur.project_id,
    pr.code AS project_code,
    pr.name AS project_name,
    pr.tenant_id,
    t.name AS tenant_name,
    EXISTS (
      SELECT 1 FROM public.guard_shifts gs
      WHERE gs.guard_id = ur.user_id
        AND gs.shift_date = CURRENT_DATE
        AND gs.status IN ('scheduled','checked_in')
    ) AS on_shift_today,
    (
      SELECT MIN(gs.start_at) FROM public.guard_shifts gs
      WHERE gs.guard_id = ur.user_id
        AND gs.start_at >= now()
        AND gs.status = 'scheduled'
    ) AS next_shift_at
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN public.projects pr ON pr.id = ur.project_id
  LEFT JOIN public.tenants t ON t.id = pr.tenant_id
  WHERE ur.role IN ('security_admin'::app_role, 'security_staff'::app_role)
  ORDER BY pr.name NULLS LAST, ur.role DESC, p.full_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_guards() TO authenticated;

-- ============ list_all_guard_shifts ============
CREATE OR REPLACE FUNCTION public.list_all_guard_shifts(_from date, _to date)
RETURNS TABLE(
  shift_id uuid,
  guard_id uuid,
  guard_name text,
  guard_avatar text,
  project_id uuid,
  project_code text,
  project_name text,
  shift_date date,
  shift_type text,
  start_at timestamptz,
  end_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden: SaaS admin only';
  END IF;
  IF _to < _from THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;
  IF (_to - _from) > 60 THEN
    RAISE EXCEPTION 'date range too large (max 60 days)';
  END IF;

  RETURN QUERY
  SELECT
    gs.id AS shift_id,
    gs.guard_id,
    p.full_name AS guard_name,
    p.avatar_url AS guard_avatar,
    gs.project_id,
    pr.code AS project_code,
    pr.name AS project_name,
    gs.shift_date,
    gs.shift_type,
    gs.start_at,
    gs.end_at,
    gs.status
  FROM public.guard_shifts gs
  LEFT JOIN public.profiles p ON p.id = gs.guard_id
  LEFT JOIN public.projects pr ON pr.id = gs.project_id
  WHERE gs.shift_date BETWEEN _from AND _to
  ORDER BY gs.shift_date ASC, pr.name NULLS LAST, gs.start_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_guard_shifts(date, date) TO authenticated;