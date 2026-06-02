-- P0 Realtime: reduce WAL size by switching from REPLICA IDENTITY FULL to DEFAULT.
-- No client subscriber uses payload.old (verified via code scan), so FULL is wasted bandwidth.
ALTER TABLE care.sos_event REPLICA IDENTITY DEFAULT;
ALTER TABLE care.dispatch_assignment REPLICA IDENTITY DEFAULT;
ALTER TABLE care.sos_timeline REPLICA IDENTITY DEFAULT;
ALTER TABLE public.elderly_profiles REPLICA IDENTITY DEFAULT;
ALTER TABLE public.medical_appointments REPLICA IDENTITY DEFAULT;
ALTER TABLE public.medicine_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE public.medicine_reminders REPLICA IDENTITY DEFAULT;
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;
ALTER TABLE public.safe_checks REPLICA IDENTITY DEFAULT;
ALTER TABLE public.security_requests REPLICA IDENTITY DEFAULT;
ALTER TABLE public.sos_events REPLICA IDENTITY DEFAULT;