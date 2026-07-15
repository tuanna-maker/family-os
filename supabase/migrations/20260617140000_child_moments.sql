-- Album khoảnh khắc riêng cho màn Đồng hành cùng con (không dùng family_moments).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'child-moments',
  'child-moments',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.child_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  caption text,
  media_url text NOT NULL,
  thumbnail_url text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_moments_family_child
  ON public.child_moments(family_id, child_id, taken_at DESC);

ALTER TABLE public.child_moments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS child_moments_select ON public.child_moments;
DROP POLICY IF EXISTS child_moments_insert ON public.child_moments;
DROP POLICY IF EXISTS child_moments_update ON public.child_moments;
DROP POLICY IF EXISTS child_moments_delete ON public.child_moments;

CREATE POLICY child_moments_select ON public.child_moments FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY child_moments_insert ON public.child_moments FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY child_moments_update ON public.child_moments FOR UPDATE
  USING (
    auth.uid() = created_by
    OR is_family_owner(auth.uid(), family_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY child_moments_delete ON public.child_moments FOR DELETE
  USING (
    auth.uid() = created_by
    OR is_family_owner(auth.uid(), family_id)
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS child_moments_storage_select ON storage.objects;
CREATE POLICY child_moments_storage_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'child-moments');

DROP POLICY IF EXISTS child_moments_storage_insert ON storage.objects;
CREATE POLICY child_moments_storage_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'child-moments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
