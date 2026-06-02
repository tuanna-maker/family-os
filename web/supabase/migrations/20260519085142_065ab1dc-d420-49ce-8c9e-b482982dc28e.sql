
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  medicine_enabled boolean NOT NULL DEFAULT true,
  parent_reminder_enabled boolean NOT NULL DEFAULT true,
  quiet_start text NOT NULL DEFAULT '07:00',
  quiet_end text NOT NULL DEFAULT '22:00',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_select_self" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE POLICY "np_insert_self" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np_update_self" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "np_delete_self" ON public.notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Update the tick function to respect preferences
CREATE OR REPLACE FUNCTION public.tick_reminder_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count integer := 0;
  now_vn timestamp;
  current_hhmm text;
  today_vn date;
BEGIN
  now_vn := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
  current_hhmm := to_char(now_vn, 'HH24:MI');
  today_vn := now_vn::date;

  WITH due_meds AS (
    SELECT mr.id, mr.family_id, mr.medicine, mr.member_name, mr.time_of_day, mr.dosage
    FROM medicine_reminders mr
    WHERE mr.active = true
      AND mr.time_of_day IS NOT NULL
      AND LEFT(mr.time_of_day, 5) = current_hhmm
  ),
  recipients AS (
    SELECT m.id AS reminder_id, m.family_id, m.medicine, m.member_name, m.dosage, m.time_of_day,
           f.owner_id AS user_id
    FROM due_meds m JOIN families f ON f.id = m.family_id
    UNION
    SELECT m.id, m.family_id, m.medicine, m.member_name, m.dosage, m.time_of_day, ur.user_id
    FROM due_meds m
    JOIN user_roles ur ON ur.family_id = m.family_id
    WHERE ur.role IN ('family_owner','family_member')
  ),
  filtered_meds AS (
    SELECT r.* FROM recipients r
    LEFT JOIN notification_preferences np ON np.user_id = r.user_id
    WHERE COALESCE(np.medicine_enabled, true) = true
      AND current_hhmm >= COALESCE(np.quiet_start, '07:00')
      AND current_hhmm <= COALESCE(np.quiet_end, '22:00')
  ),
  ins_meds AS (
    INSERT INTO notifications (user_id, family_id, type, ref_id, title, body, due_at, dedupe_key)
    SELECT user_id, family_id, 'medicine', reminder_id::text,
      'Đến giờ uống thuốc: ' || medicine,
      member_name || COALESCE(' · ' || dosage, '') || COALESCE(' · ' || time_of_day, ''),
      now(),
      'med:' || reminder_id::text || ':' || today_vn::text || ':' || COALESCE(time_of_day, '')
    FROM filtered_meds
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins_meds;

  WITH due_pr AS (
    SELECT pr.id, pr.family_id, pr.title, pr.remind_at, pr.notes
    FROM parent_reminders pr
    WHERE pr.done = false AND pr.remind_at <= now()
  ),
  recipients2 AS (
    SELECT p.id AS reminder_id, p.family_id, p.title, p.remind_at, p.notes, f.owner_id AS user_id
    FROM due_pr p JOIN families f ON f.id = p.family_id
    UNION
    SELECT p.id, p.family_id, p.title, p.remind_at, p.notes, ur.user_id
    FROM due_pr p JOIN user_roles ur ON ur.family_id = p.family_id
    WHERE ur.role IN ('family_owner','family_member')
  ),
  filtered_pr AS (
    SELECT r.* FROM recipients2 r
    LEFT JOIN notification_preferences np ON np.user_id = r.user_id
    WHERE COALESCE(np.parent_reminder_enabled, true) = true
      AND current_hhmm >= COALESCE(np.quiet_start, '07:00')
      AND current_hhmm <= COALESCE(np.quiet_end, '22:00')
  ),
  ins_pr AS (
    INSERT INTO notifications (user_id, family_id, type, ref_id, title, body, due_at, dedupe_key)
    SELECT user_id, family_id, 'parent_reminder', reminder_id::text,
      'Nhắc việc của con: ' || title,
      COALESCE(notes, ''), remind_at,
      'pr:' || reminder_id::text
    FROM filtered_pr
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT inserted_count + COUNT(*) INTO inserted_count FROM ins_pr;

  RETURN inserted_count;
END;
$function$;
