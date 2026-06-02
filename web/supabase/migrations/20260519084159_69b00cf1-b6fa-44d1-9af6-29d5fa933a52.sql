
CREATE OR REPLACE FUNCTION public.tick_reminder_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  now_vn timestamp;
  current_hhmm text;
  today_vn date;
BEGIN
  now_vn := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
  current_hhmm := to_char(now_vn, 'HH24:MI');
  today_vn := now_vn::date;

  -- Medicine reminders: time_of_day matches current HH:MM (VN time)
  WITH due_meds AS (
    SELECT mr.id, mr.family_id, mr.medicine, mr.member_name, mr.time_of_day, mr.dosage
    FROM medicine_reminders mr
    WHERE mr.active = true
      AND mr.time_of_day IS NOT NULL
      AND LEFT(mr.time_of_day, 5) = current_hhmm
  ),
  recipients AS (
    -- family owners
    SELECT m.id AS reminder_id, m.family_id, m.medicine, m.member_name, m.dosage, m.time_of_day,
           f.owner_id AS user_id
    FROM due_meds m
    JOIN families f ON f.id = m.family_id
    UNION
    -- explicit members
    SELECT m.id, m.family_id, m.medicine, m.member_name, m.dosage, m.time_of_day,
           ur.user_id
    FROM due_meds m
    JOIN user_roles ur ON ur.family_id = m.family_id
    WHERE ur.role IN ('family_owner','family_member')
  ),
  ins_meds AS (
    INSERT INTO notifications (user_id, family_id, type, ref_id, title, body, due_at, dedupe_key)
    SELECT
      user_id, family_id, 'medicine', reminder_id::text,
      'Đến giờ uống thuốc: ' || medicine,
      member_name || COALESCE(' · ' || dosage, '') || COALESCE(' · ' || time_of_day, ''),
      now(),
      'med:' || reminder_id::text || ':' || today_vn::text || ':' || COALESCE(time_of_day, '')
    FROM recipients
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins_meds;

  -- Parent reminders: remind_at <= now and not done
  WITH due_pr AS (
    SELECT pr.id, pr.family_id, pr.title, pr.remind_at, pr.notes
    FROM parent_reminders pr
    WHERE pr.done = false AND pr.remind_at <= now()
  ),
  recipients2 AS (
    SELECT p.id AS reminder_id, p.family_id, p.title, p.remind_at, p.notes,
           f.owner_id AS user_id
    FROM due_pr p JOIN families f ON f.id = p.family_id
    UNION
    SELECT p.id, p.family_id, p.title, p.remind_at, p.notes, ur.user_id
    FROM due_pr p
    JOIN user_roles ur ON ur.family_id = p.family_id
    WHERE ur.role IN ('family_owner','family_member')
  ),
  ins_pr AS (
    INSERT INTO notifications (user_id, family_id, type, ref_id, title, body, due_at, dedupe_key)
    SELECT
      user_id, family_id, 'parent_reminder', reminder_id::text,
      'Nhắc việc của con: ' || title,
      COALESCE(notes, ''),
      remind_at,
      'pr:' || reminder_id::text
    FROM recipients2
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT inserted_count + COUNT(*) INTO inserted_count FROM ins_pr;

  RETURN inserted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tick_reminder_notifications() FROM PUBLIC, anon, authenticated;
