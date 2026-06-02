-- Expose household & platform schemas via PostgREST
GRANT USAGE ON SCHEMA household TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA platform TO anon, authenticated, service_role;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public,household,platform';
NOTIFY pgrst, 'reload config';