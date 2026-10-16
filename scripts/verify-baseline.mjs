import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const db = new PGlite();
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  // Stand-ins for Supabase-managed objects, not part of the custom-schema export.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
    CREATE TABLE storage.objects(id uuid PRIMARY KEY, name text, bucket_id text);
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
    CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql AS $$ SELECT split_part($1,'.',-1) $$;`);
  await db.exec(await readFile(root+'/supabase/baseline/schema.sql','utf8'));
  await db.exec(await readFile(root+'/supabase/baseline/history.sql','utf8'));
  await db.exec(`INSERT INTO software.workspaces(id,name) VALUES ('00000000-0000-0000-0000-000000000001','Test workspace');
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ('11111111-1111-4111-8111-111111111111','owner@example.invalid',now());
    INSERT INTO software.workspace_members(workspace_id,user_id,role) VALUES ('00000000-0000-0000-0000-000000000001','11111111-1111-4111-8111-111111111111','owner');`);
  const results = await db.exec(await readFile(root+'/supabase/tests/app_isolation.sql','utf8'));
  console.log(JSON.stringify({ baselineRestore: 'passed', migrationVersions: (await db.query('select count(*) from supabase_migrations.schema_migrations')).rows, isolation: results.at(-1).rows }));
} catch(e) { console.error(e.message); process.exitCode = 1; }
finally { await db.close(); }
