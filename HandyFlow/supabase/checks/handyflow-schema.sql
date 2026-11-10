-- Read-only post-migration checks. Run as the database administrator.
-- Expect 12 RLS-enabled tables, one view, and eight functions.
SELECT c.relname, c.relkind, c.relrowsecurity, c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'handyflow' AND c.relkind IN ('r', 'v') ORDER BY c.relname;

SELECT p.proname, p.prosecdef, p.proconfig, p.proacl,
       p.prosrc ~ '\mpublic\.' AS remaining_public_reference
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'handyflow' ORDER BY p.proname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'handyflow' ORDER BY tablename, policyname;

SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

SELECT schemaname, tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' ORDER BY schemaname, tablename;

-- Both should be false; authenticated/anon require USAGE, not CREATE.
SELECT has_schema_privilege('authenticated', 'handyflow', 'CREATE') AS authenticated_create,
       has_schema_privilege('anon', 'handyflow', 'CREATE') AS anon_create;
