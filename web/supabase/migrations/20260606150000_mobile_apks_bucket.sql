-- Bucket APK mobile (private — Lovable workspace chặn public bucket).
-- Tải qua API /api/public/downloads/* → signed URL 10 phút.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mobile-apks',
  'mobile-apks',
  false,
  104857600,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Service role đọc qua signed URL; anon đọc qua API server (signed URL).
CREATE POLICY "mobile_apks_service_read"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'mobile-apks');
