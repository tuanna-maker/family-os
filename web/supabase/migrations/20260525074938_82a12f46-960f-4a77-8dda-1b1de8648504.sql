
-- =============================================
-- COMMUNITY SERVICES
-- =============================================
CREATE TABLE public.community_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🛎️',
  tag text,
  category text,
  base_price bigint,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);
ALTER TABLE public.community_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_services_select_all_auth ON public.community_services
  FOR SELECT TO authenticated
  USING (active OR is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_of_project(auth.uid(), project_id)));

CREATE POLICY community_services_write_admin ON public.community_services
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id)))
  WITH CHECK (is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id)));

-- =============================================
-- COMMUNITY EVENTS
-- =============================================
CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  place text NOT NULL DEFAULT '',
  capacity int,
  cover_url text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_events_select_all_auth ON public.community_events
  FOR SELECT TO authenticated
  USING (active OR is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_of_project(auth.uid(), project_id)));

CREATE POLICY community_events_write_admin ON public.community_events
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id)))
  WITH CHECK (is_super_admin(auth.uid()) OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id)));

-- =============================================
-- EVENT REGISTRATIONS
-- =============================================
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  family_id uuid,
  guests_count int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'going',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_event_reg_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_reg_user ON public.event_registrations(user_id);

CREATE POLICY event_reg_select ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (family_id IS NOT NULL AND is_family_member(auth.uid(), family_id))
    OR is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = event_registrations.event_id
        AND e.project_id IS NOT NULL
        AND is_bql_of_project(auth.uid(), e.project_id)
    )
  );

CREATE POLICY event_reg_insert ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY event_reg_delete ON public.event_registrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY event_reg_update ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- =============================================
-- SERVICE BOOKINGS
-- =============================================
CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.community_services(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  family_id uuid,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  contact_phone text,
  scheduled_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sb_family ON public.service_bookings(family_id);
CREATE INDEX idx_sb_project ON public.service_bookings(project_id);
CREATE INDEX idx_sb_status ON public.service_bookings(status);

CREATE POLICY service_bookings_select ON public.service_bookings
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR (family_id IS NOT NULL AND is_family_member(auth.uid(), family_id))
    OR is_super_admin(auth.uid())
    OR (project_id IS NOT NULL AND is_bql_of_project(auth.uid(), project_id))
  );

CREATE POLICY service_bookings_insert ON public.service_bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (family_id IS NULL OR is_family_member(auth.uid(), family_id))
  );

CREATE POLICY service_bookings_update ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid()
    OR is_super_admin(auth.uid())
    OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id))
  );

CREATE POLICY service_bookings_delete ON public.service_bookings
  FOR DELETE TO authenticated
  USING (requested_by = auth.uid() OR is_super_admin(auth.uid()));

-- =============================================
-- VISITOR PASSES (QR khách)
-- =============================================
CREATE TABLE public.visitor_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  family_id uuid,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  pass_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  guest_name text NOT NULL,
  guest_phone text,
  vehicle_plate text,
  purpose text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  scanned_at timestamptz,
  scanned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_passes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vp_host ON public.visitor_passes(host_user_id);
CREATE INDEX idx_vp_family ON public.visitor_passes(family_id);
CREATE INDEX idx_vp_project ON public.visitor_passes(project_id);
CREATE INDEX idx_vp_status ON public.visitor_passes(status);

CREATE POLICY visitor_passes_select ON public.visitor_passes
  FOR SELECT TO authenticated
  USING (
    host_user_id = auth.uid()
    OR (family_id IS NOT NULL AND is_family_member(auth.uid(), family_id))
    OR is_security_user(auth.uid())
    OR is_super_admin(auth.uid())
    OR (project_id IS NOT NULL AND is_bql_of_project(auth.uid(), project_id))
  );

CREATE POLICY visitor_passes_insert ON public.visitor_passes
  FOR INSERT TO authenticated
  WITH CHECK (
    host_user_id = auth.uid()
    AND (family_id IS NULL OR is_family_member(auth.uid(), family_id))
  );

CREATE POLICY visitor_passes_update ON public.visitor_passes
  FOR UPDATE TO authenticated
  USING (
    host_user_id = auth.uid()
    OR (family_id IS NOT NULL AND is_family_member(auth.uid(), family_id))
    OR is_security_user(auth.uid())
    OR is_super_admin(auth.uid())
    OR (project_id IS NOT NULL AND is_bql_manager_of_project(auth.uid(), project_id))
  );

CREATE POLICY visitor_passes_delete ON public.visitor_passes
  FOR DELETE TO authenticated
  USING (host_user_id = auth.uid() OR is_super_admin(auth.uid()));

-- =============================================
-- updated_at triggers
-- =============================================
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.community_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ce_updated BEFORE UPDATE ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sb_updated BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.visitor_passes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED data (global = project_id NULL)
-- =============================================
INSERT INTO public.community_services (slug, name, description, icon, tag, category, sort_order) VALUES
  ('farm', 'Farm Fresh', 'Rau sạch tận cửa', '🥬', 'Khuyến mãi', 'food', 10),
  ('cleaning', 'Giúp việc theo giờ', 'Đánh giá 4.9★', '🧹', 'Phổ biến', 'home', 20),
  ('repair', 'Sửa chữa tại nhà', 'Có mặt trong 30 phút', '🔧', 'Nhanh', 'home', 30),
  ('spa', 'Spa tại gia', 'Thư giãn cuối tuần', '💆', 'Mới', 'wellness', 40),
  ('shuttle', 'Đưa đón con', 'Tài xế xác thực', '🚗', 'An toàn', 'transport', 50),
  ('doctor', 'Bác sĩ tại nhà', 'Tư vấn 24/7', '🩺', '24/7', 'health', 60);

INSERT INTO public.community_events (title, description, starts_at, place) VALUES
  ('Hội chợ cuối tuần', 'Gian hàng cư dân, ẩm thực, trò chơi cho bé', now() + interval '5 days', 'Sân vườn tầng 5'),
  ('Lớp Yoga gia đình', 'Lớp miễn phí cho cư dân, mang theo thảm', now() + interval '6 days', 'Phòng sinh hoạt cộng đồng');
