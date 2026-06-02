
-- Create private bucket for security request attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'security-attachments',
  'security-attachments',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: is user the requester of the request id encoded in path (first folder)?
-- path format: <request_id>/<uuid>-<filename>

CREATE POLICY "sec_attach_insert_requester"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'security-attachments'
  AND EXISTS (
    SELECT 1 FROM public.security_requests sr
    WHERE sr.id::text = (storage.foldername(name))[1]
      AND sr.requester_id = auth.uid()
  )
);

CREATE POLICY "sec_attach_insert_security"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'security-attachments'
  AND (public.is_security_user(auth.uid()) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "sec_attach_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'security-attachments'
  AND (
    public.is_security_user(auth.uid())
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.security_requests sr
      WHERE sr.id::text = (storage.foldername(name))[1]
        AND sr.requester_id = auth.uid()
    )
  )
);

CREATE POLICY "sec_attach_delete_owner_or_security"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'security-attachments'
  AND (
    public.is_security_user(auth.uid())
    OR public.is_super_admin(auth.uid())
    OR owner = auth.uid()
  )
);
