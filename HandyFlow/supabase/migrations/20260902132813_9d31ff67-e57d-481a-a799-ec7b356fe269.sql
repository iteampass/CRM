ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill from existing name: first word -> first_name, remainder -> last_name
UPDATE public.profiles
SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name  = COALESCE(last_name, NULLIF(trim(regexp_replace(name, '^[^ ]+ ?', '')), ''))
WHERE name IS NOT NULL AND first_name IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role public.app_role;
  _first text;
  _last text;
  _name text;
BEGIN
  _first := NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), '');
  _last  := NULLIF(trim(NEW.raw_user_meta_data->>'last_name'), '');
  _name := NULLIF(trim(concat_ws(' ', _first, _last)), '');
  _name := COALESCE(
    _name,
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, name, first_name, last_name, email, avatar, address, phones, is_public, nickname,
    street, street_number, floor, zip_code, city, country, country_code,
    latitude, longitude, formatted_address)
  VALUES (
    NEW.id,
    _name,
    _first,
    _last,
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
END; $$;