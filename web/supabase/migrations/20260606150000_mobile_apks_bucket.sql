-- Public bucket for mobile APK downloads (files > 25 MiB — không deploy qua Cloudflare Workers assets).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mobile-apks',
  'mobile-apks',
  true,
  104857600,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "mobile_apks_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mobile-apks');
