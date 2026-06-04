-- =============================================================================
-- STOS Family OS — Bootstrap pilot (Lovable SQL Editor)
-- Chạy 1 lần trên project bigarvjahnxiuovepaxm
-- Mật khẩu tất cả tài khoản: Demo@12345
-- =============================================================================

-- ── A. Pending migrations (safe IF NOT EXISTS) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.family_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  cover_emoji text NOT NULL DEFAULT '📁',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_albums_family ON public.family_albums (family_id, created_at DESC);
ALTER TABLE public.family_albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_albums_select ON public.family_albums;
DROP POLICY IF EXISTS family_albums_insert ON public.family_albums;
DROP POLICY IF EXISTS family_albums_update ON public.family_albums;
DROP POLICY IF EXISTS family_albums_delete ON public.family_albums;
CREATE POLICY family_albums_select ON public.family_albums FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY family_albums_insert ON public.family_albums FOR INSERT TO authenticated
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY family_albums_update ON public.family_albums FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY family_albums_delete ON public.family_albums FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS family_albums_updated_at ON public.family_albums;
CREATE TRIGGER family_albums_updated_at BEFORE UPDATE ON public.family_albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.family_moments ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.family_albums(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_moments_album ON public.family_moments (album_id) WHERE album_id IS NOT NULL;

-- Health profiles encryption (20260525034430) — seed dùng *_enc, không còn blood_type plaintext
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.encryption_keys (
  name text PRIMARY KEY,
  key  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.encryption_keys(name, key)
VALUES ('health_profile', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;
CREATE OR REPLACE FUNCTION private.get_enc_key(_name text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = private AS $$
  SELECT key FROM private.encryption_keys WHERE name = _name;
$$;
ALTER TABLE public.health_profiles
  ADD COLUMN IF NOT EXISTS blood_type_enc bytea,
  ADD COLUMN IF NOT EXISTS allergies_enc  bytea,
  ADD COLUMN IF NOT EXISTS conditions_enc bytea;
ALTER TABLE public.health_profiles
  DROP COLUMN IF EXISTS blood_type,
  DROP COLUMN IF EXISTS allergies,
  DROP COLUMN IF EXISTS conditions;

-- SOS push fanout (20260604150000)
CREATE OR REPLACE FUNCTION public.fanout_security_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, platform, care AS $$
DECLARE
  _event_type text; _priority text := 'P0'; _title text; _body text; _payload jsonb; _count int := 0;
BEGIN
  IF NEW.status <> 'open' THEN RETURN NEW; END IF;
  _event_type := CASE NEW.request_type WHEN 'sos' THEN 'sos.triggered' WHEN 'fire' THEN 'sos.fire' ELSE 'sos.resident_request' END;
  _payload := jsonb_build_object('request_id', NEW.id, 'request_type', NEW.request_type, 'building', NEW.building,
    'apartment', NEW.apartment, 'family_id', NEW.family_id, 'project_id', NEW.project_id, 'payload', COALESCE(NEW.payload, '{}'::jsonb));
  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
    VALUES ('security_request', NEW.id::text, _event_type, _payload, _priority);
  _title := CASE NEW.request_type WHEN 'sos' THEN 'SOS KHẨN CẤP' WHEN 'fire' THEN 'BÁO CHÁY' ELSE 'Yêu cầu cư dân' END;
  _body := trim(both ' · ' FROM concat_ws(' · ', NULLIF(COALESCE(NEW.apartment, NEW.building), ''),
    CASE NEW.request_type WHEN 'sos' THEN 'Cần hỗ trợ ngay' WHEN 'fire' THEN 'Kiểm tra PCCC'
      WHEN 'intrusion' THEN 'Người lạ / xâm nhập' WHEN 'package' THEN 'Nhận hàng hộ' ELSE NEW.request_type END));
  WITH on_duty AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status)
    SELECT g.guard_id, NEW.family_id, 'fcm', _priority, _event_type, _title, _body, _payload,
      'sos:' || NEW.id::text || ':' || g.guard_id::text, 'queued'
    FROM care.on_duty_guards() g ON CONFLICT (user_id, dedupe_key) DO NOTHING RETURNING 1
  ) SELECT COUNT(*) INTO _count FROM on_duty;
  IF _count = 0 THEN
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status)
    SELECT ur.user_id, NEW.family_id, 'fcm', _priority, _event_type, _title, _body, _payload,
      'sos:' || NEW.id::text || ':' || ur.user_id::text, 'queued'
    FROM public.user_roles ur
    WHERE ur.role IN ('security_staff', 'security_admin', 'super_admin')
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_security_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, platform AS $$
DECLARE _payload jsonb; _title text; _body text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.requester_id IS NULL THEN RETURN NEW; END IF;
  _payload := jsonb_build_object('request_id', NEW.id, 'request_type', NEW.request_type,
    'from_status', OLD.status, 'to_status', NEW.status, 'building', NEW.building, 'apartment', NEW.apartment);
  _title := CASE NEW.status WHEN 'in_progress' THEN 'Bảo vệ đã tiếp nhận' WHEN 'resolved' THEN 'Yêu cầu đã xử lý xong'
    WHEN 'cancelled' THEN 'Yêu cầu đã hủy' ELSE 'Cập nhật yêu cầu bảo an' END;
  _body := COALESCE(NEW.apartment, NEW.building, 'Yêu cầu của bạn') || ' · ' || OLD.status || ' → ' || NEW.status;
  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
    VALUES ('security_request', NEW.id::text, 'security.status_changed', _payload,
      CASE WHEN NEW.request_type = 'sos' THEN 'P0' ELSE 'P1' END);
  INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status)
    VALUES (NEW.requester_id, NEW.family_id, 'fcm',
      CASE WHEN NEW.request_type = 'sos' THEN 'P0' ELSE 'P1' END,
      'security.status_changed', _title, _body, _payload,
      'sec-status:' || NEW.id::text || ':' || NEW.status, 'queued')
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  INSERT INTO public.notifications(user_id, family_id, type, title, body, dedupe_key, ref_id)
    VALUES (NEW.requester_id, NEW.family_id, 'security_' || NEW.status, _title, _body,
      'sec-status:' || NEW.id::text || ':' || NEW.status, NEW.id::text)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_security_request_fanout ON public.security_requests;
