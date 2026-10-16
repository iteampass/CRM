import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Draft an outreach email body from the subject, using only verified CRM facts. */
export const draftEmailWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ contactId: z.string().uuid(), subject: z.string().trim().min(1).max(150) }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (context.supabase as any).schema("software");
    const { data: p, error } = await s.from("contacts").select("*").eq("id", data.contactId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Contact not found");
    const [{ data: c }, { data: sg }] = await Promise.all([
      s.from("companies").select("*").eq("id", p.company_id).maybeSingle(),
      s.from("signals").select("type,title,description").eq("company_id", p.company_id).neq("status", "dismissed").order("detected_at", { ascending: false }).limit(5),
    ]);
    const facts = [
      `Recipient: ${p.first_name} ${p.last_name ?? ""}${p.title ? `, ${p.title}` : ""}`,
      c ? `Company: ${c.name}${c.industry ? ` (${c.industry})` : ""}${c.location ? `, ${c.location}` : ""}` : "Company: unknown",
      c?.technologies?.length ? `Technologies: ${c.technologies.join(", ")}` : "",
      c?.funding ? `Funding: ${c.funding}` : "",
      ...(sg ?? []).map((x: { type: string; title: string; description: string | null }) => `Signal (${x.type}): ${x.description ?? x.title}`),
    ].filter(Boolean).join("\n");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { APICallError, streamText } = await import("ai");
    let runId: string | undefined;
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1", apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (input, init) => {
        const h = new Headers(init?.headers);
        if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
        const r = await fetch(input, { ...init, headers: h });
        runId ??= r.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
        return r;
      },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        system:
          "You write concise, friendly B2B cold emails for a software development agency/freelancer. " +
          "Write ONLY the email body (greeting to sign-off placeholder '[Your name]'), 80-150 words, plain text, no subject line. " +
          "The email must match the given subject. Use ONLY the verified facts provided; never invent projects, funding, technologies, people or numbers. " +
          "If facts are sparse, keep it general. End with a light call to action.",
        messages: [{ role: "user", content: `Subject: ${data.subject}\n\nVerified facts:\n${facts}` }],
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const text = (await result.text).trim();
      if (!text) throw new Error("AI returned no draft. Please try again later.");
      return { body: text };
    } catch (e) {
      if (APICallError.isInstance(e)) {
        if (e.statusCode === 402) throw new Error("Out of AI credits — add credits in Settings → Plans & credits.");
        if (e.statusCode === 429) throw new Error("AI is busy right now — try again in a moment.");
        if (e.statusCode === 403) throw new Error("AI access is blocked for this workspace.");
      }
      throw e;
    }
  });
