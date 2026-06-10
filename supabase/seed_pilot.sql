-- Script t?o tài kho?n Pilot (M?t kh?u: Demo@12345)
-- Vui l?ng copy và ch?y trong m?c SQL Editor trên trang qu?n tr? Supabase

DO $$
DECLARE
  uid_owner uuid;
  uid_member uuid;
  uid_sadmin uuid;
  uid_sstaff uuid;
  v_pass text := crypt('Demo@12345', gen_salt('bf'));
  v_family_id uuid;
BEGIN
  -- 1. Tài kho?n Family Owner
  SELECT id INTO uid_owner FROM auth.users WHERE email = 'giadinh@securitytech.vn';
  IF uid_owner IS NULL THEN
    uid_owner := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data)
    VALUES (uid_owner, 'giadinh@securitytech.vn', v_pass, now(), 'authenticated', 'authenticated', '{"provider":"email"}');
  ELSE
    UPDATE auth.users SET encrypted_password = v_pass, email_confirmed_at = now() WHERE id = uid_owner;
  END IF;

  -- 2. Tài kho?n Family Member
  SELECT id INTO uid_member FROM auth.users WHERE email = 'thanhvien@securitytech.vn';
  IF uid_member IS NULL THEN
    uid_member := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data)
    VALUES (uid_member, 'thanhvien@securitytech.vn', v_pass, now(), 'authenticated', 'authenticated', '{"provider":"email"}');
  ELSE
    UPDATE auth.users SET encrypted_password = v_pass, email_confirmed_at = now() WHERE id = uid_member;
  END IF;

  -- 3. Tài kho?n Guard Admin
  SELECT id INTO uid_sadmin FROM auth.users WHERE email = 'baove@securitytech.vn';
  IF uid_sadmin IS NULL THEN
    uid_sadmin := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data)
    VALUES (uid_sadmin, 'baove@securitytech.vn', v_pass, now(), 'authenticated', 'authenticated', '{"provider":"email"}');
  ELSE
    UPDATE auth.users SET encrypted_password = v_pass, email_confirmed_at = now() WHERE id = uid_sadmin;
  END IF;

  -- 4. Tài kho?n Guard Staff
  SELECT id INTO uid_sstaff FROM auth.users WHERE email = 'nhanvienbaove@securitytech.vn';
  IF uid_sstaff IS NULL THEN
    uid_sstaff := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data)
    VALUES (uid_sstaff, 'nhanvienbaove@securitytech.vn', v_pass, now(), 'authenticated', 'authenticated', '{"provider":"email"}');
  ELSE
    UPDATE auth.users SET encrypted_password = v_pass, email_confirmed_at = now() WHERE id = uid_sstaff;
  END IF;

  -- T?o Family n?u chýa có cho Owner
  SELECT id INTO v_family_id FROM public.families WHERE owner_id = uid_owner LIMIT 1;
  IF v_family_id IS NULL THEN
    INSERT INTO public.families (name, owner_id) VALUES ('Gia ð?nh Pilot', uid_owner) RETURNING id INTO v_family_id;
  END IF;

  -- Gán roles
  DELETE FROM public.user_roles WHERE user_id IN (uid_owner, uid_member, uid_sadmin, uid_sstaff);
  
  INSERT INTO public.user_roles (user_id, role, family_id) VALUES (uid_owner, 'family_owner', v_family_id);
  INSERT INTO public.user_roles (user_id, role, family_id) VALUES (uid_member, 'family_member', v_family_id);
  -- G?n project_id cho b?o v? (l?y project ??u tiên trong DB pilot)
  INSERT INTO public.user_roles (user_id, role, project_id, tenant_id)
  SELECT uid_sadmin, 'security_admin', p.id, p.tenant_id
  FROM public.projects p
  ORDER BY p.created_at NULLS LAST
  LIMIT 1;
  INSERT INTO public.user_roles (user_id, role, project_id, tenant_id)
  SELECT uid_sstaff, 'security_staff', p.id, p.tenant_id
  FROM public.projects p
  ORDER BY p.created_at NULLS LAST
  LIMIT 1;

END $$;
