import { expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const directory = new URL("../supabase/migrations/", import.meta.url);
const migrationName = "20261109220957_move_handyflow_to_dedicated_schema.sql";
const move = readFileSync(new URL(migrationName, directory), "utf8");

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE storage.objects(id uuid, bucket_id text, name text);
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1, '/') $$;
    CREATE PUBLICATION supabase_realtime;
  `);
  for (const file of readdirSync(directory).filter(f => f < migrationName && f.endsWith('.sql')).sort()) {
    // The historical export contains this policy twice; reconstruct its final
    // source state without editing already-published migration history.
    if (file.startsWith('20260904112254')) await db.exec('DROP POLICY IF EXISTS "Handymen can claim unassigned tasks" ON public.task_requests');
    if (file.startsWith('20260904112448')) await db.exec('DROP POLICY IF EXISTS "Handymen create own offers" ON public.offers');
    await db.exec(readFileSync(new URL(file, directory), "utf8"));
  }
  return db;
}

const client = "00000000-0000-4000-8000-000000000001";
const worker = "00000000-0000-4000-8000-000000000002";
const outsider = "00000000-0000-4000-8000-000000000003";
const task = "10000000-0000-4000-8000-000000000001";
const offer = "20000000-0000-4000-8000-000000000001";

async function asUser(db: PGlite, user: string, sql: string) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
  try { return await db.query(sql); } finally { await db.exec("RESET ROLE"); }
}

test("schema move preserves data, ACLs, RLS, RPCs, signup triggers and realtime membership", async () => {
  const db = await fixture();
  try {
    await db.exec(`
      INSERT INTO auth.users(id,email) VALUES ('${client}','client@test.local'), ('${worker}','worker@test.local'), ('${outsider}','other@test.local');
      UPDATE public.profiles SET is_public=false, country_code='RS', address='Private';
      INSERT INTO public.user_roles(user_id,role) VALUES ('${worker}','handyman');
      INSERT INTO public.task_requests(id,client_id,handyman_id,title,status) VALUES ('${task}','${client}','${worker}','Repair','negotiating');
      INSERT INTO public.offers(id,task_id,handyman_id,price) VALUES ('${offer}','${task}','${worker}',40);
      CREATE TABLE public.other_app(id integer PRIMARY KEY); INSERT INTO public.other_app VALUES (42);
    `);
    const before = await db.query("SELECT oid, relname, relacl::text, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v') AND relname <> 'other_app' ORDER BY relname");
    const beforeFunctions = await db.query("SELECT oid, proname, proacl::text FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY proname");
    await db.exec(move);
    expect((await db.query("SELECT oid, relname, relacl::text, relrowsecurity FROM pg_class WHERE relnamespace='handyflow'::regnamespace AND relkind IN ('r','v') ORDER BY relname")).rows).toEqual(before.rows);
    expect((await db.query("SELECT oid, proname, proacl::text FROM pg_proc WHERE pronamespace='handyflow'::regnamespace ORDER BY proname")).rows).toEqual(beforeFunctions.rows);
    expect((await db.query("SELECT * FROM public.other_app")).rows).toEqual([{id: 42}]);
    expect((await db.query("SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename")).rows).toEqual([
      {schemaname: 'handyflow', tablename: 'notifications'}, {schemaname: 'handyflow', tablename: 'task_requests'},
    ]);
    expect((await db.query("SELECT title FROM handyflow.task_requests")).rows).toEqual([{title: 'Repair'}]);
    expect((await asUser(db, outsider, "SELECT id FROM handyflow.profiles")).rows).toEqual([{id: outsider}]);
    await expect(asUser(db, outsider, `SELECT handyflow.resolve_offer('${offer}','accept')`)).rejects.toThrow('Only the client');
    await expect(asUser(db, outsider, `SELECT * FROM handyflow.get_request_participant_contact('${task}')`)).rejects.toThrow();
    await asUser(db, client, `SELECT handyflow.resolve_offer('${offer}','accept')`);
    expect((await db.query("SELECT status,agreed_price FROM handyflow.task_requests")).rows).toEqual([{status:'agreed',agreed_price:'40.00'}]);
    expect((await asUser(db, worker, `SELECT name FROM handyflow.get_request_participant_contact('${task}')`)).rows).toEqual([{name:'client'}]);
    expect((await asUser(db, worker, `SELECT name FROM handyflow.get_request_client_contact('${task}')`)).rows).toEqual([{name:'client'}]);
    await expect(asUser(db, worker, 'CREATE TABLE handyflow.attack(id int)')).rejects.toThrow();
    await expect(asUser(db, worker, 'SELECT handyflow.handle_new_user()')).rejects.toThrow();
    await db.exec('SET ROLE anon');
    expect((await db.query('SELECT * FROM handyflow.site_settings')).rows.length).toBe(1);
    await expect(db.query('SELECT * FROM handyflow.profile_directory')).rejects.toThrow();
    await db.exec('RESET ROLE');
    // Unrelated public objects with the original names cannot redirect definer functions.
    await db.exec(`CREATE TABLE public.profiles(id uuid); CREATE TABLE public.user_roles(user_id uuid, role text);
      INSERT INTO public.user_roles VALUES ('${outsider}','admin');
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-4000-8000-000000000004','new@test.local','{"role":"admin"}');`);
    expect((await db.query("SELECT name FROM handyflow.profiles WHERE email='new@test.local'")).rows).toEqual([{name:'new'}]);
    expect((await asUser(db, outsider, `SELECT handyflow.has_role('${outsider}','admin') AS admin`)).rows).toEqual([{admin:false}]);
    expect((await db.query('SELECT * FROM public.profiles')).rows).toHaveLength(0);
    expect((await db.query("SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal")).rows).toEqual([{tgname:'handyflow_on_auth_user_created'}]);
    await db.exec(`UPDATE handyflow.task_requests SET status='completed';
      INSERT INTO handyflow.reviews(task_id,client_id,handyman_id,reviewer_id,rating) VALUES ('${task}','${client}','${worker}','${client}',5);`);
    expect((await db.query(`SELECT rating FROM handyflow.profiles WHERE id='${worker}'`)).rows).toEqual([{rating:'5.0'}]);
    expect((await db.query("SELECT proname FROM pg_proc WHERE pronamespace='handyflow'::regnamespace AND prosrc ~ '\\mpublic\\.'")).rows).toEqual([]);
    // Refuse to merge into an existing destination; rollback leaves existing data intact.
    await expect(db.exec(move)).rejects.toThrow();
    await db.exec('ROLLBACK');
    expect((await db.query('SELECT count(*)::int AS count FROM handyflow.profiles')).rows).toEqual([{count:4}]);
  } finally { await db.close(); }
}, 120000);

test("missing source prerequisites roll back the entire migration", async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE public.profiles(id int); INSERT INTO public.profiles VALUES(7);');
    await expect(db.exec(move)).rejects.toThrow('Expected RLS-enabled');
    await db.exec('ROLLBACK');
    expect((await db.query("SELECT to_regnamespace('handyflow') AS schema")).rows).toEqual([{schema:null}]);
    expect((await db.query('SELECT * FROM public.profiles')).rows).toEqual([{id:7}]);
  } finally { await db.close(); }
}, 120000);
