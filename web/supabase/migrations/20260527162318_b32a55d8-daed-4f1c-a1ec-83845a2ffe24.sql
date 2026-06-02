-- Re-grant EXECUTE on RLS helper functions to anon as well.
-- These are SECURITY DEFINER and only return bool based on user_id argument,
-- safe for anon to call (anon with auth.uid()=null just gets false).
-- Without this, public-facing tables with RLS policies that reference
-- these helpers fail with "permission denied for function ..." → 500 → client "Load failed".

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_saas_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_security_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_bql_for_project(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_bql_of_project(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_bql_manager_of_project(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_resident_of_apartment(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_resident_of_project(uuid, uuid) TO anon;