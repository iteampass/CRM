import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Call only with the user ID supplied by requireSupabaseAuth. */
export async function ensureTalentProfile(userId: string) {
  const lookup = () => supabaseAdmin.from("profiles")
    .select("id, workspace_id").eq("user_id", userId).maybeSingle();
  const { data: existing, error: lookupError } = await lookup();
  if (lookupError) throw new Error(`Could not load your profile: ${lookupError.message}`);
  if (existing) return existing;

  const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authError || !user?.email) throw new Error("Could not verify your account. Please sign in again.");
  const metadata = user.user_metadata ?? {};
  const field = (name: string) => typeof metadata[name] === "string" ? metadata[name] : "";
  // Metadata supplies display fields only; it never grants workspace access.
  // Ignore conflicts so concurrent requests cannot overwrite existing membership.
  const { error: insertError } = await supabaseAdmin.from("profiles").upsert({
    user_id: userId,
    email: user.email,
    first_name: field("first_name"),
    last_name: field("last_name"),
    phone: field("phone"),
    company_position: field("company_position"),
    workspace_id: null,
  }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) throw new Error(`Could not create your profile: ${insertError.message}`);
  const { data: profile, error } = await lookup();
  if (error || !profile) throw new Error("Could not load your profile. Please try again.");
  return profile;
}
