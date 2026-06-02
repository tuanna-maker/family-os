
-- AI Insights table
CREATE TABLE public.expense_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  summary text NOT NULL,
  top_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  anomalies jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, period_month)
);

ALTER TABLE public.expense_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family insights"
ON public.expense_ai_insights FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()));

-- Anomalies table
CREATE TABLE public.expense_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  reason text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false
);

ALTER TABLE public.expense_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view anomalies"
ON public.expense_anomalies FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Members can resolve anomalies"
ON public.expense_anomalies FOR UPDATE TO authenticated
USING (public.is_family_member(family_id, auth.uid()));

CREATE INDEX idx_anomalies_family_unresolved ON public.expense_anomalies(family_id) WHERE NOT resolved;

-- Anomaly detection RPC: flags expenses where amount > 2x category avg of last 90 days
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
      AND occurred_at >= now() - interval '90 days'
    GROUP BY category
    HAVING COUNT(*) >= 3
  ),
  candidates AS (
    SELECT e.id, e.family_id, e.amount, e.category, ca.avg_amt
    FROM public.expenses e
    JOIN cat_avg ca ON ca.category = e.category
    WHERE e.family_id = p_family_id
      AND e.occurred_at >= now() - interval '30 days'
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