CREATE TRIGGER trg_security_request_fanout AFTER INSERT ON public.security_requests
  FOR EACH ROW EXECUTE FUNCTION public.fanout_security_request_insert();
DROP TRIGGER IF EXISTS trg_security_request_status_notify ON public.security_requests;
CREATE TRIGGER trg_security_request_status_notify AFTER UPDATE OF status ON public.security_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_security_request_status();

-- Bật feature flags pilot
UPDATE platform.feature_flag SET enabled_global = true
WHERE key IN ('family.sos.enabled', 'family.memories.enabled', 'family.helper.qr.enabled', 'family.pickup.enabled');

-- ── B. Pilot seed ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _pilot_ensure_user(_email text, _name text, _pass text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = _email;
  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated', _email, _pass, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', _name), now(), now(),
      '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (_uid, _uid, jsonb_build_object('sub', _uid::text, 'email', _email, 'email_verified', true),
      'email', _uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = _pass, email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = _uid;
  END IF;
  INSERT INTO public.profiles (id, full_name) VALUES (_uid, _name)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  RETURN _uid;
END;
$$;

DO $$
DECLARE
  v_pass text := crypt('Demo@12345', gen_salt('bf'));
  uid_owner uuid; uid_member uuid; uid_sadmin uuid; uid_sstaff uuid;
  uid_lean uuid; uid_super uuid;
  v_tenant_id uuid := 'a0000001-0001-4001-8001-000000000001'::uuid;
  v_project_id uuid := 'a0000001-0001-4001-8001-000000000002'::uuid;
  v_block_id uuid := 'a0000001-0001-4001-8001-000000000003'::uuid;
  v_floor_id uuid := 'a0000001-0001-4001-8001-000000000004'::uuid;
  v_apt_pilot uuid := 'a0000001-0001-4001-8001-000000000005'::uuid;
  v_apt_lean uuid := 'a0000001-0001-4001-8001-000000000006'::uuid;
  v_family_id uuid := 'b0000001-0001-4001-8001-000000000001'::uuid;
  v_family2_id uuid := 'b0000001-0001-4001-8001-000000000002'::uuid;
  v_child_id uuid; v_elder_id uuid; v_album_id uuid; v_moment_id uuid;
  v_helper_id uuid; v_trip_id uuid; v_svc_farm uuid;
  v_health_key text;

