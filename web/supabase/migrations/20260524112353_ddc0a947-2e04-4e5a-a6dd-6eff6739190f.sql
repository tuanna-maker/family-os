
REVOKE EXECUTE ON FUNCTION platform.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION platform.write_audit(text, text, text, uuid, jsonb, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION platform.emit_event(text, text, text, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION household.is_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION care.has_active_sos_override(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION platform.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION platform.write_audit(text, text, text, uuid, jsonb, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION platform.emit_event(text, text, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION household.is_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION care.has_active_sos_override(uuid, uuid) TO authenticated, service_role;
