import { test, expect } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { validateSession } from "../src/lib/validate-session";

function fixture(authError: unknown = null, profileError: unknown = null, profile: unknown = { id: "user" }) {
  let signOuts = 0;
  let enrollments = 0;
  const client = {
    rpc: async () => { enrollments++; return { error: null }; },
    auth: {
      getUser: async () => ({ data: { user: authError ? null : { id: "user" } }, error: authError }),
      signOut: async () => { signOuts++; return { error: null }; },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileError ? null : profile, error: profileError }) }) }) }),
  } as unknown as SupabaseClient<Database, "handyflow">;
  return { client, enrollments: () => enrollments, signOuts: () => signOuts };
}

test("network, rate limit and server errors preserve credentials", async () => {
  for (const error of [{ name: "AuthRetryableFetchError", status: 0 }, { status: 429 }, { status: 503 }]) {
    const f = fixture(error);
    await expect(validateSession(f.client)).rejects.toThrow("Unable to verify");
    expect(f.signOuts()).toBe(0);
  }
});
test("profile query failure preserves credentials and allows retry", async () => {
  const f = fixture(null, { code: "57014", message: "timeout" });
  await expect(validateSession(f.client)).rejects.toThrow("Unable to load");
  expect(f.signOuts()).toBe(0);
});
test("missing profile enrolls into HandyFlow without clearing credentials", async () => {
  const f = fixture(null, null, null);
  expect(await validateSession(f.client)).toEqual({ id: "user" });
  expect(f.enrollments()).toBe(1);
  expect(f.signOuts()).toBe(0);
});
test("invalid session clears credentials", async () => {
  for (const f of [fixture({ code: "user_not_found" }), fixture({ name: "AuthSessionMissingError" })]) {
    expect(await validateSession(f.client)).toBeNull();
    expect(f.signOuts()).toBe(1);
  }
});
test("valid account returns the user without signing out", async () => {
  const f = fixture();
  expect(await validateSession(f.client)).toEqual({ id: "user" });
  expect(f.signOuts()).toBe(0);
});

test("failed enrollment preserves the shared Auth session for retry", async () => {
  const f = fixture(null, null, null);
  f.client.rpc = (async () => ({ error: { message: "unavailable" } })) as unknown as typeof f.client.rpc;
  await expect(validateSession(f.client)).rejects.toThrow("Unable to set up");
  expect(f.signOuts()).toBe(0);
});
