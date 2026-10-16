// Server-only: AI extraction of company / requirements / contact info from a job posting.
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, Output, jsonSchema, streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export interface Extracted {
  company_name: string | null;
  company_domain: string | null;
  industry: string | null;
  company_location: string | null;
  employees_estimate: number | null;
  technologies: string[];
  requirements: string[];
  seniority: string | null;
  employment_type: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  is_software_role: boolean;
  summary: string;
}

import type { JSONSchema7 } from "@ai-sdk/provider";
const nullable = (type: "string" | "number"): JSONSchema7 => ({ type: [type, "null"] });
const schema = jsonSchema<Extracted>({
  type: "object",
  additionalProperties: false,
  properties: {
    company_name: nullable("string"),
    company_domain: nullable("string"),
    industry: nullable("string"),
    company_location: nullable("string"),
    employees_estimate: nullable("number"),
    technologies: { type: "array", items: { type: "string" } },
    requirements: { type: "array", items: { type: "string" } },
    seniority: nullable("string"),
    employment_type: nullable("string"),
    contact_name: nullable("string"),
    contact_title: nullable("string"),
    contact_email: nullable("string"),
    contact_linkedin: nullable("string"),
    is_software_role: { type: "boolean" },
    summary: { type: "string" },
  },
  required: ["company_name", "company_domain", "industry", "company_location", "employees_estimate", "technologies", "requirements", "seniority", "employment_type", "contact_name", "contact_title", "contact_email", "contact_linkedin", "is_software_role", "summary"],
});

/** Thrown when the AI gateway says to stop all work (credits / access). */
export class AiPauseError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function extractWithAi(posting: { title: string; company: string | null; location: string | null; url: string | null; text: string }): Promise<Extracted> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiPauseError("AI is not configured for this project", 401);
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      maxRetries: 0,
      instructions:
        "You extract facts from a job posting for a CRM. Use ONLY information stated in the posting. " +
        "Never guess: return null (or an empty list) for anything not explicitly present. " +
        "company_domain: bare domain like acme.com only if a company website/email appears. " +
        "technologies: concrete tools/languages/frameworks named. requirements: up to 6 short bullet-style requirements. " +
        "contact_*: only a real named recruiter/hiring person or email present in the text. " +
        "summary: one factual sentence (max 30 words) about the role.",
      messages: [{
        role: "user",
        content: `Title: ${posting.title}\nCompany (from job board): ${posting.company ?? "unknown"}\nLocation: ${posting.location ?? "unknown"}\nURL: ${posting.url ?? ""}\n\nPosting:\n${posting.text}`,
      }],
      output: Output.object({ schema }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    return (await result.output) as Extracted;
  } catch (e) {
    if (APICallError.isInstance(e) && (e.statusCode === 402 || e.statusCode === 403 || e.statusCode === 401)) {
      throw new AiPauseError(e.statusCode === 402 ? "Out of AI credits — add credits in Settings → Plans & credits." : `AI access blocked (${e.statusCode}).`, e.statusCode);
    }
    if (APICallError.isInstance(e) && e.statusCode === 429) throw new AiPauseError("AI rate limited — will continue next run.", 429);
    throw e;
  }
}
