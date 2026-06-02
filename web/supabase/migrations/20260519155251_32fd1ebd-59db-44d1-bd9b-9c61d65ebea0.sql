
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  apartment_id uuid,
  family_id uuid,
  requester_id uuid,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_project ON public.service_requests(project_id, status);
CREATE INDEX idx_service_requests_apartment ON public.service_requests(apartment_id);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_requests_select ON public.service_requests
FOR SELECT USING (
  is_saas_admin(auth.uid())
  OR is_bql_of_project(auth.uid(), project_id)
  OR (EXISTS (SELECT 1 FROM projects p WHERE p.id = service_requests.project_id AND is_tenant_admin(auth.uid(), p.tenant_id)))
  OR (family_id IS NOT NULL AND is_family_member(auth.uid(), family_id))
  OR auth.uid() = requester_id
);

CREATE POLICY service_requests_insert ON public.service_requests
FOR INSERT WITH CHECK (
  auth.uid() = requester_id
  AND (
    is_saas_admin(auth.uid())
    OR is_bql_of_project(auth.uid(), project_id)
    OR is_resident_of_project(auth.uid(), project_id)
    OR (EXISTS (SELECT 1 FROM projects p WHERE p.id = service_requests.project_id AND is_tenant_admin(auth.uid(), p.tenant_id)))
  )
);

CREATE POLICY service_requests_update ON public.service_requests
FOR UPDATE USING (
  is_saas_admin(auth.uid())
  OR is_bql_of_project(auth.uid(), project_id)
  OR (EXISTS (SELECT 1 FROM projects p WHERE p.id = service_requests.project_id AND is_tenant_admin(auth.uid(), p.tenant_id)))
);

CREATE POLICY service_requests_delete ON public.service_requests
FOR DELETE USING (
  is_saas_admin(auth.uid())
  OR is_bql_manager_of_project(auth.uid(), project_id)
  OR (EXISTS (SELECT 1 FROM projects p WHERE p.id = service_requests.project_id AND is_tenant_admin(auth.uid(), p.tenant_id)))
);

CREATE TRIGGER service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
