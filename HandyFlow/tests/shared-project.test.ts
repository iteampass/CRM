import { expect, test } from 'bun:test';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const migration = readFileSync(new URL('../../supabase/migrations/20261110071547_bootstrap_handyflow_shared_project.sql', import.meta.url), 'utf8');
const member = '00000000-0000-4000-8000-000000000001';
const outsider = '00000000-0000-4000-8000-000000000002';
const unverified = '00000000-0000-4000-8000-000000000003';

test('shared destination: enrollment, RLS, files and other app objects stay isolated', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA software; CREATE SCHEMA realestate;
      CREATE SCHEMA handyflow;
      CREATE TABLE software.sentinel(id integer); INSERT INTO software.sentinel VALUES (42);
      CREATE TABLE realestate.sentinel(id integer); INSERT INTO realestate.sentinel VALUES (43);
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth,storage TO authenticated,anon;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON storage.objects TO authenticated;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
      INSERT INTO storage.buckets(id,name,public) VALUES ('avatars','avatars',false);
      CREATE PUBLICATION supabase_realtime;
    `);
    await db.exec(migration);
    await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
      ('${member}','member@example.test',now(),'{"app":"handyflow","role":"handyman","first_name":"Test","country_code":"RS"}'),
      ('${outsider}','other@example.test',now(),'{"role":"admin"}'),
      ('${unverified}','pending@example.test',null,'{}');`);
    async function asUser(id: string, sql: string) {
      await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
      try { return await db.query(sql); } finally { await db.exec('RESET ROLE'); }
    }
    expect((await db.query('SELECT * FROM handyflow.profiles')).rows).toHaveLength(0);
    expect((await db.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal")).rows).toEqual([{n:0}]);
    await expect(asUser(unverified,'SELECT handyflow.enroll()')).rejects.toThrow('verified');
    await asUser(member,'SELECT handyflow.enroll()');
    await asUser(member,'SELECT handyflow.enroll()');
    expect((await asUser(member,'SELECT role FROM handyflow.user_roles')).rows).toEqual([{role:'handyman'}]);
    await asUser(member,`INSERT INTO handyflow.task_requests(client_id,title) VALUES ('${member}','Test job')`);
    for (const table of ['profiles','user_roles','task_requests','profile_directory']) {
      expect((await asUser(outsider,`SELECT * FROM handyflow.${table}`)).rows).toHaveLength(0);
    }
    await expect(asUser(outsider,`INSERT INTO storage.objects(bucket_id,name) VALUES ('handyflow-avatars','${outsider}/avatar.png')`)).rejects.toThrow();
    await asUser(member,`INSERT INTO storage.objects(bucket_id,name) VALUES ('handyflow-avatars','${member}/avatar.png')`);
    expect((await asUser(outsider,'SELECT * FROM storage.objects')).rows).toHaveLength(0);
    await expect(asUser(member,`INSERT INTO storage.objects(bucket_id,name) VALUES ('handyflow-avatars','${outsider}/avatar.png')`)).rejects.toThrow();
    await asUser(outsider,'SELECT handyflow.enroll()');
    expect((await asUser(outsider,'SELECT role FROM handyflow.user_roles')).rows).toEqual([{role:'client'}]);
    await expect(asUser(outsider,`INSERT INTO handyflow.user_roles(user_id,role) VALUES ('${outsider}','admin')`)).rejects.toThrow();
    expect((await asUser(outsider,'SELECT id FROM handyflow.profiles')).rows).toEqual([{id:outsider}]);
    await expect(asUser(member, `UPDATE handyflow.offers SET status='accepted'`)).rejects.toThrow('permission denied');
    await expect(asUser(member, `INSERT INTO handyflow.offers(task_id,handyman_id,price,status)
      SELECT id,'${member}',20,'accepted' FROM handyflow.task_requests LIMIT 1`)).rejects.toThrow();
    await expect(asUser(member, `INSERT INTO handyflow.testimonials(author_id,quote,status)
      VALUES ('${member}','Unreviewed testimonial','approved')`)).rejects.toThrow();
    await asUser(member, `INSERT INTO handyflow.testimonials(author_id,quote)
      VALUES ('${member}','Pending testimonial')`);
    expect((await db.query('SELECT * FROM software.sentinel')).rows).toEqual([{id:42}]);
    expect((await db.query('SELECT * FROM realestate.sentinel')).rows).toEqual([{id:43}]);
    expect((await db.query('SELECT count(*)::int AS n FROM handyflow.repair_categories')).rows).toEqual([{n:9}]);
    expect((await db.query("SELECT public FROM storage.buckets WHERE id='avatars'")).rows).toEqual([{public:false}]);
    await db.exec('SET ROLE anon');
    expect((await db.query('SELECT * FROM handyflow.repair_categories')).rows).toHaveLength(9);
    await expect(db.query('SELECT handyflow.enroll()')).rejects.toThrow();
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
}, 120000);
