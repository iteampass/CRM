DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT * FROM auth.users a WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.id) LOOP
    INSERT INTO public.profiles (id, name, first_name, last_name, email, avatar, address, phones, is_public, nickname,
      street, street_number, floor, zip_code, city, country, country_code, latitude, longitude, formatted_address)
    VALUES (
      u.id,
      COALESCE(NULLIF(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''), split_part(u.email,'@',1)),
      NULLIF(u.raw_user_meta_data->>'first_name',''),
      NULLIF(u.raw_user_meta_data->>'last_name',''),
      u.email,
      upper(left(COALESCE(NULLIF(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''), u.email), 2)),
      NULLIF(u.raw_user_meta_data->>'address',''),
      CASE WHEN COALESCE(u.raw_user_meta_data->>'phone','') = '' THEN '{}'::text[] ELSE ARRAY[u.raw_user_meta_data->>'phone'] END,
      COALESCE((u.raw_user_meta_data->>'is_public')::boolean, true),
      NULLIF(u.raw_user_meta_data->>'nickname',''),
      NULLIF(u.raw_user_meta_data->>'street',''),
      NULLIF(u.raw_user_meta_data->>'street_number',''),
      NULLIF(u.raw_user_meta_data->>'floor',''),
      NULLIF(u.raw_user_meta_data->>'zip_code',''),
      NULLIF(u.raw_user_meta_data->>'city',''),
      NULLIF(u.raw_user_meta_data->>'country',''),
      NULLIF(u.raw_user_meta_data->>'country_code',''),
      NULLIF(u.raw_user_meta_data->>'latitude','')::double precision,
      NULLIF(u.raw_user_meta_data->>'longitude','')::double precision,
      NULLIF(u.raw_user_meta_data->>'formatted_address','')
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, CASE WHEN COALESCE(NULLIF(u.raw_user_meta_data->>'role',''),'client') = 'admin' THEN 'client' ELSE COALESCE(NULLIF(u.raw_user_meta_data->>'role',''),'client') END::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;