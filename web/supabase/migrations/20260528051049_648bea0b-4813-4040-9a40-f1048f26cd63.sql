
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

ALTER EXTENSION citext SET SCHEMA extensions;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_saas_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_security_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_bql_of_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_bql_for_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_bql_manager_of_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_resident_of_apartment(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_resident_of_project(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_login_email(text) FROM anon, public;
