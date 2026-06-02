
-- Budget alert checker
CREATE OR REPLACE FUNCTION public.check_expense_budget_alerts(_family_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month date := date_trunc('month', now())::date;
  _budget RECORD;
  _spent bigint;
  _pct integer;
  _member RECORD;
  _created integer := 0;
  _level text;
  _title text;
  _body text;
  _dedupe text;
BEGIN
  SELECT * INTO _budget FROM public.expense_budgets
    WHERE family_id = _family_id AND month = _month;
  IF NOT FOUND OR _budget.total_amount <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _spent FROM public.expenses
    WHERE family_id = _family_id
      AND spent_on >= _month
      AND spent_on < (_month + interval '1 month')::date;

  _pct := (_spent * 100 / _budget.total_amount)::integer;

  IF _pct >= 100 THEN
    _level := 'over';
    _title := 'Đã vượt ngân sách tháng';
    _body := format('Chi tiêu %s đ / ngân sách %s đ (%s%%).',
      to_char(_spent, 'FM999G999G999'),
      to_char(_budget.total_amount, 'FM999G999G999'),
      _pct);
  ELSIF _pct >= _budget.warning_threshold THEN
    _level := 'warn';
    _title := 'Sắp chạm hạn ngân sách';
    _body := format('Đã dùng %s%% ngân sách tháng (%s / %s đ).',
      _pct,
      to_char(_spent, 'FM999G999G999'),
      to_char(_budget.total_amount, 'FM999G999G999'));
  ELSE
    RETURN 0;
  END IF;

  _dedupe := format('expense_budget_%s_%s_%s', _family_id, to_char(_month, 'YYYYMM'), _level);

  FOR _member IN
    SELECT user_id FROM public.family_members WHERE family_id = _family_id
  LOOP
    INSERT INTO public.notifications(user_id, family_id, type, title, body, dedupe_key)
    VALUES (_member.user_id, _family_id, 'expense_budget_' || _level, _title, _body,
            _dedupe || '_' || _member.user_id)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    _created := _created + 1;
  END LOOP;

  RETURN _created;
END;
$$;

-- Recurring expense due checker
CREATE OR REPLACE FUNCTION public.check_expense_recurring_due(_family_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule RECORD;
  _created integer := 0;
  _dedupe text;
BEGIN
  FOR _rule IN
    SELECT * FROM public.expense_recurring_rules
      WHERE family_id = _family_id
        AND active = true
        AND next_run_at IS NOT NULL
        AND next_run_at <= (now() + interval '3 days')
  LOOP
    _dedupe := format('expense_recurring_%s_%s', _rule.id, to_char(_rule.next_run_at, 'YYYYMMDD'));
    INSERT INTO public.notifications(user_id, family_id, type, title, body, due_at, dedupe_key, ref_id)
    VALUES (
      _rule.created_by,
      _family_id,
      'expense_recurring_due',
      'Sắp đến hạn: ' || _rule.title,
      format('%s đ • hạn %s',
        to_char(_rule.amount, 'FM999G999G999'),
        to_char(_rule.next_run_at, 'DD/MM/YYYY')),
      _rule.next_run_at,
      _dedupe,
      _rule.id::text
    )
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    _created := _created + 1;
  END LOOP;
  RETURN _created;
END;
$$;
