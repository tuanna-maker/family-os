
-- Drop duplicate indexes
DROP INDEX IF EXISTS public.idx_ar_apt_active;
DROP INDEX IF EXISTS public.idx_ar_family;
DROP INDEX IF EXISTS public.idx_user_roles_project;
DROP INDEX IF EXISTS public.idx_user_roles_tenant;
DROP INDEX IF EXISTS public.notifications_user_created_idx;
DROP INDEX IF EXISTS public.notifications_user_unread_idx;
DROP INDEX IF EXISTS public.idx_secreq_status_created;

-- Add composite indexes for hot RLS / query paths
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

CREATE INDEX IF NOT EXISTS idx_secreq_requester_type_created
  ON public.security_requests (requester_id, request_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_guard_event
  ON care.dispatch_assignment (guard_id, event_id);

-- Refresh stats so planner picks new shape immediately
ANALYZE public.user_roles;
ANALYZE public.apartment_residents;
ANALYZE public.notifications;
ANALYZE public.security_requests;
ANALYZE care.dispatch_assignment;
