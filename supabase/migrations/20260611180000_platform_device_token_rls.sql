-- Cho phép app mobile lưu Expo Push token (platform.device_token).

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.device_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,
  app text NOT NULL CHECK (app IN ('family', 'guard', 'web')),
  device_id text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_token_user_token_uidx UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS device_token_user_app_idx
  ON platform.device_token (user_id, app, last_seen_at DESC);

ALTER TABLE platform.device_token ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_token_select_self ON platform.device_token;
CREATE POLICY device_token_select_self ON platform.device_token
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS device_token_insert_self ON platform.device_token;
CREATE POLICY device_token_insert_self ON platform.device_token
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS device_token_update_self ON platform.device_token;
CREATE POLICY device_token_update_self ON platform.device_token
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS device_token_delete_self ON platform.device_token;
CREATE POLICY device_token_delete_self ON platform.device_token
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA platform TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.device_token TO authenticated;
