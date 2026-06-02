-- Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';

-- apartment_residents
CREATE TABLE IF NOT EXISTS public.apartment_residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'owner',
  move_in_date date NOT NULL DEFAULT CURRENT_DATE,
  move_out_date date,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apartment_residents_apartment ON public.apartment_residents(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_residents_family ON public.apartment_residents(family_id);
CREATE INDEX IF NOT EXISTS idx_apartment_residents_active
  ON public.apartment_residents(apartment_id) WHERE move_out_date IS NULL;

INSERT INTO public.apartment_residents (apartment_id, family_id, relation, is_primary)
SELECT id, family_id, 'owner', true FROM public.apartments WHERE family_id IS NOT NULL;

-- Drop dependent policies first
DROP POLICY IF EXISTS apartments_select ON public.apartments;
ALTER TABLE public.apartments DROP COLUMN IF EXISTS family_id;

DROP TRIGGER IF EXISTS trg_apartment_residents_updated_at ON public.apartment_residents;
CREATE TRIGGER trg_apartment_residents_updated_at
BEFORE UPDATE ON public.apartment_residents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_resident_of_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.apartment_residents ar ON ar.apartment_id = a.id AND ar.move_out_date IS NULL
    JOIN public.user_roles ur ON ur.family_id = ar.family_id
    WHERE a.project_id = _project_id AND ur.user_id = _user_id
      AND ur.role IN ('family_owner'::app_role, 'family_member'::app_role)
  ) OR EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.apartment_residents ar ON ar.apartment_id = a.id AND ar.move_out_date IS NULL
    JOIN public.families f ON f.id = ar.family_id
    WHERE a.project_id = _project_id AND f.owner_id = _user_id
  );
$$;

CREATE POLICY apartments_select ON public.apartments
FOR SELECT USING (
  is_saas_admin(auth.uid())
  OR is_bql_of_project(auth.uid(), project_id)
  OR EXISTS (SELECT 1 FROM public.apartment_residents ar
    WHERE ar.apartment_id = apartments.id AND ar.move_out_date IS NULL
      AND is_family_member(auth.uid(), ar.family_id))
  OR EXISTS (SELECT 1 FROM public.projects p
    WHERE p.id = apartments.project_id AND is_tenant_admin(auth.uid(), p.tenant_id))
);

ALTER TABLE public.apartment_residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY apartment_residents_select ON public.apartment_residents
FOR SELECT USING (
  is_saas_admin(auth.uid())
  OR is_family_member(auth.uid(), family_id)
  OR EXISTS (SELECT 1 FROM public.apartments a
    WHERE a.id = apartment_residents.apartment_id
      AND (is_bql_of_project(auth.uid(), a.project_id)
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = a.project_id AND is_tenant_admin(auth.uid(), p.tenant_id))))
);

CREATE POLICY apartment_residents_write ON public.apartment_residents
FOR ALL USING (
  is_saas_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.apartments a
    WHERE a.id = apartment_residents.apartment_id
      AND (is_bql_manager_of_project(auth.uid(), a.project_id)
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = a.project_id AND is_tenant_admin(auth.uid(), p.tenant_id))))
) WITH CHECK (
  is_saas_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.apartments a
    WHERE a.id = apartment_residents.apartment_id
      AND (is_bql_manager_of_project(auth.uid(), a.project_id)
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = a.project_id AND is_tenant_admin(auth.uid(), p.tenant_id))))
);