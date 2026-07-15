-- Chat inbox + profile: ưu tiên avatar cá nhân, fallback ảnh gia đình.

CREATE OR REPLACE FUNCTION public.list_guard_security_chat_inbox()
RETURNS TABLE (
  resident_user_id uuid,
  resident_name text,
  resident_avatar_url text,
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
      AND NOT public.is_legacy_security_chat_auto_reply(m.body, m.sender_role)
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
    COALESCE(pr.avatar_url, f.avatar_url),
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

GRANT EXECUTE ON FUNCTION public.list_guard_security_chat_inbox() TO authenticated;
