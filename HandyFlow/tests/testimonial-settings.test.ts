import { test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const migration = (name: string) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

test("only application admins can save testimonial selection and visibility", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    `);
    await db.exec(migration("20260901103336_94ef8e33-d3e3-45a2-8445-45f7b59d0c69.sql"));
    await db.exec(migration("20260917112432_bd84acb1-6013-4fc4-b1d4-4a9761c3a2fe.sql"));
    await db.exec(migration("20260919120000_admin_testimonial_settings.sql"));
    const admin = "00000000-0000-4000-8000-000000000001";
    const user = "00000000-0000-4000-8000-000000000002";
    await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${admin}','admin@example.test'), ('${user}','user@example.test');
      INSERT INTO public.user_roles(user_id,role) VALUES ('${admin}','admin');
      SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${admin}',false);`);
    await db.exec(`INSERT INTO public.site_settings(key,value) VALUES ('testimonials','{"enabled":true,"signInTestimonialId":"selected"}')
      ON CONFLICT(key) DO UPDATE SET value=excluded.value;`);
    expect((await db.query<{value: unknown}>("SELECT value FROM site_settings WHERE key='testimonials'")).rows[0]?.value)
      .toEqual({enabled: true, signInTestimonialId: "selected"});
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${user}',false);`);
    await expect(db.exec(`INSERT INTO site_settings(key,value) VALUES ('testimonials','{}') ON CONFLICT(key) DO UPDATE SET value=excluded.value;`)).rejects.toThrow();
    await db.exec("RESET ROLE; SET ROLE anon;");
    await expect(db.exec("UPDATE site_settings SET value='{}' WHERE key='testimonials';")).rejects.toThrow();
  } finally {
    await db.close();
  }
});
