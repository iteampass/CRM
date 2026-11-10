import { test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const migrationDir = new URL("../supabase/migrations/", import.meta.url);
const readMigration = (prefix: string) => readFileSync(new URL(readdirSync(migrationDir).find((f) => f.startsWith(prefix))!, migrationDir), "utf8");

test("profile privacy and atomic offer transitions", async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase platform fixture; application tables/policies below come
    // from the real migrations, not a second implementation of their rules.
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      CREATE TABLE storage.objects (id uuid, bucket_id text, name text);
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1, '/') $$;
    `);
    for (const prefix of ["20260901103336", "20260901104323", "20260901111307", "20260901201836", "20260901205248", "20260902081603", "20260902132813", "20260902154204", "20260918120000"]) {
      await db.exec(readMigration(prefix));
    }
    const ids = [1, 2, 3, 4].map((n) => `00000000-0000-4000-8000-00000000000${n}`);
    const [client, worker, outsider, publicWorker] = ids;
    for (const id of ids) {
      await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, `${id}@example.test`]);
    }
    await db.exec(`UPDATE profiles SET is_public = false, address = 'Private address', phones = ARRAY['123'];
      UPDATE profiles SET is_public = true WHERE id = '${publicWorker}';
      INSERT INTO user_roles (user_id, role) VALUES ('${worker}', 'handyman');`);
    const task = "10000000-0000-4000-8000-000000000001";
    const offer = "20000000-0000-4000-8000-000000000001";
    await db.exec(`INSERT INTO task_requests (id, client_id, handyman_id, title, status)
      VALUES ('${task}', '${client}', '${worker}', 'Test', 'negotiating');
      INSERT INTO offers (id, task_id, handyman_id, price) VALUES ('${offer}', '${task}', '${worker}', 100);`);
    async function asUser(id: string, sql: string) {
      await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${id}';`);
      try { return await db.query(sql); } finally { await db.exec("RESET ROLE"); }
    }
    const own = await asUser(outsider, "SELECT id, address FROM profiles");
    expect(own.rows).toEqual([{ id: outsider, address: "Private address" }]);
    const visible = await asUser(outsider, "SELECT id FROM profile_directory ORDER BY id");
    expect(visible.rows).toEqual([{ id: outsider }, { id: publicWorker }]);
    const colleague = await asUser(client, `SELECT id FROM profile_directory WHERE id = '${worker}'`);
    expect(colleague.rows).toHaveLength(1);
    await expect(asUser(client, "SELECT address FROM profile_directory")).rejects.toThrow();
    await db.exec("SET ROLE anon");
    await expect(db.query("SELECT * FROM profile_directory")).rejects.toThrow();
    await db.exec("RESET ROLE");
    await expect(asUser(outsider, `SELECT resolve_offer('${offer}', 'decline')`)).rejects.toThrow("Only the client");
    await expect(asUser(client, `SELECT resolve_offer('${offer}', 'withdraw')`)).rejects.toThrow("Only the offering handyman");
    await expect(asUser(client, `SELECT resolve_offer('${offer}', 'invalid')`)).rejects.toThrow("Invalid offer action");
    await expect(asUser('', `SELECT resolve_offer('${offer}', 'decline')`)).rejects.toThrow("Sign in required");
    // A failure in the last write must roll back BOTH earlier updates.
    await db.exec(`CREATE FUNCTION fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'event failure'; END $$;
      CREATE TRIGGER fail_event BEFORE INSERT ON task_events FOR EACH ROW EXECUTE FUNCTION fail_event();`);
    await expect(asUser(client, `SELECT resolve_offer('${offer}', 'decline')`)).rejects.toThrow("event failure");
    expect((await db.query("SELECT status FROM offers")).rows).toEqual([{ status: "pending" }]);
    expect((await db.query("SELECT status, handyman_id FROM task_requests")).rows).toEqual([{ status: "negotiating", handyman_id: worker }]);
    await db.exec("DROP TRIGGER fail_event ON task_events");
    for (const [action, actor, status, assigned] of [
      ['another', client, 'declined', worker],
      ['decline', client, 'declined', null],
      ['withdraw', worker, 'withdrawn', null],
    ] as const) {
      await db.exec(`UPDATE offers SET status = 'pending'; UPDATE task_requests SET status = 'negotiating', handyman_id = '${worker}';`);
      await asUser(actor, `SELECT resolve_offer('${offer}', '${action}')`);
      expect((await db.query("SELECT status FROM offers")).rows).toEqual([{ status }]);
      expect((await db.query("SELECT status, handyman_id FROM task_requests")).rows).toEqual([{ status: 'pending', handyman_id: assigned }]);
      await expect(asUser(actor, `SELECT resolve_offer('${offer}', '${action}')`)).rejects.toThrow("no longer pending");
    }
    expect((await db.query("SELECT * FROM task_events")).rows).toHaveLength(3);
    await db.exec(`UPDATE offers SET status = 'pending'; UPDATE task_requests SET status = 'negotiating', handyman_id = '${worker}';`);
    await asUser(client, `SELECT resolve_offer('${offer}', 'accept')`);
    expect((await db.query("SELECT status, agreed_price FROM task_requests")).rows).toEqual([{ status: 'agreed', agreed_price: '100.00' }]);
    await expect(asUser(worker, `SELECT resolve_offer('${offer}', 'withdraw')`)).rejects.toThrow("no longer pending");
    await db.exec(`UPDATE offers SET status = 'pending'; UPDATE task_requests SET status = 'completed', handyman_id = '${worker}';`);
    await expect(asUser(client, `SELECT resolve_offer('${offer}', 'decline')`)).rejects.toThrow("no longer accepting");
    await db.exec(`UPDATE task_requests SET status = 'negotiating', handyman_id = '${outsider}';`);
    await expect(asUser(client, `SELECT resolve_offer('${offer}', 'decline')`)).rejects.toThrow("no longer assigned");
  } finally { await db.close(); }
}, 30000);
