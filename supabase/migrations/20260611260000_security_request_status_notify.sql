-- Thông báo cư dân khi bảo vệ tiếp nhận / hoàn tất — 1 lần mỗi trạng thái (dedupe_key).
-- Nếu Lovable có trigger cũ ghi notifications kỹ thuật, nên tắt trigger đó để tránh trùng.

CREATE OR REPLACE FUNCTION public.security_request_notify_resident_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fam uuid;
  unit text;
  req_label text;
  ntitle text;
  nbody text;
  emoji text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW;
  END IF;
  IF NEW.requester_id IS NULL THEN RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('in_progress', 'resolved', 'cancelled') THEN RETURN NEW;
  END IF;

  SELECT p.family_id INTO fam FROM public.profiles p WHERE p.user_id = NEW.requester_id LIMIT 1;
  unit := nullif(trim(both from coalesce(NEW.apartment, '') || case when NEW.apartment is not null and NEW.building is not null then ' · ' else '' end || coalesce(NEW.building, '')), '');
  req_label := coalesce(nullif(trim(NEW.payload->>'label'), ''), NEW.request_type);

  emoji := case NEW.request_type
    when 'fire' then '🔥'
    when 'sos' then '🆘'
    when 'intrusion' then '🚨'
    when 'noise' then '🔊'
    when 'package' then '📦'
    when 'shipping' then '📮'
    when 'delivery' then '🛗'
    else '🛡️'
  end;

  IF NEW.status = 'in_progress' THEN
    ntitle := emoji || ' Đội bảo an đã nhận tin';
    nbody := 'Đang hỗ trợ ' || req_label ||
      case when unit is not null then ' · ' || unit else '' end ||
      '. Bạn yên tâm, chúng tôi sẽ cập nhật tiếp nhé!';
  ELSIF NEW.status = 'resolved' THEN
    ntitle := '✅ Đã xử lý xong';
    nbody := req_label ||
      case when unit is not null then ' · ' || unit else '' end ||
      ' đã hoàn tất. Cảm ơn bạn đã tin tưởng đội bảo an!';
  ELSE
    ntitle := 'Yêu cầu đã huỷ';
    nbody := req_label || case when unit is not null then ' · ' || unit else '' end || ' không còn được xử lý.';
  END IF;

  INSERT INTO public.notifications (user_id, family_id, type, ref_id, title, body, dedupe_key)
  VALUES (
    NEW.requester_id,
    fam,
    'security.status_changed',
    NEW.id::text,
    ntitle,
    nbody,
    'security.status:' || NEW.id::text || ':' || NEW.status
  )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS security_request_notify_resident_status_trg ON public.security_requests;
CREATE TRIGGER security_request_notify_resident_status_trg
  AFTER UPDATE OF status ON public.security_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.security_request_notify_resident_status();
