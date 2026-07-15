
CREATE TABLE public.demo_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text NOT NULL,
  role text,
  project_name text,
  scale text,
  source text NOT NULL DEFAULT 'landing_bql',
  message text,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Only SaaS admins can read / update / delete leads
CREATE POLICY "demo_leads_admin_select" ON public.demo_leads
  FOR SELECT USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "demo_leads_admin_update" ON public.demo_leads
  FOR UPDATE USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "demo_leads_admin_delete" ON public.demo_leads
  FOR DELETE USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Inserts handled server-side via service role (no public insert policy)

CREATE INDEX idx_demo_leads_created_at ON public.demo_leads(created_at DESC);
CREATE INDEX idx_demo_leads_status ON public.demo_leads(status);

CREATE TRIGGER update_demo_leads_updated_at
  BEFORE UPDATE ON public.demo_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
