
-- Family trips
CREATE TABLE public.family_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text,
  start_date date,
  end_date date,
  members_count int NOT NULL DEFAULT 1,
  budget_planned numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','upcoming','ongoing','done','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_trips_family ON public.family_trips(family_id, start_date DESC);

-- Trip items: checklist/packing/budget
CREATE TABLE public.family_trip_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.family_trips(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('checklist','packing','budget')),
  label text NOT NULL,
  assignee text,
  amount numeric(12,2),
  done boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_trip_items_trip ON public.family_trip_items(trip_id, kind, position);

ALTER TABLE public.family_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_trip_items ENABLE ROW LEVEL SECURITY;

-- Helper: is user member of a family (use existing pattern - family_members table assumed)
-- Policies based on family membership
CREATE POLICY "trips_select_member" ON public.family_trips FOR SELECT
USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_trips.family_id AND fm.user_id = auth.uid()));

CREATE POLICY "trips_insert_member" ON public.family_trips FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_trips.family_id AND fm.user_id = auth.uid()));

CREATE POLICY "trips_update_member" ON public.family_trips FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_trips.family_id AND fm.user_id = auth.uid()));

CREATE POLICY "trips_delete_owner" ON public.family_trips FOR DELETE
USING (EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_trips.family_id AND f.owner_id = auth.uid()));

CREATE POLICY "trip_items_select" ON public.family_trip_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.family_trips t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = family_trip_items.trip_id AND fm.user_id = auth.uid()));

CREATE POLICY "trip_items_insert" ON public.family_trip_items FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.family_trips t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = family_trip_items.trip_id AND fm.user_id = auth.uid()));

CREATE POLICY "trip_items_update" ON public.family_trip_items FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.family_trips t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = family_trip_items.trip_id AND fm.user_id = auth.uid()));

CREATE POLICY "trip_items_delete" ON public.family_trip_items FOR DELETE
USING (EXISTS (SELECT 1 FROM public.family_trips t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = family_trip_items.trip_id AND fm.user_id = auth.uid()));

CREATE TRIGGER trg_family_trips_updated BEFORE UPDATE ON public.family_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_family_trip_items_updated BEFORE UPDATE ON public.family_trip_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
