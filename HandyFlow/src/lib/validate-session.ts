import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Only explicit credential failures justify clearing a session. Network errors,
// rate limits and server failures must leave credentials available for retry.
const invalidCredentials = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
  "bad_jwt",
]);

export async function validateSession(client: SupabaseClient<Database, "handyflow">) {
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || (error.code && invalidCredentials.has(error.code))) {
      await client.auth.signOut({ scope: "local" });
      return null;
    }
    throw new Error("Unable to verify your account. Please try again.", { cause: error });
  }
  if (!data.user) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error("Unable to load your profile. Please try again.", { cause: profileError });
  }
  if (!profile) {
    // Visiting HandyFlow with a verified shared Auth account explicitly joins
    // this app. Other apps never call this RPC and receive no HandyFlow role.
    const { error: enrollmentError } = await client.rpc("enroll");
    if (enrollmentError) {
      throw new Error("Unable to set up your HandyFlow profile. Please try again or contact support.", { cause: enrollmentError });
    }
  }
  return data.user;
}
