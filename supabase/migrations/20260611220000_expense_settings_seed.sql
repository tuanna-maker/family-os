-- Seed default expense categories + sample monthly budget per family

CREATE OR REPLACE FUNCTION public.seed_family_expense_settings(_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_has_categories BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.expense_categories WHERE family_id = _family_id LIMIT 1
  ) INTO v_has_categories;

  IF NOT v_has_categories THEN
    INSERT INTO public.expense_categories
      (family_id, category_key, label_vi, label_en, icon, color, sort_order)
    VALUES
      (_family_id, 'dining', 'Ăn uống', 'Dining', '🍱', '#10B981', 0),
      (_family_id, 'housing', 'Nhà cửa', 'Housing', '🏠', '#3B82F6', 1),
      (_family_id, 'children', 'Con cái', 'Children', '🎒', '#EC4899', 2),
      (_family_id, 'health', 'Sức khỏe', 'Health', '💊', '#EF4444', 3),
      (_family_id, 'entertainment', 'Giải trí', 'Entertainment', '🎬', '#F97316', 4),
      (_family_id, 'other', 'Khác', 'Other', '✨', '#8B5CF6', 5),
      (_family_id, 'daily', 'Chi tiêu hàng ngày', 'Daily spending', '🧴', '#22C55E', 6),
      (_family_id, 'shopping', 'Mua sắm', 'Shopping', '🛍️', '#A16207', 7),
      (_family_id, 'cosmetics', 'Mỹ phẩm', 'Cosmetics', '💄', '#EC4899', 8),
      (_family_id, 'going_out', 'Đi chơi', 'Going out', '🎫', '#EAB308', 9),
      (_family_id, 'education', 'Giáo dục', 'Education', '📚', '#DC2626', 10),
      (_family_id, 'electric', 'Tiền điện', 'Electricity', '💡', '#2563EB', 11),
      (_family_id, 'transport', 'Đi lại', 'Transport', '🚗', '#78350F', 12),
      (_family_id, 'communication', 'Phí liên lạc', 'Communication', '📱', '#6B7280', 13),
      (_family_id, 'travel_save', 'Tiết kiệm đi du lịch', 'Travel savings', '🚆', '#CA8A04', 14);
  END IF;

  INSERT INTO public.expense_month_budgets (family_id, budget_month, total_amount)
  VALUES (_family_id, v_month, 8000000)
  ON CONFLICT (family_id, budget_month) DO NOTHING;

  INSERT INTO public.expense_category_budgets (family_id, budget_month, category_key, amount)
  VALUES
    (_family_id, v_month, 'dining', 1500000),
    (_family_id, v_month, 'daily', 1500000),
    (_family_id, v_month, 'shopping', 1000000),
    (_family_id, v_month, 'going_out', 2000000),
    (_family_id, v_month, 'travel_save', 2000000)
  ON CONFLICT (family_id, budget_month, category_key) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.seed_family_expense_settings(UUID) IS
  'Inserts default expense categories and sample monthly budget for a family (idempotent).';

-- Backfill all existing families
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.families LOOP
    PERFORM public.seed_family_expense_settings(r.id);
  END LOOP;
END;
$$;

-- Auto-seed when a new family is created
CREATE OR REPLACE FUNCTION public.trg_seed_family_expense_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_family_expense_settings(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS families_seed_expense_settings ON public.families;
CREATE TRIGGER families_seed_expense_settings
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_family_expense_settings();

GRANT EXECUTE ON FUNCTION public.seed_family_expense_settings(UUID) TO authenticated;