BEGIN
  uid_owner := _pilot_ensure_user('giadinh@securitytech.vn', 'Anh Tuấn (Chủ hộ)', v_pass);
  uid_member := _pilot_ensure_user('thanhvien@securitytech.vn', 'Chị Lan (Thành viên)', v_pass);
  uid_sadmin := _pilot_ensure_user('baove@securitytech.vn', 'Trưởng ca Bảo vệ', v_pass);
  uid_sstaff := _pilot_ensure_user('nhanvienbaove@securitytech.vn', 'Lê Minh Đức (Bảo vệ)', v_pass);
  uid_lean := _pilot_ensure_user('lean@securitytech.vn', 'Chị Lean (Gia đình 2)', v_pass);
  uid_super := _pilot_ensure_user('superadmin@securitytech.vn', 'Super Admin', v_pass);

  -- Tenant / project / căn hộ
  INSERT INTO public.tenants (id, name, slug, plan, status, contact_email)
  VALUES (v_tenant_id, 'STOS Demo', 'stos-demo', 'pro', 'active', 'admin@securitytech.vn')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.projects (id, tenant_id, name, code, address, city, status)
  VALUES (v_project_id, v_tenant_id, 'STOS Residence', 'STOS-01', '123 Nguyễn Huệ', 'TP.HCM', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.blocks (id, project_id, name, code, total_floors)
  VALUES (v_block_id, v_project_id, 'Tháp A', 'A', 25)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.floors (id, block_id, project_id, floor_number, name)
  VALUES (v_floor_id, v_block_id, v_project_id, 15, 'Tầng 15')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.apartments (id, floor_id, block_id, project_id, code, area_m2, bedrooms, status)
  VALUES
    (v_apt_pilot, v_floor_id, v_block_id, v_project_id, 'A-1502', 95, 3, 'occupied'),
    (v_apt_lean, v_floor_id, v_block_id, v_project_id, 'A-0807', 72, 2, 'occupied')
  ON CONFLICT (id) DO UPDATE SET status = 'occupied';

  -- Gia đình pilot (giữ family_id cũ nếu owner đã có)
  SELECT id INTO v_family_id FROM public.families WHERE owner_id = uid_owner LIMIT 1;
  IF v_family_id IS NULL THEN
    v_family_id := 'b0000001-0001-4001-8001-000000000001'::uuid;
    INSERT INTO public.families (id, name, apartment, owner_id)
    VALUES (v_family_id, 'Gia đình Pilot', 'A-1502', uid_owner);
  ELSE
    UPDATE public.families SET name = 'Gia đình Pilot', apartment = 'A-1502' WHERE id = v_family_id;
  END IF;

  SELECT id INTO v_family2_id FROM public.families WHERE owner_id = uid_lean LIMIT 1;
  IF v_family2_id IS NULL THEN
    v_family2_id := 'b0000001-0001-4001-8001-000000000002'::uuid;
    INSERT INTO public.families (id, name, apartment, owner_id)
    VALUES (v_family2_id, 'Gia đình Lean', 'A-0807', uid_lean);
  ELSE
    UPDATE public.families SET name = 'Gia đình Lean', apartment = 'A-0807' WHERE id = v_family2_id;
  END IF;

  -- Roles (guard cần project_id để xem SOS)
  DELETE FROM public.user_roles WHERE user_id IN (uid_owner, uid_member, uid_sadmin, uid_sstaff, uid_lean, uid_super);
  INSERT INTO public.user_roles (user_id, role, family_id, project_id, tenant_id) VALUES
    (uid_owner, 'family_owner', v_family_id, NULL, NULL),
    (uid_member, 'family_member', v_family_id, NULL, NULL),
    (uid_lean, 'family_owner', v_family2_id, NULL, NULL),
    (uid_sadmin, 'security_admin', NULL, v_project_id, v_tenant_id),
    (uid_sstaff, 'security_staff', NULL, v_project_id, v_tenant_id),
    (uid_super, 'super_admin', NULL, NULL, NULL);

  -- family_members (RLS helpers/trips cần bảng này)
  DELETE FROM public.family_members WHERE family_id IN (v_family_id, v_family2_id);
  INSERT INTO public.family_members (family_id, user_id, name, member_role, age) VALUES
    (v_family_id, uid_owner, 'Anh Tuấn', 'owner', 38),
    (v_family_id, uid_member, 'Chị Lan', 'member', 35),
    (v_family_id, NULL, 'Bé Minh', 'child', 8),
    (v_family_id, NULL, 'Bà Ngoại', 'elderly', 72),
    (v_family2_id, uid_lean, 'Chị Lean', 'owner', 32);

  DELETE FROM public.apartment_residents WHERE apartment_id IN (v_apt_pilot, v_apt_lean);
  INSERT INTO public.apartment_residents (apartment_id, family_id, relation, is_primary, move_in_date)
  VALUES
    (v_apt_pilot, v_family_id, 'owner', true, CURRENT_DATE - 365),
    (v_apt_lean, v_family2_id, 'owner', true, CURRENT_DATE - 180);

  -- Notification prefs
  INSERT INTO public.notification_preferences (user_id) VALUES
    (uid_owner), (uid_member), (uid_lean), (uid_sadmin), (uid_sstaff)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ngân sách + chi tiêu
  DELETE FROM public.expenses WHERE family_id = v_family_id AND title LIKE '[Pilot]%';
  INSERT INTO public.expense_budgets (family_id, month, total_amount, warning_threshold, created_by)
  VALUES (v_family_id, date_trunc('month', CURRENT_DATE)::date, 25000000, 80, uid_owner)
  ON CONFLICT (family_id, month) DO UPDATE SET total_amount = EXCLUDED.total_amount;

  INSERT INTO public.expenses (family_id, created_by, title, category, amount, spent_on, note) VALUES
    (v_family_id, uid_owner, '[Pilot] Siêu thị cuối tuần', 'Ăn uống', 850000, CURRENT_DATE - 1, 'BigC'),
    (v_family_id, uid_member, '[Pilot] Học phí bé Minh', 'Con cái', 5200000, CURRENT_DATE - 5, 'Tháng 6'),
    (v_family_id, uid_owner, '[Pilot] Điện nước', 'Nhà cửa', 2100000, CURRENT_DATE - 3, NULL),
    (v_family_id, uid_owner, '[Pilot] Khám bà Ngoại', 'Y tế', 650000, CURRENT_DATE - 7, 'BV Quận 1');

  -- Con cái
  DELETE FROM public.homeworks WHERE family_id = v_family_id;
  DELETE FROM public.school_schedules WHERE family_id = v_family_id;
  DELETE FROM public.achievements WHERE family_id = v_family_id;
  DELETE FROM public.children WHERE family_id = v_family_id AND name = 'Bé Minh';

  INSERT INTO public.children (family_id, name, dob, school, grade, created_by)
  VALUES (v_family_id, 'Bé Minh', CURRENT_DATE - INTERVAL '8 years', 'Trường Quốc tế STOS', 'Lớp 2', uid_owner)
  RETURNING id INTO v_child_id;

  INSERT INTO public.school_schedules (family_id, child_id, day_of_week, subject, time_start, time_end, created_by) VALUES
    (v_family_id, v_child_id, 1, 'Toán', '07:30', '08:15', uid_owner),
    (v_family_id, v_child_id, 1, 'Tiếng Anh', '08:20', '09:05', uid_owner),
    (v_family_id, v_child_id, 3, 'Thể dục', '14:00', '14:45', uid_owner);

  INSERT INTO public.homeworks (family_id, child_id, subject, title, due_date, done, created_by) VALUES
    (v_family_id, v_child_id, 'Toán', 'Bài tập trang 45', CURRENT_DATE + 2, false, uid_owner),
    (v_family_id, v_child_id, 'Tiếng Việt', 'Viết đoạn văn', CURRENT_DATE + 1, true, uid_member);

  INSERT INTO public.achievements (family_id, child_id, title, kind, earned_at, created_by)
  VALUES (v_family_id, v_child_id, 'Học sinh giỏi tháng 5', 'academic', CURRENT_DATE - 10, uid_owner);

  -- Ông bà
  DELETE FROM public.care_notes WHERE family_id = v_family_id;
  DELETE FROM public.elderly_profiles WHERE family_id = v_family_id AND name = 'Bà Ngoại';

  INSERT INTO public.elderly_profiles (family_id, created_by, name, age, relation, conditions, doctor, phone, safe_status, safe_last_at)
  VALUES (v_family_id, uid_owner, 'Bà Ngoại', 72, 'Bà ngoại', ARRAY['cao huyết áp'], 'BS. Hương', '0901234567', 'ok', now() - interval '2 hours')
  RETURNING id INTO v_elder_id;

  INSERT INTO public.care_notes (family_id, elderly_id, author_name, content, created_by)
  VALUES (v_family_id, v_elder_id, 'Chị Lan', 'Bà uống thuốc đủ liều sáng nay', uid_member);

  INSERT INTO public.medicine_reminders (family_id, member_name, medicine, dosage, time_of_day, active, created_by)
  SELECT v_family_id, 'Bà Ngoại', 'Amlodipine 5mg', '1 viên', '08:00', true, uid_owner
  WHERE NOT EXISTS (
    SELECT 1 FROM public.medicine_reminders WHERE family_id = v_family_id AND member_name = 'Bà Ngoại'
  );

  INSERT INTO public.medicine_reminders (family_id, member_name, medicine, dosage, time_of_day, active, created_by)
  SELECT v_family_id, 'Anh Hùng', 'Vitamin D3', '1 viên', '07:00', true, uid_owner
  WHERE NOT EXISTS (
    SELECT 1 FROM public.medicine_reminders WHERE family_id = v_family_id AND member_name = 'Anh Hùng'
  );

  INSERT INTO public.medicine_reminders (family_id, member_name, medicine, dosage, time_of_day, active, created_by)
  SELECT v_family_id, 'Chị Lan', 'Omega-3', '1 viên', '20:00', true, uid_owner
  WHERE NOT EXISTS (
    SELECT 1 FROM public.medicine_reminders WHERE family_id = v_family_id AND member_name = 'Chị Lan'
  );

  -- Hồ sơ sức khỏe + lịch khám
  DELETE FROM public.health_records WHERE family_id = v_family_id AND title LIKE '[Pilot]%';
  DELETE FROM public.medical_appointments WHERE family_id = v_family_id AND member_name IN ('Anh Hùng', 'Chị Lan', 'Bà Ngoại');
  DELETE FROM public.health_profiles WHERE family_id = v_family_id AND name IN ('Anh Hùng', 'Chị Lan', 'Bé Minh', 'Bé An', 'Bà Ngoại');

  v_health_key := private.get_enc_key('health_profile');
  INSERT INTO public.health_profiles (family_id, created_by, name, dob, blood_type_enc, allergies_enc, conditions_enc, notes) VALUES
    (v_family_id, uid_owner, 'Anh Hùng', CURRENT_DATE - INTERVAL '38 years', pgp_sym_encrypt('O+', v_health_key), NULL, NULL, 'Khỏe mạnh'),
    (v_family_id, uid_owner, 'Chị Lan', CURRENT_DATE - INTERVAL '35 years', pgp_sym_encrypt('A+', v_health_key), pgp_sym_encrypt('Hải sản', v_health_key), NULL, NULL),
    (v_family_id, uid_owner, 'Bé Minh', CURRENT_DATE - INTERVAL '8 years', pgp_sym_encrypt('O+', v_health_key), NULL, NULL, NULL),
    (v_family_id, uid_owner, 'Bé An', CURRENT_DATE - INTERVAL '5 years', pgp_sym_encrypt('A+', v_health_key), pgp_sym_encrypt('Đậu phộng', v_health_key), NULL, NULL),
    (v_family_id, uid_owner, 'Bà Ngoại', CURRENT_DATE - INTERVAL '72 years', pgp_sym_encrypt('B+', v_health_key), NULL, pgp_sym_encrypt('cao huyết áp', v_health_key), 'Theo dõi huyết áp');

  INSERT INTO public.medical_appointments (family_id, member_name, doctor, location, scheduled_at, status, notes, created_by) VALUES
    (v_family_id, 'Anh Hùng', 'BS. Minh', 'Phòng khám STOS', now() + interval '4 days', 'planned', '[Pilot] Khám tổng quát định kỳ', uid_owner),
    (v_family_id, 'Bà Ngoại', 'BS. Hương', 'BV Quận 1', now() + interval '5 days', 'planned', '[Pilot] Tái khám huyết áp', uid_member),
    (v_family_id, 'Bé Minh', 'BS. Lan', 'Trường STOS', now() + interval '10 days', 'planned', '[Pilot] Khám sức khỏe học sinh', uid_owner);

  INSERT INTO public.health_records (family_id, member_name, kind, title, value, recorded_at, notes, created_by) VALUES
    (v_family_id, 'Anh Hùng', 'lab', '[Pilot] Kết quả xét nghiệm', 'Bình thường', now() - interval '30 days', NULL, uid_owner),
    (v_family_id, 'Chị Lan', 'prescription', '[Pilot] Đơn thuốc', 'Omega-3', now() - interval '14 days', NULL, uid_owner);

  -- Thực phẩm & đi chợ
  DELETE FROM public.shopping_items WHERE family_id = v_family_id AND name LIKE '[Pilot]%';
  DELETE FROM public.food_items WHERE family_id = v_family_id AND name LIKE '[Pilot]%';

  INSERT INTO public.food_items (family_id, name, category, qty, unit, location, expires_on, notes, created_by) VALUES
    (v_family_id, '[Pilot] Trứng gà', 'Protein', 10, 'quả', 'fridge', CURRENT_DATE + 5, NULL, uid_owner),
    (v_family_id, '[Pilot] Cà chua', 'Rau củ', 0.5, 'kg', 'fridge', CURRENT_DATE + 2, 'Ưu tiên dùng sớm', uid_owner),
    (v_family_id, '[Pilot] Thịt bò', 'Thịt', 0.4, 'kg', 'fridge', CURRENT_DATE + 1, NULL, uid_owner),
    (v_family_id, '[Pilot] Rau muống', 'Rau củ', 2, 'bó', 'fridge', CURRENT_DATE + 3, NULL, uid_owner),
    (v_family_id, '[Pilot] Sữa tươi', 'Sữa', 2, 'hộp', 'fridge', CURRENT_DATE + 7, NULL, uid_owner),
    (v_family_id, '[Pilot] Gà ta', 'Thịt', 1, 'con', 'freezer', CURRENT_DATE + 14, NULL, uid_owner);

  INSERT INTO public.shopping_items (family_id, name, qty, unit, category, purchased, created_by) VALUES
    (v_family_id, '[Pilot] Bánh mì', 2, 'ổ', 'Bánh', false, uid_owner),
    (v_family_id, '[Pilot] Táo Mỹ', 1, 'kg', 'Trái cây', false, uid_member),
    (v_family_id, '[Pilot] Nước mắm', 1, 'chai', 'Gia vị', true, uid_owner);

  -- Lịch gia đình
  DELETE FROM public.family_events WHERE family_id = v_family_id AND title LIKE '[Pilot]%';
  INSERT INTO public.family_events (family_id, created_by, title, category, starts_at, ends_at, location, status) VALUES
    (v_family_id, uid_owner, '[Pilot] Họp PHHS', 'school', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 'Trường STOS', 'planned'),
    (v_family_id, uid_member, '[Pilot] Khám định kỳ bà', 'medical', now() + interval '5 days', NULL, 'BV Quận 1', 'planned'),
    (v_family_id, uid_owner, '[Pilot] Sinh nhật bé Minh', 'family', now() + interval '12 days', NULL, 'Nhà', 'planned');

  -- Album + kỷ niệm
  DELETE FROM public.moment_comments WHERE family_id = v_family_id;
  DELETE FROM public.moment_reactions WHERE family_id = v_family_id;
  DELETE FROM public.family_moments WHERE family_id = v_family_id AND caption LIKE '[Pilot]%';
  DELETE FROM public.family_albums WHERE family_id = v_family_id AND title LIKE '[Pilot]%';

  INSERT INTO public.family_albums (id, family_id, title, category, cover_emoji, created_by)
  VALUES ('c0000001-0001-4001-8001-000000000001'::uuid, v_family_id, '[Pilot] Mùa hè 2025', 'travel', '🏖️', uid_owner)
  RETURNING id INTO v_album_id;

  INSERT INTO public.family_moments (id, family_id, created_by, caption, media_url, media_type, album_id, taken_at)
  VALUES ('c0000001-0001-4001-8001-000000000002'::uuid, v_family_id, uid_owner, '[Pilot] Đi biển Vũng Tàu',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'image', v_album_id, now() - interval '30 days')
  RETURNING id INTO v_moment_id;

  INSERT INTO public.family_moments (family_id, created_by, caption, media_url, media_type, album_id, taken_at) VALUES
    (v_family_id, uid_owner, '[Pilot] Đà Nẵng – Hội An', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800', 'image', v_album_id, now() - interval '380 days'),
    (v_family_id, uid_member, '[Pilot] Sinh nhật bé An', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', 'image', v_album_id, now() - interval '388 days'),
    (v_family_id, uid_owner, '[Pilot] Bữa cơm cuối tuần', 'https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800', 'image', v_album_id, now() - interval '395 days'),
    (v_family_id, uid_member, '[Pilot] Ngày của mẹ', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'image', v_album_id, now() - interval '390 days');

  INSERT INTO public.moment_reactions (moment_id, family_id, user_id, emoji) VALUES
    (v_moment_id, v_family_id, uid_member, '❤️'),
    (v_moment_id, v_family_id, uid_owner, '😍');

  INSERT INTO public.moment_comments (moment_id, family_id, user_id, body) VALUES
    (v_moment_id, v_family_id, uid_member, 'Nhớ quá! Hè này đi tiếp nhé 💙');

  -- Du lịch
  DELETE FROM public.family_trip_items WHERE trip_id IN (SELECT id FROM public.family_trips WHERE family_id = v_family_id AND title LIKE '[Pilot]%');
  DELETE FROM public.family_trips WHERE family_id = v_family_id AND title LIKE '[Pilot]%';

  INSERT INTO public.family_trips (family_id, title, destination, start_date, end_date, members_count, budget_planned, status, created_by)
  VALUES (v_family_id, '[Pilot] Đà Lạt tháng 7', 'Đà Lạt', CURRENT_DATE + 45, CURRENT_DATE + 48, 4, 8000000, 'planning', uid_owner)
  RETURNING id INTO v_trip_id;

  INSERT INTO public.family_trip_items (trip_id, kind, label, assignee, done, position) VALUES
    (v_trip_id, 'checklist', 'Đặt khách sạn', 'Anh Tuấn', true, 1),
    (v_trip_id, 'packing', 'Áo khoác', 'Cả nhà', false, 1),
    (v_trip_id, 'budget', 'Ăn uống', NULL, false, 1);

  -- Giúp việc
  DELETE FROM public.family_helper_tasks WHERE helper_id IN (SELECT id FROM public.family_helpers WHERE family_id = v_family_id);
  DELETE FROM public.family_helpers WHERE family_id = v_family_id;

  INSERT INTO public.family_helpers (id, family_id, name, role, phone, salary, verified, status, schedule)
  VALUES ('d0000001-0001-4001-8001-000000000001'::uuid, v_family_id, 'Cô Hồng', 'Giúp việc', '0912345678', 6500000, true, 'active', '["T2-T6 08:00-17:00"]'::jsonb)
  RETURNING id INTO v_helper_id;

  INSERT INTO public.family_helper_tasks (helper_id, title, time, icon, done) VALUES
    (v_helper_id, 'Nấu bữa trưa', '11:30', '🍲', true),
    (v_helper_id, 'Đón bé Minh', '16:30', '🚌', false);

  -- Guard ca trực (để SOS push tới bảo vệ đang on-duty)
  DELETE FROM public.guard_shifts WHERE guard_id = uid_sstaff AND shift_date = CURRENT_DATE;
  INSERT INTO public.guard_shifts (guard_id, project_id, shift_date, shift_type, start_at, end_at, check_in_at, status)
  VALUES (uid_sstaff, v_project_id, CURRENT_DATE, 'morning',
    date_trunc('day', now()) + interval '6 hours',
    date_trunc('day', now()) + interval '14 hours',
    now() - interval '1 hour', 'checked_in');

  -- Yêu cầu bảo an demo (1 mở, 1 đã xử lý)
  DELETE FROM public.sos_events WHERE request_id IN (
    SELECT id FROM public.security_requests WHERE requester_id = uid_owner AND building = 'A-1502'
  );
  DELETE FROM public.security_requests WHERE requester_id = uid_owner AND building = 'A-1502';

  INSERT INTO public.security_requests (requester_id, request_type, status, building, apartment, project_id, family_id, apartment_id, tenant_id, block_id, payload)
  VALUES
    (uid_owner, 'package', 'open', 'Tháp A', 'A-1502', v_project_id, v_family_id, v_apt_pilot, v_tenant_id, v_block_id,
      '{"note":"Giao hàng Shopee, 2 kiện"}'::jsonb),
    (uid_owner, 'sos', 'resolved', 'Tháp A', 'A-1502', v_project_id, v_family_id, v_apt_pilot, v_tenant_id, v_block_id,
      jsonb_build_object('schema_version', 1, 'ticket_code', 'SOS-DEMO-0001', 'priority', 'P2',
        'incident_type', 'Demo SOS đã xử lý', 'zone', 'Tháp A', 'location', 'A-1502'));

  -- Cộng đồng: đăng ký sự kiện + đặt dịch vụ
  SELECT id INTO v_svc_farm FROM public.community_services WHERE slug = 'farm' LIMIT 1;
  IF v_svc_farm IS NOT NULL THEN
    DELETE FROM public.event_registrations WHERE user_id = uid_owner;
    INSERT INTO public.event_registrations (event_id, user_id, family_id, guests_count, status)
    SELECT id, uid_owner, v_family_id, 2, 'going' FROM public.community_events LIMIT 1;

    DELETE FROM public.service_bookings WHERE requested_by = uid_owner AND notes = '[Pilot]';
    INSERT INTO public.service_bookings (service_id, project_id, family_id, apartment_id, requested_by, scheduled_at, notes, status)
    VALUES (v_svc_farm, v_project_id, v_family_id, v_apt_pilot, uid_owner, now() + interval '2 days', '[Pilot] Rau sạch tuần này', 'pending');
  END IF;

  DELETE FROM public.visitor_passes WHERE host_user_id = uid_owner AND guest_name = '[Pilot] Khách demo';
  INSERT INTO public.visitor_passes (host_user_id, family_id, apartment_id, project_id, guest_name, guest_phone, purpose, valid_until, status)
  VALUES (uid_owner, v_family_id, v_apt_pilot, v_project_id, '[Pilot] Khách demo', '0987654321', 'Thăm gia đình', now() + interval '1 day', 'active');

  RAISE NOTICE 'Pilot seed OK — family %, project %', v_family_id, v_project_id;
END $$;

DROP FUNCTION IF EXISTS _pilot_ensure_user(text, text, text);

-- Kiểm tra nhanh
SELECT 'users' AS what, count(*) FROM auth.users WHERE email LIKE '%@securitytech.vn'
UNION ALL SELECT 'families', count(*) FROM public.families
UNION ALL SELECT 'expenses', count(*) FROM public.expenses
UNION ALL SELECT 'children', count(*) FROM public.children
UNION ALL SELECT 'elderly', count(*) FROM public.elderly_profiles
UNION ALL SELECT 'moments', count(*) FROM public.family_moments
UNION ALL SELECT 'food_items', count(*) FROM public.food_items WHERE name LIKE '[Pilot]%'
UNION ALL SELECT 'health_profiles', count(*) FROM public.health_profiles WHERE family_id IN (SELECT id FROM public.families LIMIT 1)
UNION ALL SELECT 'albums', count(*) FROM public.family_albums
UNION ALL SELECT 'security_requests', count(*) FROM public.security_requests
UNION ALL SELECT 'guard_shifts', count(*) FROM public.guard_shifts;
