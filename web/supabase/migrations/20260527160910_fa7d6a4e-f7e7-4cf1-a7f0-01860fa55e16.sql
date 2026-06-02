
-- 1) Lock down all SECURITY DEFINER functions in public from PUBLIC (covers anon + authenticated)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- 2) Re-grant EXECUTE to authenticated on functions used by the app at runtime
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_saas_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_security_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bql_for_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bql_of_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_bql_manager_of_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_resident_of_apartment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_resident_of_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_sos(uuid, care.sos_trigger_kind, care.sos_severity, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_sos(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sos(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_health_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_health_profile_enc(uuid, uuid, text, date, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_premium_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ocr_entitlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_ocr_job(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_expense_anomalies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_expense_budget_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_expense_recurring_due(uuid) TO authenticated;

-- 3) Re-grant EXECUTE to anon ONLY on the username->email lookup (needed pre-login)
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- (Internal-only functions: handle_new_user, security_requests_fill_scope (triggers, no caller needed),
--  refresh_metrics_views, refresh_ops_kpi_daily, check_health_alerts, cleanup_old_app_logs,
--  tick_reminder_notifications, tick_expense_recurring, run_sos_load_test, admin_set_entitlement
--  — remain locked; service_role bypasses and is used by pg_cron / admin code paths)

-- 4) Storage: tighten family-moments (private to family) and avatars (authenticated read)
DROP POLICY IF EXISTS "family_moments_public_read" ON storage.objects;
CREATE POLICY "family_moments_member_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'family-moments'
         AND public.is_family_member(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "avatars_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- Flip buckets to non-public so the listing endpoint requires auth
UPDATE storage.buckets SET public = false WHERE id IN ('avatars','family-moments');
