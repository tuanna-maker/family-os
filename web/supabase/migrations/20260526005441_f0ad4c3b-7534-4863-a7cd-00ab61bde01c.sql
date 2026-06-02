
REVOKE EXECUTE ON FUNCTION public.resolve_user_primary_apartment(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.resolve_user_primary_apartment(uuid) TO authenticated;
