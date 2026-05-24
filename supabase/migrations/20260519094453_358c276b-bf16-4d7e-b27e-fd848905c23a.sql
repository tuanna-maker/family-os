ALTER TABLE public.medicine_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_logs;