
-- 1. ROLES ENUM
CREATE TYPE public.app_role AS ENUM (
  'super_admin','family_owner','family_member','security_admin','security_staff'
);

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. FAMILIES
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  apartment TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- 4. USER ROLES (family_id nullable; super_admin/security_* have NULL family_id)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, family_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. FAMILY MEMBERS (people in a family; may or may not be a registered user)
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  member_role TEXT,
  age INT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- 6. EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_expenses_family ON public.expenses(family_id, created_at DESC);

-- 7. RECEIPT SCANS
CREATE TABLE public.receipt_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  merchant TEXT,
  total BIGINT,
  scanned_date TEXT,
  category TEXT,
  raw JSONB,
  image_path TEXT,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_scans ENABLE ROW LEVEL SECURITY;

-- 8. SECURITY REQUESTS
CREATE TABLE public.security_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users ON DELETE SET NULL,
  building TEXT,
  apartment TEXT,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  payload JSONB,
  assigned_to UUID REFERENCES auth.users ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sec_req_status ON public.security_requests(status, created_at DESC);

-- 9. AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','security_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_security_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('security_admin','security_staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND family_id = _family_id
      AND role IN ('family_owner','family_member')
  ) OR EXISTS (
    SELECT 1 FROM public.families WHERE id = _family_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families WHERE id = _family_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND family_id = _family_id AND role = 'family_owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.log_audit(_action TEXT, _target_table TEXT, _target_id TEXT, _metadata JSONB DEFAULT '{}'::JSONB)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), _action, _target_table, _target_id, _metadata);
$$;

-- =====================================================
-- HANDLE NEW USER → profile + default family_member role
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- families
CREATE POLICY "families_select" ON public.families FOR SELECT
  USING (public.is_family_member(auth.uid(), id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "families_insert_self_owner" ON public.families FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "families_update_owner" ON public.families FOR UPDATE
  USING (public.is_family_owner(auth.uid(), id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "families_delete_owner" ON public.families FOR DELETE
  USING (public.is_family_owner(auth.uid(), id) OR public.is_super_admin(auth.uid()));

-- family_members
CREATE POLICY "fm_select_member" ON public.family_members FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "fm_write_owner" ON public.family_members FOR ALL
  USING (public.is_family_owner(auth.uid(), family_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_family_owner(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));

-- expenses (security users explicitly excluded by family-membership check)
CREATE POLICY "exp_select_family" ON public.expenses FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "exp_insert_family" ON public.expenses FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY "exp_update_owner" ON public.expenses FOR UPDATE
  USING (auth.uid() = created_by OR public.is_family_owner(auth.uid(), family_id));
CREATE POLICY "exp_delete_owner" ON public.expenses FOR DELETE
  USING (auth.uid() = created_by OR public.is_family_owner(auth.uid(), family_id));

-- receipt_scans
CREATE POLICY "scan_select_family" ON public.receipt_scans FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "scan_insert_family" ON public.receipt_scans FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY "scan_delete_owner" ON public.receipt_scans FOR DELETE
  USING (auth.uid() = created_by OR public.is_family_owner(auth.uid(), family_id));

-- security_requests
CREATE POLICY "sec_select_requester_or_staff" ON public.security_requests FOR SELECT
  USING (
    auth.uid() = requester_id
    OR public.is_security_user(auth.uid())
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "sec_insert_authenticated" ON public.security_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (requester_id IS NULL OR auth.uid() = requester_id));
CREATE POLICY "sec_update_staff" ON public.security_requests FOR UPDATE
  USING (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()));

-- audit_logs (admins read only; writes via SECURITY DEFINER log_audit)
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));
