ALTER TABLE public.safe_checks REPLICA IDENTITY FULL;
ALTER TABLE public.elderly_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safe_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.elderly_profiles;