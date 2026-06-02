
CREATE OR REPLACE FUNCTION public.list_saas_security_requests(
  _from timestamptz DEFAULT (now() - interval '30 days'),
  _to timestamptz DEFAULT now(),
  _tenant_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL,
  _status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_name text,
  project_id uuid,
  project_code text,
  project_name text,
  building text,
  apartment text,
  request_type text,
  status text,
  requester_id uuid,
  requester_name text,
  assigned_to uuid,
  assignee_name text,
  created_at timestamptz,
  resolved_at timestamptz,
  resolution_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.id,
    sr.tenant_id,
    t.name AS tenant_name,
    sr.project_id,
    p.code AS project_code,
    p.name AS project_name,
    sr.building,
    sr.apartment,
    sr.request_type,
    sr.status,
    sr.requester_id,
    pr.full_name AS requester_name,
    sr.assigned_to,
    pa.full_name AS assignee_name,
    sr.created_at,
    sr.resolved_at,
    CASE WHEN sr.resolved_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (sr.resolved_at - sr.created_at)) / 60.0
      ELSE NULL END AS resolution_minutes
  FROM public.security_requests sr
  LEFT JOIN public.tenants t ON t.id = sr.tenant_id
  LEFT JOIN public.projects p ON p.id = sr.project_id
  LEFT JOIN public.profiles pr ON pr.id = sr.requester_id
  LEFT JOIN public.profiles pa ON pa.id = sr.assigned_to
  WHERE (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid()))
    AND sr.created_at >= _from
    AND sr.created_at <= _to
    AND (_tenant_id IS NULL OR sr.tenant_id = _tenant_id)
    AND (_project_id IS NULL OR sr.project_id = _project_id)
    AND (_status IS NULL OR sr.status = _status)
  ORDER BY sr.created_at DESC
  LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.saas_security_ops_summary(
  _from timestamptz DEFAULT (now() - interval '30 days'),
  _to timestamptz DEFAULT now(),
  _tenant_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total bigint,
  open_count bigint,
  in_progress_count bigint,
  resolved_count bigint,
  cancelled_count bigint,
  tenants_covered bigint,
  projects_covered bigint,
  mttr_minutes numeric,
  ack_sla_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT sr.*
    FROM public.security_requests sr
    WHERE (public.is_super_admin(auth.uid()) OR public.is_saas_admin(auth.uid()))
      AND sr.created_at >= _from
      AND sr.created_at <= _to
      AND (_tenant_id IS NULL OR sr.tenant_id = _tenant_id)
      AND (_project_id IS NULL OR sr.project_id = _project_id)
  )
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'open')::bigint,
    COUNT(*) FILTER (WHERE status IN ('in_progress','assigned','acknowledged'))::bigint,
    COUNT(*) FILTER (WHERE status IN ('resolved','closed'))::bigint,
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint,
    COUNT(DISTINCT tenant_id)::bigint,
    COUNT(DISTINCT project_id)::bigint,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60.0) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1),
    NULL::numeric
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.list_saas_security_requests(timestamptz, timestamptz, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_security_ops_summary(timestamptz, timestamptz, uuid, uuid) TO authenticated;
