
-- AI entitlements
CREATE TABLE IF NOT EXISTS public.ai_entitlements (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium')),
  ocr_monthly_quota int NOT NULL DEFAULT 5,
  insights_enabled boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ent_select_member" ON public.ai_entitlements
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));
CREATE TRIGGER trg_ent_updated BEFORE UPDATE ON public.ai_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OCR quota usage
CREATE TABLE IF NOT EXISTS public.receipt_ocr_quota (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month date NOT NULL,
  used int NOT NULL DEFAULT 0,
  PRIMARY KEY (family_id, month)
);
ALTER TABLE public.receipt_ocr_quota ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quota_select_member" ON public.receipt_ocr_quota
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));

-- OCR jobs
CREATE TABLE IF NOT EXISTS public.receipt_ocr_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  image_path text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON public.receipt_ocr_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_family ON public.receipt_ocr_jobs(family_id, created_at DESC);
ALTER TABLE public.receipt_ocr_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_member" ON public.receipt_ocr_jobs
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));

-- OCR results
CREATE TABLE IF NOT EXISTS public.receipt_ocr_results (
  job_id uuid PRIMARY KEY REFERENCES public.receipt_ocr_jobs(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  merchant text,
  total bigint,
  scanned_date date,
  category text,
  line_items jsonb,
  raw jsonb,
  confidence numeric(4,3),
  expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_ocr_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_select_member" ON public.receipt_ocr_results
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), family_id));
CREATE POLICY "res_update_member" ON public.receipt_ocr_results
  FOR UPDATE TO authenticated
  USING (public.is_family_member(auth.uid(), family_id))
  WITH CHECK (public.is_family_member(auth.uid(), family_id));

-- Entitlement check
CREATE OR REPLACE FUNCTION public.get_ocr_entitlement(_family_id uuid)
RETURNS TABLE(plan text, quota int, used int, remaining int, insights_enabled boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ent public.ai_entitlements%ROWTYPE;
  _used int := 0;
  _month date := date_trunc('month', now())::date;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_member(_uid, _family_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  IF NOT FOUND THEN
    INSERT INTO public.ai_entitlements(family_id) VALUES (_family_id)
    ON CONFLICT DO NOTHING;
    SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  END IF;

  SELECT q.used INTO _used FROM public.receipt_ocr_quota q
   WHERE q.family_id = _family_id AND q.month = _month;
  _used := COALESCE(_used, 0);

  plan := _ent.plan;
  quota := _ent.ocr_monthly_quota;
  used := _used;
  remaining := GREATEST(0, _ent.ocr_monthly_quota - _used);
  insights_enabled := _ent.insights_enabled;
  RETURN NEXT;
END;
$$;

-- Enqueue
CREATE OR REPLACE FUNCTION public.enqueue_ocr_job(_family_id uuid, _image_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ent public.ai_entitlements%ROWTYPE;
  _used int := 0;
  _month date := date_trunc('month', now())::date;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_member(_uid, _family_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  IF NOT FOUND THEN
    INSERT INTO public.ai_entitlements(family_id) VALUES (_family_id);
    SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  END IF;

  SELECT used INTO _used FROM public.receipt_ocr_quota
   WHERE family_id = _family_id AND month = _month;
  _used := COALESCE(_used, 0);

  IF _used >= _ent.ocr_monthly_quota THEN
    RAISE EXCEPTION 'Đã hết hạn mức OCR tháng này (% / %)', _used, _ent.ocr_monthly_quota;
  END IF;

  INSERT INTO public.receipt_ocr_jobs(family_id, created_by, image_path)
  VALUES (_family_id, _uid, _image_path)
  RETURNING id INTO _id;

  INSERT INTO public.receipt_ocr_quota(family_id, month, used)
  VALUES (_family_id, _month, 1)
  ON CONFLICT (family_id, month) DO UPDATE SET used = receipt_ocr_quota.used + 1;

  RETURN _id;
END;
$$;
