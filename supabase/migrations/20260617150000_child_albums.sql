-- Album khoảnh khắc theo từng bé (màn Đồng hành cùng con).

CREATE TABLE IF NOT EXISTS public.child_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  cover_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_albums_family_child
  ON public.child_albums(family_id, child_id, created_at DESC);

ALTER TABLE public.child_moments
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.child_albums(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_child_moments_album
  ON public.child_moments(album_id, taken_at DESC);

ALTER TABLE public.child_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS child_albums_select ON public.child_albums;
DROP POLICY IF EXISTS child_albums_insert ON public.child_albums;
DROP POLICY IF EXISTS child_albums_update ON public.child_albums;
DROP POLICY IF EXISTS child_albums_delete ON public.child_albums;

CREATE POLICY child_albums_select ON public.child_albums FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY child_albums_insert ON public.child_albums FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY child_albums_update ON public.child_albums FOR UPDATE
  USING (
    auth.uid() = created_by
    OR is_family_owner(auth.uid(), family_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY child_albums_delete ON public.child_albums FOR DELETE
  USING (
    auth.uid() = created_by
    OR is_family_owner(auth.uid(), family_id)
    OR is_super_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_moments TO authenticated;

NOTIFY pgrst, 'reload schema';
