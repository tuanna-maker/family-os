GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA household TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA household TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA household TO service_role, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA platform TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA platform TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';