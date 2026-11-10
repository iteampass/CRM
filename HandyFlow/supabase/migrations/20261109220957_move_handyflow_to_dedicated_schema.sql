-- Run on the ORIGINAL HandyFlow database before exporting it to a shared project.
-- Do not run the legacy public-schema migrations on an already shared project.
-- This is an in-place move, not a cross-project data/auth/storage transfer.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Fail closed on missing prerequisites or a previously populated destination.
-- No CASCADE, table copies, compatibility views, or blanket public-schema grants.
CREATE SCHEMA handyflow;
REVOKE ALL ON SCHEMA handyflow FROM PUBLIC;
GRANT USAGE ON SCHEMA handyflow TO anon, authenticated, service_role;

DO $migration$
DECLARE
  object_name text;
  object_oid oid;
  fn record;
  definition text;
  names constant text[] := ARRAY[
    'profiles', 'user_roles', 'repair_categories', 'task_requests', 'offers',
    'messages', 'reviews', 'task_events', 'handyman_invites', 'notifications',
    'testimonials', 'site_settings'
  ];
  routines constant text[] := ARRAY[
    'update_updated_at_column', 'has_role', 'handle_new_user',
    'refresh_handyman_rating', 'validate_profile_phones', 'resolve_offer',
    'get_request_client_contact', 'get_request_participant_contact'
  ];
  routine_oids oid[];
BEGIN
  FOREACH object_name IN ARRAY names LOOP
    SELECT c.oid INTO object_oid FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = object_name AND c.relkind = 'r'
        AND c.relrowsecurity;
    IF object_oid IS NULL THEN
      RAISE EXCEPTION 'Expected RLS-enabled HandyFlow table public.% is missing', object_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.profile_directory') AND relkind = 'v') THEN
    RAISE EXCEPTION 'Apply the profile_directory migration first';
  END IF;
  FOREACH object_name IN ARRAY routines LOOP
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = object_name AND p.prokind = 'f') <> 1 THEN
      RAISE EXCEPTION 'Expected exactly one public.% function; inspect source drift before migrating', object_name;
    END IF;
  END LOOP;
  SELECT array_agg(p.oid) INTO routine_oids FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(routines);

  -- ALTER ... SET SCHEMA preserves object OIDs, rows, indexes, constraints,
  -- triggers, RLS policies, grants, and publication membership.
  FOREACH object_name IN ARRAY names LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA handyflow', object_name);
  END LOOP;
  ALTER VIEW public.profile_directory SET SCHEMA handyflow;
  ALTER TYPE public.app_role SET SCHEMA handyflow;
  ALTER TYPE public.task_status SET SCHEMA handyflow;
  ALTER TYPE public.offer_status SET SCHEMA handyflow;

  FOREACH object_oid IN ARRAY routine_oids LOOP
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA handyflow', object_oid::regprocedure);
  END LOOP;

  -- SQL/PLpgSQL string bodies are not rewritten by SET SCHEMA. Rewrite only
  -- references to known HandyFlow objects, retaining existing function ACLs.
  FOREACH object_oid IN ARRAY routine_oids LOOP
    definition := pg_get_functiondef(object_oid);
    FOREACH object_name IN ARRAY names || routines || ARRAY[
      'profile_directory', 'app_role', 'task_status', 'offer_status'
    ] LOOP
      definition := regexp_replace(definition,
        '\mpublic\.' || object_name || '\M', 'handyflow.' || object_name, 'g');
    END LOOP;
    definition := regexp_replace(definition, 'SET search_path TO [^\n]+',
      'SET search_path TO ''handyflow'', ''pg_temp''');
    EXECUTE definition;
    EXECUTE format('ALTER FUNCTION %s SET search_path = handyflow, pg_temp', object_oid::regprocedure);
  END LOOP;

  -- Auth remains in auth. Give this app's existing trigger a distinct name
  -- so its eventual import will not collide with other apps' signup triggers.
  FOR fn IN SELECT t.tgname FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal
      AND t.tgfoid = 'handyflow.handle_new_user()'::regprocedure
  LOOP
    IF fn.tgname <> 'handyflow_on_auth_user_created' THEN
      EXECUTE format('ALTER TRIGGER %I ON auth.users RENAME TO handyflow_on_auth_user_created', fn.tgname);
    END IF;
  END LOOP;
END
$migration$;

-- No client CREATE privilege: definer functions' fixed search path is trusted.
-- Existing table/routine ACLs are retained; do not GRANT ALL to API roles.
REVOKE CREATE ON SCHEMA handyflow FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
