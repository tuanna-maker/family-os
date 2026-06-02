
-- Add optional columns to existing expenses table (keep backward compatibility)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS merchant text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payer_id uuid,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_url text;

CREATE INDEX IF NOT EXISTS idx_expenses_family_spent ON public.expenses(family_id, spent_on DESC);

-- Budget per family per month
CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  month date NOT NULL, -- first day of month
  total_amount bigint NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  per_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  warning_threshold int NOT NULL DEFAULT 80 CHECK (warning_threshold BETWEEN 1 AND 100),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id, month)
);

ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_select ON public.expense_budgets FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY budgets_insert ON public.expense_budgets FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY budgets_update ON public.expense_budgets FOR UPDATE
  USING (public.is_family_owner(auth.uid(), family_id) OR auth.uid() = created_by OR public.is_super_admin(auth.uid()));

CREATE POLICY budgets_delete ON public.expense_budgets FOR DELETE
  USING (public.is_family_owner(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER expense_budgets_updated_at
  BEFORE UPDATE ON public.expense_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for receipts (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: file path convention = {family_id}/{filename}
CREATE POLICY "expense_receipts_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'expense-receipts'
    AND public.is_family_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "expense_receipts_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND public.is_family_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "expense_receipts_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-receipts'
    AND public.is_family_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
