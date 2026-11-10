ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;

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

  INSERT INTO public.profiles (id, name, email, avatar, address, phones, is_public, nickname)
  VALUES (
    NEW.id,
    _name,
    NEW.email,
    upper(left(_name, 2)),
    NULLIF(NEW.raw_user_meta_data->>'address',''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'phone','') = '' THEN '{}'::text[]
         ELSE ARRAY[NEW.raw_user_meta_data->>'phone'] END,
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true),
    NULLIF(NEW.raw_user_meta_data->>'nickname','')
  )
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$