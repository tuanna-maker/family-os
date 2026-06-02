
-- =====================================================
-- WAVE 1 — FOUNDATION
-- =====================================================

-- 1. CREATE 7 DOMAIN SCHEMAS
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS household;
CREATE SCHEMA IF NOT EXISTS care;
CREATE SCHEMA IF NOT EXISTS secops;
CREATE SCHEMA IF NOT EXISTS memories;
CREATE SCHEMA IF NOT EXISTS community;
CREATE SCHEMA IF NOT EXISTS platform;

-- Grant USAGE so authenticated users can call functions in these schemas
GRANT USAGE ON SCHEMA identity, household, care, secops, memories, community, platform
  TO authenticated, anon, service_role;

-- =====================================================
-- 2. PLATFORM TABLES
-- =====================================================

-- 2.1 audit_log — append-only
CREATE TABLE platform.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid,
  actor_role      text,
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     text,
  household_id    uuid,
  tenant_id       uuid,
  before_data     jsonb,
  after_data      jsonb,
  reason          text,
  ip              inet,
  user_agent      text,
  request_id      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_actor ON platform.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON platform.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_household ON platform.audit_log(household_id, created_at DESC) WHERE household_id IS NOT NULL;
CREATE INDEX idx_audit_log_created ON platform.audit_log(created_at DESC);

-- 2.2 outbox
CREATE TABLE platform.outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority        text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispatching','dispatched','failed','dead')),
  attempts        int  NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  dispatched_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_dispatch ON platform.outbox(status, priority, next_attempt_at) WHERE status IN ('pending','failed');
CREATE INDEX idx_outbox_aggregate ON platform.outbox(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_event_type ON platform.outbox(event_type, created_at DESC);

-- 2.3 outbox_dlq (dead letter queue)
CREATE TABLE platform.outbox_dlq (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id     uuid NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  priority        text NOT NULL,
  attempts        int  NOT NULL,
  last_error      text,
  failed_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_dlq_failed ON platform.outbox_dlq(failed_at DESC);

-- 2.4 notification
CREATE TABLE platform.notification (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  household_id    uuid,
  channel         text NOT NULL CHECK (channel IN ('fcm','sms','zalo','in_app','email')),
  priority        text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2')),
  topic           text NOT NULL,
  title           text NOT NULL,
  body            text,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key      text,
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  failed_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX idx_notification_user ON platform.notification(user_id, created_at DESC);
CREATE INDEX idx_notification_unread ON platform.notification(user_id, status) WHERE status IN ('queued','sent','delivered');
CREATE INDEX idx_notification_queue ON platform.notification(status, priority, created_at) WHERE status = 'queued';

-- 2.5 feature_flag
CREATE TABLE platform.feature_flag (
  key             text PRIMARY KEY,
  description     text,
  enabled_global  boolean NOT NULL DEFAULT false,
  enabled_for_tenants  uuid[] NOT NULL DEFAULT '{}',
  enabled_for_households uuid[] NOT NULL DEFAULT '{}',
  rollout_percent int NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  is_public       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_feature_flag_updated
  BEFORE UPDATE ON platform.feature_flag
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. RLS — DENY BY DEFAULT, EXPLICIT POLICIES
-- =====================================================

ALTER TABLE platform.audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox        ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_dlq    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.notification  ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.feature_flag  ENABLE ROW LEVEL SECURITY;

-- audit_log: only admins can READ; nobody can UPDATE/DELETE (no policy => denied)
CREATE POLICY audit_log_admin_read ON platform.audit_log
  FOR SELECT TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- (intentionally no INSERT/UPDATE/DELETE policies — only service_role can write)

-- outbox & outbox_dlq: service_role only (no policies for authenticated)
-- notification: user reads own; service_role writes
CREATE POLICY notification_own_read ON platform.notification
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_own_update_read_status ON platform.notification
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- feature_flag: public flags readable by anyone authenticated; admins manage
CREATE POLICY feature_flag_public_read ON platform.feature_flag
  FOR SELECT TO authenticated
  USING (is_public = true OR public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY feature_flag_admin_write ON platform.feature_flag
  FOR ALL TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_saas_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- =====================================================
-- 4. CROSS-SCHEMA HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- 4.1 platform.has_role — wrapper to use from any schema
CREATE OR REPLACE FUNCTION platform.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4.2 household.is_member — bridge to legacy public.is_family_member
CREATE OR REPLACE FUNCTION household.is_member(_user_id uuid, _household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_family_member(_user_id, _household_id);
$$;

-- 4.3 care.has_active_sos_override — placeholder, activated in Wave 2
CREATE OR REPLACE FUNCTION care.has_active_sos_override(_user_id uuid, _household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Wave 2 will replace this with real check against care.sos_event
  SELECT false;
$$;

-- =====================================================
-- 5. AUDIT LOG HELPER (for server functions to call)
-- =====================================================

CREATE OR REPLACE FUNCTION platform.write_audit(
  _action text,
  _resource_type text,
  _resource_id text,
  _household_id uuid DEFAULT NULL,
  _before jsonb DEFAULT NULL,
  _after jsonb DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO platform.audit_log(actor_id, action, resource_type, resource_id, household_id, before_data, after_data, reason)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _household_id, _before, _after, _reason)
  RETURNING id;
$$;

-- =====================================================
-- 6. OUTBOX HELPER (transactional event emit)
-- =====================================================

CREATE OR REPLACE FUNCTION platform.emit_event(
  _aggregate_type text,
  _aggregate_id text,
  _event_type text,
  _payload jsonb,
  _priority text DEFAULT 'P2'
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
  VALUES (_aggregate_type, _aggregate_id, _event_type, COALESCE(_payload, '{}'::jsonb), _priority)
  RETURNING id;
$$;

-- =====================================================
-- 7. SEED initial feature flags
-- =====================================================

INSERT INTO platform.feature_flag(key, description, enabled_global, is_public) VALUES
  ('family.sos.enabled',        'Bật nút SOS toàn cục trên app Family', false, false),
  ('family.memories.enabled',   'Bật module Memories (ảnh/video gia đình)', false, false),
  ('family.helper.qr.enabled',  'Bật QR pass cho người giúp việc', false, false),
  ('family.pickup.enabled',     'Bật QR pickup đón con', false, false),
  ('platform.audit.verbose',    'Ghi audit chi tiết mọi hành động (perf cost)', false, false),
  ('platform.outbox.worker',    'Bật outbox worker (cần ở mọi env prod)', true, false)
ON CONFLICT (key) DO NOTHING;
