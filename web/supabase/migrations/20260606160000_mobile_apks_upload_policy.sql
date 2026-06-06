-- Cho phép upload/upsert APK vào bucket mobile-apks (tránh lỗi RLS khi gọi is_family_member).

DROP POLICY IF EXISTS "mobile_apks_insert" ON storage.objects;
DROP POLICY IF EXISTS "mobile_apks_update" ON storage.objects;
DROP POLICY IF EXISTS "mobile_apks_delete" ON storage.objects;

CREATE POLICY "mobile_apks_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mobile-apks');

CREATE POLICY "mobile_apks_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mobile-apks');

CREATE POLICY "mobile_apks_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'mobile-apks');
