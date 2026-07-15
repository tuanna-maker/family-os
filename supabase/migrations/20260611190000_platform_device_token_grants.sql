-- Bổ sung quyền cho Edge Function (service_role) đọc token khi dispatch push.

GRANT USAGE ON SCHEMA platform TO service_role;
GRANT SELECT ON platform.device_token TO service_role;

-- Idempotent: đảm bảo authenticated vẫn ghi được nếu bảng tồn tại từ trước migration RLS.
GRANT USAGE ON SCHEMA platform TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.device_token TO authenticated;
