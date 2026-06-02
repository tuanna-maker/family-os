
CREATE INDEX IF NOT EXISTS idx_sr_status_created ON public.service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_project_status ON public.service_requests (project_id, status);
CREATE INDEX IF NOT EXISTS idx_sr_category_status_created ON public.service_requests (category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_apartment ON public.service_requests (apartment_id);
CREATE INDEX IF NOT EXISTS idx_sr_assigned ON public.service_requests (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_secreq_status_created ON public.security_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secreq_resolved_at ON public.security_requests (resolved_at DESC) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_secreq_assigned ON public.security_requests (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inc_project_status_created ON public.incidents (project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inc_status_severity ON public.incidents (status, severity);
CREATE INDEX IF NOT EXISTS idx_inc_assigned ON public.incidents (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_created ON public.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.audit_logs (target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_ar_apt_active ON public.apartment_residents (apartment_id) WHERE move_out_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_ar_family ON public.apartment_residents (family_id);

CREATE INDEX IF NOT EXISTS idx_apt_project_status ON public.apartments (project_id, status);
CREATE INDEX IF NOT EXISTS idx_apt_block ON public.apartments (block_id);

CREATE INDEX IF NOT EXISTS idx_ur_user ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_ur_project_role ON public.user_roles (project_id, role) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ur_tenant_role ON public.user_roles (tenant_id, role) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ur_family_role ON public.user_roles (family_id, role) WHERE family_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sos_request_created ON public.sos_events (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_to_status_created ON public.sos_events (to_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gs_guard_date ON public.guard_shifts (guard_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_gs_project_date ON public.guard_shifts (project_id, shift_date DESC) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pl_guard_scanned ON public.patrol_logs (guard_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_project_scanned ON public.patrol_logs (project_id, scanned_at DESC) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON public.projects (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_families_owner ON public.families (owner_id);

-- ============ Materialized View: Ops KPI daily ============
DROP MATERIALIZED VIEW IF EXISTS public.mv_ops_kpi_daily;
CREATE MATERIALIZED VIEW public.mv_ops_kpi_daily AS
SELECT
  date_trunc('day', sr.created_at)::date AS day,
  sr.project_id,
  sr.category,
  COUNT(*) FILTER (WHERE sr.status = 'open')        AS open_count,
  COUNT(*) FILTER (WHERE sr.status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE sr.status = 'resolved')    AS resolved_count,
  COUNT(*)                                           AS total_count,
  AVG(EXTRACT(EPOCH FROM (sr.resolved_at - sr.created_at)) / 3600.0)
    FILTER (WHERE sr.resolved_at IS NOT NULL)        AS avg_resolve_hours
FROM public.service_requests sr
WHERE sr.created_at >= now() - interval '90 days'
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_ops_kpi_daily
  ON public.mv_ops_kpi_daily (day, project_id, category);

CREATE OR REPLACE FUNCTION public.refresh_ops_kpi_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_ops_kpi_daily;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_ops_kpi_daily() FROM PUBLIC;
