
-- 1) app_logs_default: enable RLS + restrict (only admins/service role can read)
ALTER TABLE public.app_logs_default ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_logs_default_no_access" ON public.app_logs_default;
CREATE POLICY "app_logs_default_admin_read"
  ON public.app_logs_default FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 2) Fix reversed args in expense_ai_insights / expense_anomalies policies
DROP POLICY IF EXISTS "Members can view family insights" ON public.expense_ai_insights;
CREATE POLICY "Members can view family insights"
  ON public.expense_ai_insights FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

DROP POLICY IF EXISTS "Members can view anomalies" ON public.expense_anomalies;
CREATE POLICY "Members can view anomalies"
  ON public.expense_anomalies FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

DROP POLICY IF EXISTS "Members can resolve anomalies" ON public.expense_anomalies;
CREATE POLICY "Members can resolve anomalies"
  ON public.expense_anomalies FOR UPDATE
  USING (public.is_family_member(auth.uid(), family_id))
  WITH CHECK (public.is_family_member(auth.uid(), family_id));

-- 3) realtime.messages: require authenticated session to subscribe
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);
