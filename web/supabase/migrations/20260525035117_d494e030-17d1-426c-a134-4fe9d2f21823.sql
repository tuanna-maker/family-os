
ALTER TABLE public.medicine_reminders REPLICA IDENTITY FULL;
ALTER TABLE public.medical_appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_appointments;
