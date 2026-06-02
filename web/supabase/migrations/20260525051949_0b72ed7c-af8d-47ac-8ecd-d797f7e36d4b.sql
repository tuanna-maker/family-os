
CREATE OR REPLACE FUNCTION public.detect_expense_anomalies(p_family_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF NOT public.is_family_member(p_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH cat_avg AS (
    SELECT category, AVG(amount)::numeric AS avg_amt, COUNT(*) AS n
    FROM public.expenses
    WHERE family_id = p_family_id
      AND spent_on >= (CURRENT_DATE - interval '90 days')
    GROUP BY category
    HAVING COUNT(*) >= 3
  ),
  candidates AS (
    SELECT e.id, e.family_id, e.amount, e.category, ca.avg_amt
    FROM public.expenses e
    JOIN cat_avg ca ON ca.category = e.category
    WHERE e.family_id = p_family_id
      AND e.spent_on >= (CURRENT_DATE - interval '30 days')
      AND e.amount > ca.avg_amt * 2
      AND NOT EXISTS (
        SELECT 1 FROM public.expense_anomalies a
        WHERE a.expense_id = e.id AND a.anomaly_type = 'amount_spike'
      )
  )
  INSERT INTO public.expense_anomalies (family_id, expense_id, anomaly_type, severity, reason)
  SELECT family_id, id, 'amount_spike', 'high',
    'Khoản chi vượt 2x trung bình danh mục ' || category || ' (TB: ' || ROUND(avg_amt)::text || ')'
  FROM candidates;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
