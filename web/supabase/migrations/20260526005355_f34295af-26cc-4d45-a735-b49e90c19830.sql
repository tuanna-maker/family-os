
ALTER TABLE public.security_requests
  ADD COLUMN IF NOT EXISTS tenant_id    uuid,
  ADD COLUMN IF NOT EXISTS project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_id     uuid REFERENCES public.blocks(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS apartment_id uuid REFERENCES public.apartments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS family_id    uuid REFERENCES public.families(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_source text;

CREATE INDEX IF NOT EXISTS idx_sec_req_project   ON public.security_requests (project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_req_tenant    ON public.security_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sec_req_apartment ON public.security_requests (apartment_id);
CREATE INDEX IF NOT EXISTS idx_sec_req_family    ON public.security_requests (family_id);

CREATE OR REPLACE FUNCTION public.resolve_user_primary_apartment(_user_id uuid)
RETURNS TABLE(apartment_id uuid, family_id uuid, project_id uuid, block_id uuid, tenant_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.id, ar.family_id, a.project_id, a.block_id, p.tenant_id
  FROM public.apartment_residents ar
  JOIN public.apartments a ON a.id = ar.apartment_id
  JOIN public.projects   p ON p.id = a.project_id
  WHERE ar.move_out_date IS NULL
    AND (
      ar.family_id IN (SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = _user_id)
      OR ar.family_id IN (SELECT f.id FROM public.families f WHERE f.owner_id = _user_id)
      OR ar.family_id IN (SELECT ur.family_id FROM public.user_roles ur
                          WHERE ur.user_id = _user_id AND ur.role IN ('family_owner','family_member'))
    )
  ORDER BY ar.is_primary DESC, ar.move_in_date DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.security_requests_fill_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _r RECORD;
BEGIN
  IF NEW.apartment_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.tenant_id IS NULL) THEN
    SELECT a.project_id, a.block_id, p.tenant_id
      INTO NEW.project_id, NEW.block_id, NEW.tenant_id
    FROM public.apartments a
    JOIN public.projects p ON p.id = a.project_id
    WHERE a.id = NEW.apartment_id;
  END IF;

  IF NEW.project_id IS NULL AND NEW.requester_id IS NOT NULL THEN
    SELECT * INTO _r FROM public.resolve_user_primary_apartment(NEW.requester_id);
    IF FOUND THEN
      NEW.apartment_id := COALESCE(NEW.apartment_id, _r.apartment_id);
      NEW.family_id    := COALESCE(NEW.family_id,    _r.family_id);
      NEW.project_id   := COALESCE(NEW.project_id,   _r.project_id);
      NEW.block_id     := COALESCE(NEW.block_id,     _r.block_id);
      NEW.tenant_id    := COALESCE(NEW.tenant_id,    _r.tenant_id);
      NEW.scope_source := COALESCE(NEW.scope_source, 'requester_primary');
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'security_requests: project_id is required (resident must belong to a project)';
  END IF;

  IF NEW.apartment_id IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.apartments
      WHERE id = NEW.apartment_id AND project_id = NEW.project_id
    ) THEN
      RAISE EXCEPTION 'security_requests: apartment % does not belong to project %', NEW.apartment_id, NEW.project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_requests_fill_scope ON public.security_requests;
CREATE TRIGGER trg_security_requests_fill_scope
  BEFORE INSERT OR UPDATE OF apartment_id, requester_id, project_id
  ON public.security_requests
  FOR EACH ROW EXECUTE FUNCTION public.security_requests_fill_scope();

-- Backfill: inline subquery (one row per requester)
WITH primary_apt AS (
  SELECT DISTINCT ON (ar.family_id)
    fm.user_id, a.id AS apartment_id, ar.family_id, a.project_id, a.block_id, p.tenant_id
  FROM public.apartment_residents ar
  JOIN public.apartments a ON a.id = ar.apartment_id
  JOIN public.projects   p ON p.id = a.project_id
  JOIN public.family_members fm ON fm.family_id = ar.family_id
  WHERE ar.move_out_date IS NULL
  ORDER BY ar.family_id, ar.is_primary DESC, ar.move_in_date DESC NULLS LAST
)
UPDATE public.security_requests sr
SET apartment_id = pa.apartment_id,
    family_id    = pa.family_id,
    project_id   = pa.project_id,
    block_id     = pa.block_id,
    tenant_id    = pa.tenant_id,
    scope_source = COALESCE(sr.scope_source, 'requester_primary')
FROM primary_apt pa
WHERE sr.project_id IS NULL
  AND sr.requester_id IS NOT NULL
  AND pa.user_id = sr.requester_id;

UPDATE public.security_requests
SET scope_source = 'legacy_unscoped'
WHERE project_id IS NULL AND scope_source IS NULL;

-- STRICT RLS
DROP POLICY IF EXISTS sec_select_requester_or_staff ON public.security_requests;
DROP POLICY IF EXISTS sec_insert_authenticated      ON public.security_requests;
DROP POLICY IF EXISTS sec_update_staff              ON public.security_requests;
DROP POLICY IF EXISTS sec_select_requester          ON public.security_requests;
DROP POLICY IF EXISTS sec_select_bql_project        ON public.security_requests;
DROP POLICY IF EXISTS sec_select_tenant_admin       ON public.security_requests;
DROP POLICY IF EXISTS sec_select_admin              ON public.security_requests;
DROP POLICY IF EXISTS sec_insert_resident           ON public.security_requests;
DROP POLICY IF EXISTS sec_update_bql_project        ON public.security_requests;
DROP POLICY IF EXISTS sec_update_tenant_admin       ON public.security_requests;
DROP POLICY IF EXISTS sec_update_admin              ON public.security_requests;

CREATE POLICY sec_select_requester ON public.security_requests
  FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY sec_select_bql_project ON public.security_requests
  FOR SELECT USING (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id));

CREATE POLICY sec_select_tenant_admin ON public.security_requests
  FOR SELECT USING (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY sec_select_admin ON public.security_requests
  FOR SELECT USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY sec_insert_resident ON public.security_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = requester_id
    AND (apartment_id IS NULL OR public.is_resident_of_apartment(auth.uid(), apartment_id))
  );

CREATE POLICY sec_update_bql_project ON public.security_requests
  FOR UPDATE
  USING (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id))
  WITH CHECK (project_id IS NOT NULL AND public.is_bql_of_project(auth.uid(), project_id));

CREATE POLICY sec_update_tenant_admin ON public.security_requests
  FOR UPDATE
  USING (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY sec_update_admin ON public.security_requests
  FOR UPDATE
  USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
