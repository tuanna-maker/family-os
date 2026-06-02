
CREATE TABLE public.family_helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  phone text,
  id_number text,
  hometown text,
  avatar text DEFAULT '🧑‍🍳',
  salary numeric(12,2) NOT NULL DEFAULT 0,
  start_date date,
  rating numeric(2,1) DEFAULT 5.0,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_helpers_family ON public.family_helpers(family_id);

CREATE TABLE public.family_helper_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.family_helpers(id) ON DELETE CASCADE,
  title text NOT NULL,
  time text,
  icon text DEFAULT '📝',
  done boolean NOT NULL DEFAULT false,
  task_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_helper_tasks ON public.family_helper_tasks(helper_id, task_date);

CREATE TABLE public.family_helper_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.family_helpers(id) ON DELETE CASCADE,
  att_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','leave','absent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(helper_id, att_date)
);

CREATE TABLE public.family_helper_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.family_helpers(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_helper_payments ON public.family_helper_payments(helper_id);

CREATE TABLE public.family_helper_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.family_helpers(id) ON DELETE CASCADE,
  title text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_helper_activity ON public.family_helper_activity(helper_id, created_at DESC);

ALTER TABLE public.family_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_helper_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_helper_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_helper_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_helper_activity ENABLE ROW LEVEL SECURITY;

-- helpers: by family membership
CREATE POLICY "h_sel" ON public.family_helpers FOR SELECT
USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_helpers.family_id AND fm.user_id = auth.uid()));
CREATE POLICY "h_ins" ON public.family_helpers FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_helpers.family_id AND fm.user_id = auth.uid()));
CREATE POLICY "h_upd" ON public.family_helpers FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_helpers.family_id AND fm.user_id = auth.uid()));
CREATE POLICY "h_del" ON public.family_helpers FOR DELETE
USING (EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_helpers.family_id AND f.owner_id = auth.uid()));

-- Children: by helper -> family membership
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['family_helper_tasks','family_helper_attendance','family_helper_payments','family_helper_activity'] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_sel" ON public.%1$I FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.family_helpers h JOIN public.family_members fm ON fm.family_id = h.family_id WHERE h.id = %1$I.helper_id AND fm.user_id = auth.uid()));
      CREATE POLICY "%1$s_ins" ON public.%1$I FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.family_helpers h JOIN public.family_members fm ON fm.family_id = h.family_id WHERE h.id = %1$I.helper_id AND fm.user_id = auth.uid()));
      CREATE POLICY "%1$s_upd" ON public.%1$I FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.family_helpers h JOIN public.family_members fm ON fm.family_id = h.family_id WHERE h.id = %1$I.helper_id AND fm.user_id = auth.uid()));
      CREATE POLICY "%1$s_del" ON public.%1$I FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.family_helpers h JOIN public.family_members fm ON fm.family_id = h.family_id WHERE h.id = %1$I.helper_id AND fm.user_id = auth.uid()));
    $f$, t);
  END LOOP;
END $$;

CREATE TRIGGER trg_family_helpers_updated BEFORE UPDATE ON public.family_helpers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
