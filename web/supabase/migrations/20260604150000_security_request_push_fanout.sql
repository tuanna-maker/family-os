-- Fan-out push khi cư dân tạo / cập nhật security_requests (SOS E2E + FCM)

CREATE OR REPLACE FUNCTION public.fanout_security_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, platform, care
AS $$
DECLARE
  _event_type text;
  _priority text := 'P0';
  _title text;
  _body text;
  _payload jsonb;
  _count int := 0;
BEGIN
  IF NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  _event_type := CASE NEW.request_type
    WHEN 'sos' THEN 'sos.triggered'
    WHEN 'fire' THEN 'sos.fire'
    ELSE 'sos.resident_request'
  END;

  _payload := jsonb_build_object(
    'request_id', NEW.id,
    'request_type', NEW.request_type,
    'building', NEW.building,
    'apartment', NEW.apartment,
    'family_id', NEW.family_id,
    'project_id', NEW.project_id,
    'payload', COALESCE(NEW.payload, '{}'::jsonb)
  );

  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
  VALUES ('security_request', NEW.id::text, _event_type, _payload, _priority);

  _title := CASE NEW.request_type
    WHEN 'sos' THEN 'SOS KHẨN CẤP'
    WHEN 'fire' THEN 'BÁO CHÁY'
    ELSE 'Yêu cầu cư dân'
  END;

  _body := trim(both ' · ' FROM concat_ws(' · ',
    NULLIF(COALESCE(NEW.apartment, NEW.building), ''),
    CASE NEW.request_type
      WHEN 'sos' THEN 'Cần hỗ trợ ngay'
      WHEN 'fire' THEN 'Kiểm tra PCCC'
      WHEN 'intrusion' THEN 'Người lạ / xâm nhập'
      WHEN 'package' THEN 'Nhận hàng hộ'
      ELSE NEW.request_type
    END
  ));

  WITH on_duty AS (
    INSERT INTO platform.notification(
      user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status
    )
    SELECT g.guard_id,
           NEW.family_id,
           'fcm',
           _priority,
           _event_type,
           _title,
           _body,
           _payload,
           'sos:' || NEW.id::text || ':' || g.guard_id::text,
           'queued'
    FROM care.on_duty_guards() g
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM on_duty;

  IF _count = 0 THEN
    INSERT INTO platform.notification(
      user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status
    )
    SELECT ur.user_id,
           NEW.family_id,
           'fcm',
           _priority,
           _event_type,
           _title,
           _body,
           _payload,
           'sos:' || NEW.id::text || ':' || ur.user_id::text,
           'queued'
    FROM public.user_roles ur
    WHERE ur.role IN ('security_staff', 'security_admin', 'super_admin')
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_security_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, platform
AS $$
DECLARE
  _payload jsonb;
  _title text;
  _body text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'request_id', NEW.id,
    'request_type', NEW.request_type,
    'from_status', OLD.status,
    'to_status', NEW.status,
    'building', NEW.building,
    'apartment', NEW.apartment
  );

  _title := CASE NEW.status
    WHEN 'in_progress' THEN 'Bảo vệ đã tiếp nhận'
    WHEN 'resolved' THEN 'Yêu cầu đã xử lý xong'
    WHEN 'cancelled' THEN 'Yêu cầu đã hủy'
    ELSE 'Cập nhật yêu cầu bảo an'
  END;

  _body := COALESCE(NEW.apartment, NEW.building, 'Yêu cầu của bạn') ||
    ' · ' || OLD.status || ' → ' || NEW.status;

  INSERT INTO platform.outbox(aggregate_type, aggregate_id, event_type, payload, priority)
  VALUES (
    'security_request',
    NEW.id::text,
    'security.status_changed',
    _payload,
    CASE WHEN NEW.request_type = 'sos' THEN 'P0' ELSE 'P1' END
  );

  INSERT INTO platform.notification(
    user_id, household_id, channel, priority, topic, title, body, data, dedupe_key, status
  )
  VALUES (
    NEW.requester_id,
    NEW.family_id,
    'fcm',
    CASE WHEN NEW.request_type = 'sos' THEN 'P0' ELSE 'P1' END,
    'security.status_changed',
    _title,
    _body,
    _payload,
    'sec-status:' || NEW.id::text || ':' || NEW.status,
    'queued'
  )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  INSERT INTO public.notifications(user_id, family_id, type, title, body, dedupe_key, ref_id)
  VALUES (
    NEW.requester_id,
    NEW.family_id,
    'security_' || NEW.status,
    _title,
    _body,
    'sec-status:' || NEW.id::text || ':' || NEW.status,
    NEW.id::text
  )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_request_fanout ON public.security_requests;
CREATE TRIGGER trg_security_request_fanout
  AFTER INSERT ON public.security_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fanout_security_request_insert();

DROP TRIGGER IF EXISTS trg_security_request_status_notify ON public.security_requests;
CREATE TRIGGER trg_security_request_status_notify
  AFTER UPDATE OF status ON public.security_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_security_request_status();

GRANT EXECUTE ON FUNCTION public.fanout_security_request_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_security_request_status() TO authenticated;
