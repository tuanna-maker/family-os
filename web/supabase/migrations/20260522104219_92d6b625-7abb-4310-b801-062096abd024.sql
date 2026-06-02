
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS building_name text,
  ADD COLUMN IF NOT EXISTS apartment_no text,
  ADD COLUMN IF NOT EXISTS head_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, username, building_name, apartment_no, head_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'head_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'building_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'apartment_no', ''),
    NULLIF(NEW.raw_user_meta_data->>'head_name', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.profiles.username),
        building_name = COALESCE(EXCLUDED.building_name, public.profiles.building_name),
        apartment_no = COALESCE(EXCLUDED.apartment_no, public.profiles.apartment_no),
        head_name = COALESCE(EXCLUDED.head_name, public.profiles.head_name);
  RETURN NEW;
END;
$function$;
