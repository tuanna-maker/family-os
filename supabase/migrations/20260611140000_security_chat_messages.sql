-- Chat cư dân ↔ bảo an (realtime qua Supabase)
-- Tương thích DB chưa có user_roles.project_id hoặc RPC resolve_user_primary_apartment cũ.

-- Cột project_id trên user_roles (nếu migration SaaS chưa chạy)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'user_roles_project_id_fkey' AND table_name = 'user_roles'
    ) THEN
      ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'user_roles_tenant_id_fkey' AND table_name = 'user_roles'
    ) THEN
      ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.security_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('resident', 'guard', 'system')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bổ sung cột nếu bảng đã tạo từ lần chạy migration trước (schema cũ / thiếu cột)
ALTER TABLE public.security_chat_messages
  ADD COLUMN IF NOT EXISTS family_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS sender_role text,
  ADD COLUMN IF NOT EXISTS sender_id uuid,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'families') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'security_chat_messages_family_id_fkey'
        AND table_name = 'security_chat_messages'
    ) THEN
      ALTER TABLE public.security_chat_messages
        ADD CONSTRAINT security_chat_messages_family_id_fkey
        FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE SET NULL;
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'security_chat_messages_sender_id_fkey'
      AND table_name = 'security_chat_messages'
  ) THEN
    ALTER TABLE public.security_chat_messages
      ADD CONSTRAINT security_chat_messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'security_chat_messages_project_id_fkey'
        AND table_name = 'security_chat_messages'
    ) THEN
      ALTER TABLE public.security_chat_messages
        ADD CONSTRAINT security_chat_messages_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_security_chat_user_created
  ON public.security_chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_chat_project_created
  ON public.security_chat_messages(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.security_chat_reads (
  guard_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guard_id, resident_user_id)
);

ALTER TABLE public.security_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_chat_reads ENABLE ROW LEVEL SECURITY;

