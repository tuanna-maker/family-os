
-- Enums
DO $$ BEGIN
  CREATE TYPE public.fee_type AS ENUM ('management','parking','electricity','water','internet','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_status AS ENUM ('unpaid','partial','paid','overdue','waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','vietqr','card','wallet');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- apartment_fees
CREATE TABLE IF NOT EXISTS public.apartment_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  fee_type public.fee_type NOT NULL,
  period TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_date DATE NOT NULL,
  status public.fee_status NOT NULL DEFAULT 'unpaid',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apartment_fees_apartment ON public.apartment_fees(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_fees_project ON public.apartment_fees(project_id);
CREATE INDEX IF NOT EXISTS idx_apartment_fees_status ON public.apartment_fees(status);

-- fee_payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID NOT NULL REFERENCES public.apartment_fees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL,
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee ON public.fee_payments(fee_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_apartment ON public.fee_payments(apartment_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_project ON public.fee_payments(project_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_apartment_fees_updated ON public.apartment_fees;
CREATE TRIGGER trg_apartment_fees_updated BEFORE UPDATE ON public.apartment_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.apartment_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- Helper: is user BQL/SaaS for the project?
CREATE OR REPLACE FUNCTION public.is_bql_for_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role IN ('super_admin','saas_admin')
        OR (ur.role IN ('bql_manager','bql_staff') AND ur.project_id = _project_id)
      )
  )
$$;

-- Helper: is user a current resident of the apartment?
CREATE OR REPLACE FUNCTION public.is_resident_of_apartment(_user_id UUID, _apartment_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apartment_residents ar
    JOIN public.family_members fm ON fm.family_id = ar.family_id
    WHERE ar.apartment_id = _apartment_id
      AND ar.move_out_date IS NULL
      AND fm.user_id = _user_id
  )
$$;

-- apartment_fees policies
CREATE POLICY "fees: bql or resident can view"
ON public.apartment_fees FOR SELECT TO authenticated
USING (
  public.is_bql_for_project(auth.uid(), project_id)
  OR public.is_resident_of_apartment(auth.uid(), apartment_id)
);

CREATE POLICY "fees: bql can insert"
ON public.apartment_fees FOR INSERT TO authenticated
WITH CHECK (public.is_bql_for_project(auth.uid(), project_id));

CREATE POLICY "fees: bql can update"
ON public.apartment_fees FOR UPDATE TO authenticated
USING (public.is_bql_for_project(auth.uid(), project_id))
WITH CHECK (public.is_bql_for_project(auth.uid(), project_id));

CREATE POLICY "fees: bql can delete"
ON public.apartment_fees FOR DELETE TO authenticated
USING (public.is_bql_for_project(auth.uid(), project_id));

-- fee_payments policies
CREATE POLICY "payments: bql or resident can view"
ON public.fee_payments FOR SELECT TO authenticated
USING (
  public.is_bql_for_project(auth.uid(), project_id)
  OR public.is_resident_of_apartment(auth.uid(), apartment_id)
);

CREATE POLICY "payments: bql can insert"
ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (public.is_bql_for_project(auth.uid(), project_id));

CREATE POLICY "payments: bql can delete"
ON public.fee_payments FOR DELETE TO authenticated
USING (public.is_bql_for_project(auth.uid(), project_id));
