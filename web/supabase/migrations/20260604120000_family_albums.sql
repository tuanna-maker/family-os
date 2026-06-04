-- Family albums + link moments to albums
CREATE TABLE public.family_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  cover_emoji text NOT NULL DEFAULT '📁',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_albums_family ON public.family_albums (family_id, created_at DESC);

ALTER TABLE public.family_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_albums_select ON public.family_albums
  FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY family_albums_insert ON public.family_albums
  FOR INSERT TO authenticated
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY family_albums_update ON public.family_albums
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY family_albums_delete ON public.family_albums
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER family_albums_updated_at
  BEFORE UPDATE ON public.family_albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.family_moments
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.family_albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moments_album ON public.family_moments (album_id) WHERE album_id IS NOT NULL;
