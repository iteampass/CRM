export function isSignupConfirmation(url: string): boolean {
  const parsed = new URL(url);
  return new URLSearchParams(parsed.hash.slice(1)).get("type") === "signup"
    || parsed.searchParams.get("confirmation") === "signup";
}

export async function clearConfirmationSession(auth: {
  getSession: () => Promise<{ error: unknown }>;
  signOut: (options: { scope: "local" }) => Promise<{ error: unknown }>;
}) {
  // Wait for Supabase to finish consuming the confirmation callback first.
  const session = await auth.getSession();
  const result = await auth.signOut({ scope: "local" });
  if (result.error) throw result.error;
  if (session.error) throw session.error;
}