-- Dự án bảo vệ được phép xem: từ guard_shifts + user_roles (không bắt buộc user_roles.project_id)
CREATE OR REPLACE FUNCTION public.guard_project_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT src.pid
  FROM (
    SELECT gs.project_id AS pid
    FROM public.guard_shifts gs
    WHERE gs.guard_id = _user_id
      AND gs.project_id IS NOT NULL
    UNION ALL
    SELECT ur.project_id AS pid
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
      AND ur.project_id IS NOT NULL
    UNION ALL
    SELECT p.id AS pid
    FROM public.user_roles ur
    JOIN public.projects p ON p.tenant_id = ur.tenant_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('security_admin'::public.app_role, 'security_staff'::public.app_role)
      AND ur.tenant_id IS NOT NULL
      AND ur.project_id IS NULL
  ) src
  WHERE src.pid IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.security_chat_resolve_project(_user_id uuid, _family_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT a.project_id
      FROM public.apartment_residents ar
      JOIN public.apartments a ON a.id = ar.apartment_id
      WHERE ar.move_out_date IS NULL
        AND ar.family_id = _family_id
      ORDER BY ar.is_primary DESC, ar.move_in_date DESC
      LIMIT 1
    ),
    (
      SELECT a.project_id
      FROM public.apartment_residents ar
      JOIN public.apartments a ON a.id = ar.apartment_id
      WHERE ar.move_out_date IS NULL
        AND (
          public.is_family_member(_user_id, ar.family_id)
          OR EXISTS (
            SELECT 1 FROM public.families f
            WHERE f.id = ar.family_id AND f.owner_id = _user_id
          )
        )
      ORDER BY ar.is_primary DESC, ar.move_in_date DESC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.security_chat_set_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    NEW.project_id := public.security_chat_resolve_project(NEW.user_id, NEW.family_id);
  END IF;
  IF NEW.sender_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.sender_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS security_chat_set_project_trg ON public.security_chat_messages;
CREATE TRIGGER security_chat_set_project_trg
  BEFORE INSERT ON public.security_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.security_chat_set_project();

DROP POLICY IF EXISTS security_chat_select ON public.security_chat_messages;
CREATE POLICY security_chat_select ON public.security_chat_messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_super_admin(auth.uid())
    OR (
      public.is_security_user(auth.uid())
      AND (
        project_id IS NULL
        OR project_id IN (SELECT public.guard_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS security_chat_insert_resident ON public.security_chat_messages;
CREATE POLICY security_chat_insert_resident ON public.security_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND sender_role = 'resident'
    AND (sender_id IS NULL OR sender_id = auth.uid())
  );

DROP POLICY IF EXISTS security_chat_insert_guard ON public.security_chat_messages;
CREATE POLICY security_chat_insert_guard ON public.security_chat_messages
  FOR INSERT
  WITH CHECK (
    public.is_security_user(auth.uid())
    AND sender_role = 'guard'
    AND (sender_id IS NULL OR sender_id = auth.uid())
    AND user_id IS NOT NULL
    AND user_id <> auth.uid()
    AND (
      project_id IS NULL
      OR project_id IN (SELECT public.guard_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS security_chat_reads_self ON public.security_chat_reads;
CREATE POLICY security_chat_reads_self ON public.security_chat_reads
  FOR ALL
  USING (guard_id = auth.uid())
  WITH CHECK (guard_id = auth.uid());

GRANT SELECT, INSERT ON public.security_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.security_chat_reads TO authenticated;

CREATE OR REPLACE FUNCTION public.list_guard_security_chat_inbox()
RETURNS TABLE (
  resident_user_id uuid,
  resident_name text,
  unit_label text,
  family_id uuid,
  last_body text,
  last_sender_role text,
  last_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard_projects AS (
    SELECT public.guard_project_ids(auth.uid()) AS project_id
  ),
  latest AS (
    SELECT DISTINCT ON (m.user_id)
      m.user_id,
      m.family_id,
      m.body,
      m.sender_role,
      m.created_at
    FROM public.security_chat_messages m
    WHERE public.is_security_user(auth.uid())
      AND (
        m.project_id IS NULL
        OR m.project_id IN (SELECT gp.project_id FROM guard_projects gp)
        OR NOT EXISTS (SELECT 1 FROM guard_projects gp WHERE gp.project_id IS NOT NULL)
      )
    ORDER BY m.user_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.user_id, count(*)::bigint AS cnt
    FROM public.security_chat_messages m
    LEFT JOIN public.security_chat_reads r
      ON r.guard_id = auth.uid() AND r.resident_user_id = m.user_id
    WHERE m.sender_role = 'resident'
      AND m.created_at > COALESCE(r.last_read_at, '-infinity'::timestamptz)
      AND public.is_security_user(auth.uid())
      AND (
        m.project_id IS NULL
        OR m.project_id IN (SELECT gp.project_id FROM guard_projects gp)
        OR NOT EXISTS (SELECT 1 FROM guard_projects gp WHERE gp.project_id IS NOT NULL)
      )
    GROUP BY m.user_id
  )
  SELECT
    l.user_id,
    COALESCE(pr.full_name, 'Cư dân'),
    COALESCE(NULLIF(trim(f.apartment), ''), apt.code, ''),
    l.family_id,
    l.body,
    l.sender_role,
    l.created_at,
    COALESCE(u.cnt, 0)
  FROM latest l
  LEFT JOIN public.profiles pr ON pr.id = l.user_id
  LEFT JOIN public.families f ON f.id = l.family_id
  LEFT JOIN LATERAL (
    SELECT a.code
    FROM public.apartment_residents ar
    JOIN public.apartments a ON a.id = ar.apartment_id
    WHERE ar.family_id = l.family_id
      AND ar.move_out_date IS NULL
    ORDER BY ar.is_primary DESC, ar.move_in_date DESC
    LIMIT 1
  ) apt ON true
  LEFT JOIN unread u ON u.user_id = l.user_id
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_guard_security_chat_inbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_project_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.security_chat_resolve_project(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'security_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.security_chat_messages;
  END IF;
END $$;

ALTER TABLE public.security_chat_messages REPLICA IDENTITY FULL;
