
CREATE TABLE public.sos_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.security_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sos_events_request ON public.sos_events(request_id, created_at DESC);

ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sos_events_select"
ON public.sos_events
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR is_security_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.security_requests sr
    WHERE sr.id = sos_events.request_id
      AND sr.requester_id = auth.uid()
  )
);

CREATE POLICY "sos_events_insert"
ON public.sos_events
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (actor_id IS NULL OR actor_id = auth.uid())
  AND (
    is_security_user(auth.uid())
    OR is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.security_requests sr
      WHERE sr.id = request_id AND sr.requester_id = auth.uid()
    )
  )
);
