-- TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'active',
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);

-- BLOCKS
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  total_floors int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);
CREATE INDEX IF NOT EXISTS idx_blocks_project ON public.blocks(project_id);

-- FLOORS
CREATE TABLE IF NOT EXISTS public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_number int NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, floor_number)
);
CREATE INDEX IF NOT EXISTS idx_floors_block ON public.floors(block_id);
CREATE INDEX IF NOT EXISTS idx_floors_project ON public.floors(project_id);

-- APARTMENTS
CREATE TABLE IF NOT EXISTS public.apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  area_m2 numeric,
  bedrooms int,
  bathrooms int,
  status text NOT NULL DEFAULT 'available',
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);
CREATE INDEX IF NOT EXISTS idx_apartments_floor ON public.apartments(floor_id);
CREATE INDEX IF NOT EXISTS idx_apartments_project ON public.apartments(project_id);
CREATE INDEX IF NOT EXISTS idx_apartments_family ON public.apartments(family_id);

-- Extend user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_roles_project ON public.user_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_saas_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin'::app_role, 'saas_admin'::app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = 'tenant_admin'::app_role
  ) OR public.is_saas_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_bql_of_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND project_id = _project_id
      AND role IN ('bql_manager'::app_role, 'bql_staff'::app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_bql_manager_of_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND project_id = _project_id AND role = 'bql_manager'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_resident_of_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.user_roles ur ON ur.family_id = a.family_id
    WHERE a.project_id = _project_id AND ur.user_id = _user_id
      AND ur.role IN ('family_owner'::app_role, 'family_member'::app_role)
  ) OR EXISTS (
    SELECT 1 FROM public.apartments a
    JOIN public.families f ON f.id = a.family_id
    WHERE a.project_id = _project_id AND f.owner_id = _user_id
  );
$$;

-- updated_at triggers
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER apartments_updated_at BEFORE UPDATE ON public.apartments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

-- tenants policies
CREATE POLICY tenants_select ON public.tenants FOR SELECT
  USING (public.is_saas_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), id));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT
  WITH CHECK (public.is_saas_admin(auth.uid()));
CREATE POLICY tenants_update ON public.tenants FOR UPDATE
  USING (public.is_saas_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), id));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE
  USING (public.is_saas_admin(auth.uid()));

-- projects policies
CREATE POLICY projects_select ON public.projects FOR SELECT
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_bql_of_project(auth.uid(), id)
    OR public.is_resident_of_project(auth.uid(), id)
  );
CREATE POLICY projects_insert ON public.projects FOR INSERT
  WITH CHECK (public.is_saas_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY projects_update ON public.projects FOR UPDATE
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_bql_manager_of_project(auth.uid(), id)
  );
CREATE POLICY projects_delete ON public.projects FOR DELETE
  USING (public.is_saas_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- blocks policies
CREATE POLICY blocks_select ON public.blocks FOR SELECT
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_of_project(auth.uid(), project_id)
    OR public.is_resident_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );
CREATE POLICY blocks_write ON public.blocks FOR ALL
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  )
  WITH CHECK (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );

-- floors policies
CREATE POLICY floors_select ON public.floors FOR SELECT
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_of_project(auth.uid(), project_id)
    OR public.is_resident_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );
CREATE POLICY floors_write ON public.floors FOR ALL
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  )
  WITH CHECK (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );

-- apartments policies
CREATE POLICY apartments_select ON public.apartments FOR SELECT
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_of_project(auth.uid(), project_id)
    OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );
CREATE POLICY apartments_write ON public.apartments FOR ALL
  USING (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  )
  WITH CHECK (
    public.is_saas_admin(auth.uid())
    OR public.is_bql_manager_of_project(auth.uid(), project_id)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_tenant_admin(auth.uid(), p.tenant_id))
  );