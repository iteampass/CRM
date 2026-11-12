/** Server-only invitation delivery; recipients and codes come from the saved invitation. */
export function invitationEmailConfig() {
  const apiKey = process.env["RESEND_API_KEY"]?.trim();
  const from = process.env["CONTACT_EMAIL_FROM"]?.trim();
  const appUrl = process.env["APP_URL"]?.trim();
  if (!apiKey || !from || !appUrl) {
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !from && "CONTACT_EMAIL_FROM",
      !appUrl && "APP_URL",
    ].filter(Boolean).join(", ");
    throw new Error(`Invitation email is not configured. Missing: ${missing}. After editing .env, stop and restart the local server; hosted apps need these values in their server environment.`);
  }
  const url = new URL(appUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("APP_URL must be the application's HTTP or HTTPS address.");
  }
  return { apiKey, from, origin: url.origin };
}

export async function sendInvitationEmail(
  config: ReturnType<typeof invitationEmailConfig>,
  invitation: { id: string; email: string | null; code: string; expires_at: string },
) {
  const url = new URL('/auth', config.origin);
  url.searchParams.set('tab', 'signup');
  url.searchParams.set('invite', invitation.code);
  if (invitation.email) url.searchParams.set('email', invitation.email);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `workspace-invitation/${invitation.id}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from: config.from,
      to: [invitation.email],
      subject: 'You are invited to Talent Compass',
      text: `You have been invited to join a workspace on Talent Compass.\n\nAccept your invitation:\n${url.toString()}\n\nSign in or create an account to join.\nInvitation code: ${invitation.code}\nExpires: ${new Date(invitation.expires_at).toUTCString()}\n\nIf you weren't expecting this invitation, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { name?: string };
    // Expose actionable categories, never raw provider responses or credentials.
    const messages: Record<string, string> = {
      validation_error: "Resend rejected the sender or recipient. Verify the sender domain; the Resend test sender only delivers to your account email.",
      restricted_api_key: "The Resend API key does not have permission to send from this domain.",
      invalid_api_key: "The Resend API key is invalid. Update RESEND_API_KEY and restart the server.",
      missing_api_key: "Resend did not accept the API key. Check RESEND_API_KEY and restart the server.",
      rate_limit_exceeded: "Resend's sending rate limit was reached. Please try again later.",
    };
    throw new Error(messages[detail.name ?? ""] ?? `Resend rejected the invitation (HTTP ${response.status}). Check the sender domain and API key permissions in Resend.`);
  }
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error('Email provider did not confirm the invitation');
}
