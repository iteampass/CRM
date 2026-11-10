import { test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

test("request contacts require an eligible same-country handyman", async () => {
  const db = new PGlite();
  const client = "00000000-0000-4000-8000-000000000001";
  const worker = "00000000-0000-4000-8000-000000000002";
  const other = "00000000-0000-4000-8000-000000000003";
  const task = "10000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE profiles(id uuid PRIMARY KEY, name text, email text, phones text[], address text, country_code text);
      CREATE TABLE user_roles(user_id uuid, role text);
      CREATE FUNCTION public.has_role(id uuid, wanted text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=id AND role=wanted) $$;
      CREATE TABLE task_requests(id uuid PRIMARY KEY, client_id uuid, handyman_id uuid, status text);
      INSERT INTO profiles VALUES ('${client}','Client','client@example.test',ARRAY['123'],'Private address','RS'), ('${worker}','Worker',null,null,null,'RS');
      INSERT INTO user_roles VALUES ('${worker}','handyman');
      INSERT INTO task_requests VALUES ('${task}','${client}',null,'pending');`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20260922120000_request_client_contact.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20260922130000_request_participant_contact.sql", import.meta.url), "utf8"));
    const participantContact = () => db.query(`SELECT * FROM get_request_participant_contact('${task}')`);
    const read = () => db.query(`SELECT * FROM get_request_client_contact('${task}')`);
    const asUser = async (id: string) => { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`); };
    await asUser(worker);
    expect((await read()).rows).toEqual([{name:"Client",email:"client@example.test",phones:["123"],address:"Private address"}]);
    await asUser(client);
    await expect(read()).rejects.toThrow("Only signed-in handymen");
    await asUser("");
    await expect(read()).rejects.toThrow("Only signed-in handymen");
    await asUser(worker);
    for (const country of ["HR", ""]) {
      await db.exec(`RESET ROLE; UPDATE profiles SET country_code='${country}' WHERE id='${worker}'; SET ROLE authenticated;`);
      await expect(read()).rejects.toThrow("not available");
    }
    await db.exec(`RESET ROLE; UPDATE profiles SET country_code='RS' WHERE id='${worker}'; UPDATE task_requests SET handyman_id='${other}'; SET ROLE authenticated;`);
    await expect(read()).rejects.toThrow("not available");
    await db.exec(`RESET ROLE; UPDATE task_requests SET handyman_id=null,status='completed'; SET ROLE authenticated;`);
    await expect(read()).rejects.toThrow("not available");
    await db.exec(`RESET ROLE; UPDATE task_requests SET handyman_id='${worker}'; SET ROLE authenticated;`);
    expect((await read()).rows).toHaveLength(1);
    // Assigned worker receives client details; client receives worker details.
    expect((await participantContact()).rows[0]?.name).toBe("Client");
    await asUser(client);
    expect((await participantContact()).rows[0]?.name).toBe("Worker");
    await asUser(other);
    await expect(participantContact()).rejects.toThrow("only to the client");
    await asUser("");
    await expect(participantContact()).rejects.toThrow("Sign in");
    await db.exec(`RESET ROLE; UPDATE task_requests SET handyman_id=null;`);
    await asUser(client);
    await expect(participantContact()).rejects.toThrow("only to the client");
    await db.exec("RESET ROLE; SET ROLE anon;");
    await expect(participantContact()).rejects.toThrow("permission denied");
    await expect(read()).rejects.toThrow("permission denied");
  } finally { await db.close(); }
});
