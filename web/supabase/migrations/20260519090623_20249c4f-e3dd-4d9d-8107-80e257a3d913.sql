CREATE TABLE public.family_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  notes text,
  category text NOT NULL DEFAULT 'family',
  member_scope text NOT NULL DEFAULT 'all',
  member_name text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  remind_minutes_before integer,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_events_family_starts ON public.family_events(family_id, starts_at);

ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_events_select ON public.family_events FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY family_events_insert ON public.family_events FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY family_events_update ON public.family_events FOR UPDATE
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY family_events_delete ON public.family_events FOR DELETE
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));