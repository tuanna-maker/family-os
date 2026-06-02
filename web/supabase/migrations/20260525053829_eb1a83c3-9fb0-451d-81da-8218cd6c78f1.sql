
-- Moments
CREATE TABLE public.family_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  created_by uuid NOT NULL,
  caption text,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  thumbnail_url text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  tagged_member_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_moments_media_type_check CHECK (media_type IN ('image','video'))
);
CREATE INDEX idx_moments_family_taken ON public.family_moments(family_id, taken_at DESC);
ALTER TABLE public.family_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY moments_select ON public.family_moments FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY moments_insert ON public.family_moments FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);
CREATE POLICY moments_update ON public.family_moments FOR UPDATE
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY moments_delete ON public.family_moments FOR DELETE
  USING (auth.uid() = created_by OR is_family_owner(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER family_moments_updated_at BEFORE UPDATE ON public.family_moments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reactions
CREATE TABLE public.moment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id uuid NOT NULL REFERENCES public.family_moments(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (moment_id, user_id, emoji)
);
CREATE INDEX idx_reactions_moment ON public.moment_reactions(moment_id);
ALTER TABLE public.moment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reactions_select ON public.moment_reactions FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY reactions_insert ON public.moment_reactions FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = user_id);
CREATE POLICY reactions_delete ON public.moment_reactions FOR DELETE
  USING (auth.uid() = user_id OR is_family_owner(auth.uid(), family_id));

-- Comments
CREATE TABLE public.moment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id uuid NOT NULL REFERENCES public.family_moments(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_moment ON public.moment_comments(moment_id, created_at);
ALTER TABLE public.moment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select ON public.moment_comments FOR SELECT
  USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));
CREATE POLICY comments_insert ON public.moment_comments FOR INSERT
  WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = user_id);
CREATE POLICY comments_delete ON public.moment_comments FOR DELETE
  USING (auth.uid() = user_id OR is_family_owner(auth.uid(), family_id));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-moments', 'family-moments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "family_moments_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'family-moments');
CREATE POLICY "family_moments_user_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'family-moments' AND auth.uid() IS NOT NULL
              AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "family_moments_user_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'family-moments' AND auth.uid()::text = (storage.foldername(name))[1]);
