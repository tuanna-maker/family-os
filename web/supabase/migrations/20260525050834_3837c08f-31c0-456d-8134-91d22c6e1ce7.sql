
-- Recurring rules
CREATE TABLE IF NOT EXISTS public.expense_recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Khác',
  amount bigint NOT NULL CHECK (amount >= 0),
  merchant text,
  note text,
  payment_method text,
  payer_id uuid,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  weekday int CHECK (weekday BETWEEN 0 AND 6),
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_err_family ON public.expense_recurring_rules(family_id);
CREATE INDEX IF NOT EXISTS idx_err_due ON public.expense_recurring_rules(next_run_at) WHERE active = true;

ALTER TABLE public.expense_recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "err_select_member" ON public.expense_recurring_rules
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "err_insert_member" ON public.expense_recurring_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "err_update_member" ON public.expense_recurring_rules
  FOR UPDATE TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "err_delete_owner" ON public.expense_recurring_rules
  FOR DELETE TO authenticated
  USING (public.is_family_owner(auth.uid(), family_id) OR created_by = auth.uid());

CREATE TRIGGER trg_err_updated BEFORE UPDATE ON public.expense_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Share permissions
CREATE TABLE IF NOT EXISTS public.expense_share_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT true,
  can_edit_all boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_manage_budget boolean NOT NULL DEFAULT false,
  can_manage_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_esp_family ON public.expense_share_permissions(family_id);

ALTER TABLE public.expense_share_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esp_select_member" ON public.expense_share_permissions
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "esp_owner_all" ON public.expense_share_permissions
  FOR ALL TO authenticated
  USING (public.is_family_owner(auth.uid(), family_id))
  WITH CHECK (public.is_family_owner(auth.uid(), family_id));

CREATE TRIGGER trg_esp_updated BEFORE UPDATE ON public.expense_share_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring tick function
CREATE OR REPLACE FUNCTION public.tick_expense_recurring()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  cnt int := 0;
  next_at timestamptz;
BEGIN
  FOR r IN
    SELECT * FROM public.expense_recurring_rules
    WHERE active = true AND next_run_at <= now()
    LIMIT 500
  LOOP
    INSERT INTO public.expenses(
      family_id, created_by, title, category, amount, spent_on, note,
      merchant, payment_method, payer_id, is_recurring, is_shared
    ) VALUES (
      r.family_id, r.created_by, r.title, r.category, r.amount,
      (r.next_run_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
      r.note, r.merchant, r.payment_method, r.payer_id, true, true
    );

    next_at := CASE r.frequency
      WHEN 'daily' THEN r.next_run_at + interval '1 day'
      WHEN 'weekly' THEN r.next_run_at + interval '7 days'
      WHEN 'monthly' THEN r.next_run_at + interval '1 month'
      ELSE r.next_run_at + interval '1 day'
    END;

    UPDATE public.expense_recurring_rules
       SET next_run_at = next_at, last_run_at = now()
     WHERE id = r.id;

    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;
