import { afterEach, expect, mock, test } from "bun:test";
import { sendResendEmail } from "../src/lib/email-templates/resend.server";
const originalFetch = globalThis.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = originalFrom;
});
const message = { to: ["admin@example.com"], subject: "Pro request", html: "<p>Enable Pro</p>", text: "Enable Pro", reply_to: "user@example.com" };
test("requires server credentials without making a network call", async () => {
  delete process.env.RESEND_API_KEY;
  const transport = mock(async () => new Response());
  globalThis.fetch = transport as unknown as typeof fetch;
  await expect(sendResendEmail(message)).rejects.toThrow("RESEND_API_KEY");
  expect(transport).not.toHaveBeenCalled();
});
test("sends the Resend payload with reply-to and idempotency", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "HandyFlow <mail@example.com>";
  const transport = mock(async (_url: unknown, _init: RequestInit) => Response.json({ id: "email-id" }));
  globalThis.fetch = transport as unknown as typeof fetch;
  expect(await sendResendEmail(message, "request-123")).toBe("email-id");
  const [url, init] = transport.mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  expect(init.headers).toMatchObject({ Authorization: "Bearer test-key", "Idempotency-Key": "request-123" });
  expect(JSON.parse(init.body as string)).toEqual({ from: process.env.EMAIL_FROM, ...message });
});
test("reports failed delivery without exposing provider response details", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "mail@example.com";
  globalThis.fetch = mock(async () => Response.json({ message: "private information" }, { status: 403 })) as unknown as typeof fetch;
  await expect(sendResendEmail(message)).rejects.toThrow("Resend status 403");
});
test("does not treat a malformed success response as sent", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "mail@example.com";
  globalThis.fetch = mock(async () => Response.json({})) as unknown as typeof fetch;
  await expect(sendResendEmail(message)).rejects.toThrow("could not be sent");
});
