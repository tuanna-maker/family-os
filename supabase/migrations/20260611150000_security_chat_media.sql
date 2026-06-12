-- Tin nhắn đa phương tiện: ảnh, ghi âm, emoji (text)

ALTER TABLE public.security_chat_messages
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_duration_ms integer;

UPDATE public.security_chat_messages
SET message_type = 'text'
WHERE message_type IS NULL;

ALTER TABLE public.security_chat_messages
  ALTER COLUMN message_type SET DEFAULT 'text',
  ALTER COLUMN message_type SET NOT NULL;

ALTER TABLE public.security_chat_messages
  DROP CONSTRAINT IF EXISTS security_chat_messages_body_check;

ALTER TABLE public.security_chat_messages
  ADD CONSTRAINT security_chat_messages_body_check
  CHECK (char_length(body) <= 2000);

ALTER TABLE public.security_chat_messages
  DROP CONSTRAINT IF EXISTS security_chat_messages_content_check;

ALTER TABLE public.security_chat_messages
  ADD CONSTRAINT security_chat_messages_content_check
  CHECK (
    trim(body) <> ''
    OR media_url IS NOT NULL
  );

ALTER TABLE public.security_chat_messages
  DROP CONSTRAINT IF EXISTS security_chat_messages_message_type_check;

ALTER TABLE public.security_chat_messages
  ADD CONSTRAINT security_chat_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'audio', 'emoji'));

-- Bucket lưu ảnh / ghi âm chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'security-chat',
  'security-chat',
  true,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS security_chat_storage_select ON storage.objects;
CREATE POLICY security_chat_storage_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'security-chat');

DROP POLICY IF EXISTS security_chat_storage_insert ON storage.objects;
CREATE POLICY security_chat_storage_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'security-chat'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inbox preview: [Ảnh] / [Ghi âm]
CREATE OR REPLACE FUNCTION public.security_chat_preview_body(_body text, _message_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _message_type = 'image' THEN '[Ảnh]'
    WHEN _message_type = 'audio' THEN '[Ghi âm]'
    ELSE COALESCE(NULLIF(trim(_body), ''), '[Tin nhắn]')
  END;
$$;

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
      m.message_type,
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
    public.security_chat_preview_body(l.body, l.message_type),
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
