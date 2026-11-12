import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(10000),
});

export const sendContactMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"]?.trim();
    const from = process.env["CONTACT_EMAIL_FROM"]?.trim();
    const to = process.env["CONTACT_EMAIL_TO"]?.trim();

    if (!apiKey || !from || !to || !z.string().email().safeParse(to).success) {
      return { success: false as const, error: "Email delivery is not configured yet. Please try again later." };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: data.email,
          subject: "Talent Compass contact request",
          text: `Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
        }),
      });
      if (!response.ok) {
        console.error("Contact email rejected by provider", response.status);
        return { success: false as const, error: "Your message could not be sent. Please try again later." };
      }
      const result = await response.json() as { id?: string };
      if (!result.id) throw new Error("Missing email confirmation");
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Email delivery could not be confirmed. Please try again later." };
    }
  });
