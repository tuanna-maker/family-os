
CREATE TABLE IF NOT EXISTS public.premium_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  plan text NOT NULL DEFAULT 'premium',
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.premium_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_view_requests"
ON public.premium_upgrade_requests FOR SELECT TO authenticated
USING (public.is_family_member(auth.uid(), family_id) OR public.is_saas_admin(auth.uid()));

CREATE POLICY "owner_insert_request"
ON public.premium_upgrade_requests FOR INSERT TO authenticated
WITH CHECK (public.is_family_owner(auth.uid(), family_id) AND requested_by = auth.uid());

CREATE POLICY "admin_update_requests"
ON public.premium_upgrade_requests FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()));

-- Trial activator: chỉ owner, 1 lần / family, 14 ngày
CREATE OR REPLACE FUNCTION public.activate_premium_trial(_family_id uuid)
RETURNS public.ai_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ent public.ai_entitlements%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;
  IF NOT public.is_family_owner(_uid, _family_id) THEN
    RAISE EXCEPTION 'Chỉ chủ gia đình mới được kích hoạt thử Premium';
  END IF;

  SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  IF NOT FOUND THEN
    INSERT INTO public.ai_entitlements(family_id) VALUES (_family_id);
    SELECT * INTO _ent FROM public.ai_entitlements WHERE family_id = _family_id;
  END IF;

  IF _ent.plan = 'premium' AND _ent.expires_at IS NOT NULL AND _ent.expires_at > now() THEN
    RAISE EXCEPTION 'Gia đình đang ở gói Premium còn hạn';
  END IF;

  IF EXISTS (SELECT 1 FROM public.premium_upgrade_requests
              WHERE family_id = _family_id AND status = 'trial_used') THEN
    RAISE EXCEPTION 'Gia đình đã dùng bản dùng thử trước đó';
  END IF;

  UPDATE public.ai_entitlements
     SET plan = 'premium',
         ocr_monthly_quota = 50,
         insights_enabled = true,
         expires_at = now() + interval '14 days',
         updated_at = now()
   WHERE family_id = _family_id
   RETURNING * INTO _ent;

  INSERT INTO public.premium_upgrade_requests(family_id, requested_by, plan, status, note)
  VALUES (_family_id, _uid, 'premium', 'trial_used', 'Kích hoạt thử 14 ngày');

  RETURN _ent;
END;
$$;

-- Admin override
CREATE OR REPLACE FUNCTION public.admin_set_entitlement(
  _family_id uuid,
  _plan text,
  _days integer DEFAULT 30,
  _ocr_quota integer DEFAULT NULL,
  _insights boolean DEFAULT NULL
)
RETURNS public.ai_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ent public.ai_entitlements%ROWTYPE;
BEGIN
  IF NOT public.is_saas_admin(_uid) THEN
    RAISE EXCEPTION 'Chỉ admin được thực hiện';
  END IF;
  IF _plan NOT IN ('free','premium') THEN
    RAISE EXCEPTION 'Plan không hợp lệ';
  END IF;

  INSERT INTO public.ai_entitlements(family_id) VALUES (_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  UPDATE public.ai_entitlements
     SET plan = _plan,
         ocr_monthly_quota = COALESCE(_ocr_quota, CASE WHEN _plan='premium' THEN 50 ELSE 5 END),
         insights_enabled  = COALESCE(_insights, _plan='premium'),
         expires_at = CASE WHEN _plan='premium' THEN now() + (_days || ' days')::interval ELSE NULL END,
         updated_at = now()
   WHERE family_id = _family_id
   RETURNING * INTO _ent;

  RETURN _ent;
END;
$$;
