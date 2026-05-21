
-- ============ HEALTH ============
CREATE TABLE public.health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_id uuid,
  name text NOT NULL,
  dob date,
  blood_type text,
  allergies text,
  conditions text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.medicine_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_name text NOT NULL,
  medicine text NOT NULL,
  dosage text,
  time_of_day text,
  days_of_week text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_reminders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.medical_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_name text NOT NULL,
  doctor text,
  location text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_appointments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_name text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  value text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- ============ CHILDREN ============
CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  name text NOT NULL,
  dob date,
  school text,
  grade text,
  avatar text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL,
  day_of_week int NOT NULL,
  subject text NOT NULL,
  time_start text,
  time_end text,
  room text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.school_schedules ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.homeworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL,
  title text NOT NULL,
  kind text,
  earned_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid,
  title text NOT NULL,
  remind_at timestamptz NOT NULL,
  done boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_reminders ENABLE ROW LEVEL SECURITY;

-- ============ FOOD ============
CREATE TABLE public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  qty numeric,
  unit text,
  location text,
  expires_on date,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  name text NOT NULL,
  qty numeric,
  unit text,
  category text,
  purchased boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- Helper: same family-member policy set per table
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'health_profiles','medicine_reminders','medical_appointments','health_records',
    'children','school_schedules','homeworks','achievements','parent_reminders',
    'food_items','shopping_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT
        USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
      CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT
        WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
      CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE
        USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
      CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE
        USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
    $f$, t);
  END LOOP;
END$$;

-- Indexes
CREATE INDEX idx_health_profiles_family ON public.health_profiles(family_id);
CREATE INDEX idx_medicine_family ON public.medicine_reminders(family_id);
CREATE INDEX idx_appointments_family ON public.medical_appointments(family_id, scheduled_at);
CREATE INDEX idx_health_records_family ON public.health_records(family_id, recorded_at);
CREATE INDEX idx_children_family ON public.children(family_id);
CREATE INDEX idx_school_child ON public.school_schedules(child_id, day_of_week);
CREATE INDEX idx_homework_child ON public.homeworks(child_id, due_date);
CREATE INDEX idx_achievements_child ON public.achievements(child_id);
CREATE INDEX idx_parent_reminders_family ON public.parent_reminders(family_id, remind_at);
CREATE INDEX idx_food_family ON public.food_items(family_id, expires_on);
CREATE INDEX idx_shopping_family ON public.shopping_items(family_id);
