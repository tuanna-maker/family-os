
ALTER TABLE public.medical_appointments
  ADD COLUMN IF NOT EXISTS remind_hours_before integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appts_remind
  ON public.medical_appointments(scheduled_at)
  WHERE status = 'planned' AND reminded_at IS NULL AND remind_hours_before IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tick_reminder_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'platform'
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

  -- ===== MEDICINE REMINDERS =====
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
  ),
  ins_outbox_med AS (
    INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
    SELECT DISTINCT 'medicine_reminder', reminder_id::text, 'medicine.reminder',
           jsonb_build_object(
             'reminder_id', reminder_id,
             'family_id', family_id,
             'medicine', medicine,
             'member_name', member_name,
             'dosage', dosage,
             'time_of_day', time_of_day,
             'date', today_vn
           ),
           'P1'
    FROM filtered_meds
    RETURNING 1
  ),
  ins_fcm_med AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key)
    SELECT user_id, family_id, 'fcm', 'P1', 'medicine.reminder',
      'Đến giờ uống thuốc: ' || medicine,
      member_name || COALESCE(' · ' || dosage, '') || COALESCE(' · ' || time_of_day, ''),
      jsonb_build_object(
        'aggregate_id', reminder_id,
        'reminder_id', reminder_id,
        'family_id', family_id,
        'time_of_day', time_of_day,
        'date', today_vn
      ),
      'med:' || reminder_id::text || ':' || today_vn::text || ':' || COALESCE(time_of_day, '')
    FROM filtered_meds
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count
  FROM (SELECT 1 FROM ins_meds UNION ALL SELECT 1 FROM ins_outbox_med UNION ALL SELECT 1 FROM ins_fcm_med) t;

  -- ===== PARENT REMINDERS =====
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
  ),
  ins_outbox_pr AS (
    INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
    SELECT DISTINCT 'parent_reminder', reminder_id::text, 'parent_reminder.due',
           jsonb_build_object(
             'reminder_id', reminder_id,
             'family_id', family_id,
             'title', title,
             'remind_at', remind_at
           ),
           'P1'
    FROM filtered_pr
    RETURNING 1
  ),
  ins_fcm_pr AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key)
    SELECT user_id, family_id, 'fcm', 'P1', 'parent_reminder.due',
      'Nhắc việc của con: ' || title,
      COALESCE(notes, ''),
      jsonb_build_object(
        'aggregate_id', reminder_id,
        'reminder_id', reminder_id,
        'family_id', family_id,
        'remind_at', remind_at
      ),
      'pr:' || reminder_id::text
    FROM filtered_pr
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT inserted_count + COUNT(*) INTO inserted_count
  FROM (SELECT 1 FROM ins_pr UNION ALL SELECT 1 FROM ins_outbox_pr UNION ALL SELECT 1 FROM ins_fcm_pr) t;

  -- ===== MEDICAL APPOINTMENTS (nhắc trước N giờ) =====
  WITH due_appts AS (
    SELECT a.id, a.family_id, a.member_name, a.doctor, a.location, a.scheduled_at, a.notes,
           a.remind_hours_before
    FROM medical_appointments a
    WHERE a.status = 'planned'
      AND a.reminded_at IS NULL
      AND a.remind_hours_before IS NOT NULL
      AND now() >= a.scheduled_at - (a.remind_hours_before || ' hours')::interval
      AND a.scheduled_at >= now() - interval '1 hour'
  ),
  recipients3 AS (
    SELECT d.id AS appt_id, d.family_id, d.member_name, d.doctor, d.location, d.scheduled_at, d.notes,
           f.owner_id AS user_id
    FROM due_appts d JOIN families f ON f.id = d.family_id
    UNION
    SELECT d.id, d.family_id, d.member_name, d.doctor, d.location, d.scheduled_at, d.notes, ur.user_id
    FROM due_appts d
    JOIN user_roles ur ON ur.family_id = d.family_id
    WHERE ur.role IN ('family_owner','family_member')
  ),
  filtered_appts AS (
    SELECT r.* FROM recipients3 r
    LEFT JOIN notification_preferences np ON np.user_id = r.user_id
    WHERE current_hhmm >= COALESCE(np.quiet_start, '07:00')
      AND current_hhmm <= COALESCE(np.quiet_end, '22:00')
  ),
  ins_appt AS (
    INSERT INTO notifications (user_id, family_id, type, ref_id, title, body, due_at, dedupe_key)
    SELECT user_id, family_id, 'medical_appointment', appt_id::text,
      'Lịch khám sắp tới: ' || member_name,
      COALESCE(doctor, 'Khám tổng quát') || ' · ' || to_char(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM') || COALESCE(' · ' || location, ''),
      scheduled_at,
      'appt:' || appt_id::text
    FROM filtered_appts
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  ),
  ins_outbox_appt AS (
    INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
    SELECT DISTINCT 'medical_appointment', appt_id::text, 'medical_appointment.upcoming',
           jsonb_build_object(
             'appointment_id', appt_id,
             'family_id', family_id,
             'member_name', member_name,
             'doctor', doctor,
             'location', location,
             'scheduled_at', scheduled_at
           ),
           'P1'
    FROM filtered_appts
    RETURNING 1
  ),
  ins_fcm_appt AS (
    INSERT INTO platform.notification(user_id, household_id, channel, priority, topic, title, body, data, dedupe_key)
    SELECT user_id, family_id, 'fcm', 'P1', 'medical_appointment.upcoming',
      'Lịch khám sắp tới: ' || member_name,
      COALESCE(doctor, 'Khám tổng quát') || ' · ' || to_char(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM') || COALESCE(' · ' || location, ''),
      jsonb_build_object(
        'aggregate_id', appt_id,
        'appointment_id', appt_id,
        'family_id', family_id,
        'scheduled_at', scheduled_at
      ),
      'appt:' || appt_id::text
    FROM filtered_appts
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  ),
  mark_reminded AS (
    UPDATE medical_appointments SET reminded_at = now()
    WHERE id IN (SELECT DISTINCT appt_id FROM filtered_appts)
    RETURNING 1
  )
  SELECT inserted_count + COUNT(*) INTO inserted_count
  FROM (SELECT 1 FROM ins_appt UNION ALL SELECT 1 FROM ins_outbox_appt UNION ALL SELECT 1 FROM ins_fcm_appt UNION ALL SELECT 1 FROM mark_reminded) t;

  RETURN inserted_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.tick_reminder_notifications() FROM PUBLIC, anon, authenticated;
