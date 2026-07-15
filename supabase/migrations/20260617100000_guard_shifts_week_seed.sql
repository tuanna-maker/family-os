-- Ca trực tuần 16–22/06/2026 cho nhân viên bảo vệ demo (nhanvienbaove@securitytech.vn)

WITH guard_ctx AS (
  SELECT
    u.id AS guard_id,
    ur.project_id
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE lower(u.email) = lower('nhanvienbaove@securitytech.vn')
    AND ur.role = 'security_staff'::public.app_role
  ORDER BY ur.project_id NULLS LAST
  LIMIT 1
),
planned(shift_date, shift_type, start_at, end_at) AS (
  VALUES
    ('2026-06-16'::date, 'morning',   timestamptz '2026-06-16 06:00:00+07', timestamptz '2026-06-16 14:00:00+07'),
    ('2026-06-17'::date, 'afternoon', timestamptz '2026-06-17 14:00:00+07', timestamptz '2026-06-17 22:00:00+07'),
    ('2026-06-18'::date, 'night',     timestamptz '2026-06-18 22:00:00+07', timestamptz '2026-06-19 06:00:00+07'),
    ('2026-06-19'::date, 'morning',   timestamptz '2026-06-19 06:00:00+07', timestamptz '2026-06-19 14:00:00+07'),
    ('2026-06-21'::date, 'afternoon', timestamptz '2026-06-21 14:00:00+07', timestamptz '2026-06-21 22:00:00+07')
)
INSERT INTO public.guard_shifts (guard_id, project_id, shift_date, shift_type, start_at, end_at, status)
SELECT
  gc.guard_id,
  gc.project_id,
  p.shift_date,
  p.shift_type,
  p.start_at,
  p.end_at,
  'scheduled'
FROM planned p
CROSS JOIN guard_ctx gc
WHERE gc.guard_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.guard_shifts gs
    WHERE gs.guard_id = gc.guard_id
      AND gs.shift_date = p.shift_date
      AND gs.shift_type::text = p.shift_type
  );
