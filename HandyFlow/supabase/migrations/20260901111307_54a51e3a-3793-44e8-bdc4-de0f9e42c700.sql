ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phones text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.validate_profile_phones()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF array_length(NEW.phones, 1) > 3 THEN
    RAISE EXCEPTION 'At most 3 phone numbers are allowed';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_validate_phones ON public.profiles;
CREATE TRIGGER profiles_validate_phones
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_phones();

REVOKE EXECUTE ON FUNCTION public.validate_profile_phones() FROM public, anon;

DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Signed-in users can read profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar, address, phones, is_public)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    upper(left(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2)),
    NULLIF(NEW.raw_user_meta_data->>'address',''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'phone','') = '' THEN '{}'::text[]
         ELSE ARRAY[NEW.raw_user_meta_data->>'phone'] END,
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE POLICY "Avatar images are publicly readable"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);