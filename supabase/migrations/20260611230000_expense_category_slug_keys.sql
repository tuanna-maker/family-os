-- Normalize default expense category keys: Vietnamese labels → ASCII slugs.



CREATE OR REPLACE FUNCTION public.migrate_expense_category_key(_old TEXT, _new TEXT)

RETURNS VOID

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

BEGIN

  IF _old = _new THEN

    RETURN;

  END IF;



  UPDATE public.expense_category_budgets

  SET category_key = _new

  WHERE category_key = _old

    AND NOT EXISTS (

      SELECT 1

      FROM public.expense_category_budgets b2

      WHERE b2.family_id = expense_category_budgets.family_id

        AND b2.budget_month = expense_category_budgets.budget_month

        AND b2.category_key = _new

        AND b2.id <> expense_category_budgets.id

    );



  DELETE FROM public.expense_category_budgets

  WHERE category_key = _old

    AND EXISTS (

      SELECT 1

      FROM public.expense_category_budgets b2

      WHERE b2.family_id = expense_category_budgets.family_id

        AND b2.budget_month = expense_category_budgets.budget_month

        AND b2.category_key = _new

        AND b2.id <> expense_category_budgets.id

    );



  UPDATE public.expenses SET category = _new WHERE category = _old;

  UPDATE public.receipt_scans SET category = _new WHERE category = _old;



  UPDATE public.expense_categories

  SET category_key = _new

  WHERE category_key = _old

    AND NOT EXISTS (

      SELECT 1

      FROM public.expense_categories c2

      WHERE c2.family_id = expense_categories.family_id

        AND c2.category_key = _new

        AND c2.id <> expense_categories.id

    );



  DELETE FROM public.expense_categories

  WHERE category_key = _old

    AND EXISTS (

      SELECT 1

      FROM public.expense_categories c2

      WHERE c2.family_id = expense_categories.family_id

        AND c2.category_key = _new

        AND c2.id <> expense_categories.id

    );

END;

$$;



SELECT public.migrate_expense_category_key('Ăn uống', 'dining');

SELECT public.migrate_expense_category_key('Nhà cửa', 'housing');

SELECT public.migrate_expense_category_key('Con cái', 'children');

SELECT public.migrate_expense_category_key('Sức khỏe', 'health');

SELECT public.migrate_expense_category_key('Giải trí', 'entertainment');

SELECT public.migrate_expense_category_key('Khác', 'other');



DROP FUNCTION public.migrate_expense_category_key(TEXT, TEXT);



-- Keep seed in sync for new families

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


`