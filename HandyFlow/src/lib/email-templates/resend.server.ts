export interface ResendMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}

export async function sendResendEmail(message: ResendMessage, idempotencyKey?: string) {
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  if (!from) throw new Error("EMAIL_FROM is not configured with a verified sender");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify({ from, ...message }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => null) as { id?: string } | null;
  if (!response.ok || !data?.id) {
    // Do not forward provider response bodies, which can contain private data.
    throw new Error(`Email could not be sent (Resend status ${response.status}). Please try again or contact the administrator.`);
  }
  return data.id;
}
