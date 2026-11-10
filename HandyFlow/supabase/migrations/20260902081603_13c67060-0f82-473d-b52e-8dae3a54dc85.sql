ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS formatted_address text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _name text;
BEGIN
  _name := NULLIF(trim(concat_ws(' ',
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''))), '');
  _name := COALESCE(
    _name,
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, name, email, avatar, address, phones, is_public, nickname,
    street, street_number, floor, zip_code, city, country, country_code,
    latitude, longitude, formatted_address)
  VALUES (
    NEW.id,
    _name,
    NEW.email,
    upper(left(_name, 2)),
    NULLIF(NEW.raw_user_meta_data->>'address',''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'phone','') = '' THEN '{}'::text[]
         ELSE ARRAY[NEW.raw_user_meta_data->>'phone'] END,
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true),
    NULLIF(NEW.raw_user_meta_data->>'nickname',''),
    NULLIF(NEW.raw_user_meta_data->>'street',''),
    NULLIF(NEW.raw_user_meta_data->>'street_number',''),
    NULLIF(NEW.raw_user_meta_data->>'floor',''),
    NULLIF(NEW.raw_user_meta_data->>'zip_code',''),
    NULLIF(NEW.raw_user_meta_data->>'city',''),
    NULLIF(NEW.raw_user_meta_data->>'country',''),
    NULLIF(NEW.raw_user_meta_data->>'country_code',''),
    NULLIF(NEW.raw_user_meta_data->>'latitude','')::double precision,
    NULLIF(NEW.raw_user_meta_data->>'longitude','')::double precision,
    NULLIF(NEW.raw_user_meta_data->>'formatted_address','')
  )
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;