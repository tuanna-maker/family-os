ALTER PUBLICATION supabase_realtime ADD TABLE public.security_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;
ALTER TABLE public.security_requests REPLICA IDENTITY FULL;
ALTER TABLE public.sos_events REPLICA IDENTITY FULL;