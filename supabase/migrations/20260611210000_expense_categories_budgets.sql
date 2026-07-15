-- Expense category definitions and monthly budgets (per family)

CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  label_vi TEXT NOT NULL,
  label_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📁',
  color TEXT NOT NULL DEFAULT '#6366F1',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_key_len CHECK (char_length(category_key) BETWEEN 1 AND 64),
  UNIQUE (family_id, category_key)
);

CREATE INDEX idx_expense_categories_family_sort
  ON public.expense_categories (family_id, sort_order, category_key);

CREATE TABLE public.expense_month_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  budget_month DATE NOT NULL,
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, budget_month)
);

CREATE INDEX idx_expense_month_budgets_family_month
  ON public.expense_month_budgets (family_id, budget_month DESC);

CREATE TABLE public.expense_category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  budget_month DATE NOT NULL,
  category_key TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expense_category_budgets_key_len CHECK (char_length(category_key) BETWEEN 1 AND 64),
  UNIQUE (family_id, budget_month, category_key)
);

CREATE INDEX idx_expense_category_budgets_family_month
  ON public.expense_category_budgets (family_id, budget_month DESC);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_month_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_category_budgets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER expense_month_budgets_updated_at
  BEFORE UPDATE ON public.expense_month_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER expense_category_budgets_updated_at
  BEFORE UPDATE ON public.expense_category_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expense_categories
CREATE POLICY expense_categories_select ON public.expense_categories
  FOR SELECT USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY expense_categories_insert ON public.expense_categories
  FOR INSERT WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_categories_update ON public.expense_categories
  FOR UPDATE USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_categories_delete ON public.expense_categories
  FOR DELETE USING (public.is_family_member(auth.uid(), family_id));

-- expense_month_budgets
CREATE POLICY expense_month_budgets_select ON public.expense_month_budgets
  FOR SELECT USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY expense_month_budgets_insert ON public.expense_month_budgets
  FOR INSERT WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_month_budgets_update ON public.expense_month_budgets
  FOR UPDATE USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_month_budgets_delete ON public.expense_month_budgets
  FOR DELETE USING (public.is_family_member(auth.uid(), family_id));

-- expense_category_budgets
CREATE POLICY expense_category_budgets_select ON public.expense_category_budgets
  FOR SELECT USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY expense_category_budgets_insert ON public.expense_category_budgets
  FOR INSERT WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_category_budgets_update ON public.expense_category_budgets
  FOR UPDATE USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY expense_category_budgets_delete ON public.expense_category_budgets
  FOR DELETE USING (public.is_family_member(auth.uid(), family_id));
