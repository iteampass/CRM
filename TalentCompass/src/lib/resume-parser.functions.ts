import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ParsedResume } from "@/lib/types";

const PARSE_ENDPOINT = "https://resumeparser.app/resume/parse";

/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

const period = (from: any, to: any): string => {
  const a = str(from);
  const b = str(to);
  if (!a && !b) return "";
  return `${a || "-"} – ${b || "Present"}`;
};

/** Map the provider payload onto the app's ParsedResume shape. */
const root = (raw: any) => raw?.parsed ?? raw?.data?.parsed ?? raw?.data ?? raw?.result ?? raw ?? {};

function mapParsed(raw: any): ParsedResume {
  const d = root(raw);
  const basics = d.basics ?? d.personal ?? {};
  const contact = d.contact ?? {};

  const links = [
    ...arr(d.profiles ?? basics.profiles).map((p: any) => ({
      label: str(p?.network ?? p?.label ?? "Profile"),
      url: str(p?.url ?? p?.link),
    })),
    ...["linkedin", "github", "twitter", "website", "portfolio"]
      .map((k) => ({ label: k, url: str(d[k] ?? basics[k] ?? contact[k]) }))
      .filter((l) => l.url),
  ].filter((l) => l.url);

  const experience = arr(d.work ?? d.experience ?? d.work_experience ?? d.employment_history).map(
    (e: any) => ({
      company: str(e?.company ?? e?.name ?? e?.employer),
      role: str(e?.position ?? e?.title ?? e?.role),
      period: str(e?.period) || period(e?.startDate ?? e?.start_date, e?.endDate ?? e?.end_date),
      description: str(
        e?.summary ??
          e?.description ??
          (Array.isArray(e?.responsibilities)
            ? e.responsibilities.join(" · ")
            : Array.isArray(e?.highlights)
              ? e.highlights.join(" · ")
              : ""),
      ),
    }),
  );

  const education = arr(d.education).map((e: any) => ({
    school: str(e?.institution ?? e?.institution_name ?? e?.school ?? e?.name),
    degree: [str(e?.studyType ?? e?.degree), str(e?.area ?? e?.field_of_study)]
      .filter(Boolean)
      .join(", "),
    period: str(e?.period) || period(e?.startDate ?? e?.start_date, e?.endDate ?? e?.end_date),
  }));

  const skills = arr(d.skills)
    .map((s: any) => (typeof s === "string" ? s : str(s?.name ?? s?.skill)))
    .filter(Boolean);

  const certifications = arr(d.certificates ?? d.certifications ?? d.courses)
    .map((c: any) => (typeof c === "string" ? c : str(c?.name ?? c?.title)))
    .filter(Boolean);

  const languages = arr(d.languages)
    .map((l: any) =>
      typeof l === "string"
        ? { name: l, level: "" }
        : { name: str(l?.language ?? l?.name), level: str(l?.fluency ?? l?.level) },
    )
    .filter((l) => l.name);

  let years = Number(
    d.derived?.years_of_experience ??
      d.total_experience_years ??
      d.yearsOfExperience ??
      d.years_of_experience ??
      0,
  );
  if (!Number.isFinite(years) || years <= 0) {
    const months = Number(d.total_experience_months ?? 0);
    years = Number.isFinite(months) && months > 0 ? Math.round(months / 12) : 0;
  }

  const location =
    str(typeof d.location === "string" ? d.location : "") ||
    [
      str(contact.location_city),
      str(contact.location_state),
      str(contact.location_country),
    ]
      .filter(Boolean)
      .join(", ") ||
    [str(basics.location?.city), str(basics.location?.countryCode)].filter(Boolean).join(", ");

  return {
    summary: str(d.summary ?? d.brief ?? basics.summary ?? d.objective ?? d.title),
    yearsOfExperience: Math.round(years),
    location,
    links,
    experience,
    education,
    skills,
    certifications,
    languages,
  };
}
/** Pull contact details out of the provider payload. */
function mapContact(raw: any): { firstName: string; lastName: string; email: string; phone: string } {
  const d = root(raw);
  const basics = d.basics ?? d.personal ?? {};
  const contact = d.contact ?? {};
  const full = str(d.name ?? basics.name ?? d.full_name ?? basics.full_name).trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = str(d.first_name ?? basics.first_name) || parts[0] || "";
  const lastName = str(d.last_name ?? basics.last_name) || (parts.length > 1 ? parts.slice(1).join(" ") : "");
  return {
    firstName,
    lastName,
    email: str(d.email ?? basics.email ?? d.email_address ?? contact.email),
    phone: str(d.phone ?? basics.phone ?? d.phone_number ?? d.mobile ?? contact.phone),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Parse a candidate's uploaded resume through resumeparser.app.
 * The API key is read server-side from the `api` table (id = 1).
 */
export const parseCandidateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { candidateId: string }) => {
    if (!input?.candidateId) throw new Error("candidateId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Authorize with the caller's RLS-bound client before using the service role.
    // The admin client is needed for the parser key and a temporary signed URL,
    // but must never turn a known UUID into cross-workspace access.
    const { data: allowed, error: permissionError } = await context.supabase.rpc("can_upload_candidate_resume", { _candidate_id: data.candidateId });
    if (permissionError || !allowed) throw new Error("You do not have permission to extract this candidate’s resume details.");

    const { data: accessibleCandidate, error: accessError } = await context.supabase
      .from("candidates")
      .select("id")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (accessError) throw new Error(accessError.message);
    if (!accessibleCandidate) throw new Error("Candidate not found or you do not have access to it");

    const { data: apiRow, error: apiError } = await supabaseAdmin
      .from("api")
      .select("api_key")
      .eq("id", 1)
      .maybeSingle();
    if (apiError) throw new Error(apiError.message);
    const apiKey = apiRow?.api_key;
    if (!apiKey) throw new Error("Resume parser API key is not configured");

    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("candidates")
      .select("id, resume_url, first_name, last_name, email, phone, resume_text")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (candErr) throw new Error(candErr.message);
    if (!candidate?.resume_url) throw new Error("This candidate has no resume file yet");

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(candidate.resume_url, 600);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "Could not open the stored resume file");
    }

    const res = await fetch(PARSE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ file: signed.signedUrl }).toString(),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`Resume parsing failed (${res.status}): ${bodyText.slice(0, 300)}`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(bodyText);
    } catch {
      throw new Error("Resume parser returned an unexpected response");
    }

    const parsed = mapParsed(raw);
    const contact = mapContact(raw);

    const blank = (v: string | null | undefined) => !v || !v.trim();
    const contactUpdate: Record<string, string> = {};
    if (blank(candidate.first_name) && contact.firstName) contactUpdate["first_name"] = contact.firstName;
    if (blank(candidate.last_name) && contact.lastName) contactUpdate["last_name"] = contact.lastName;
    if (blank(candidate.email) && contact.email) contactUpdate["email"] = contact.email;
    if (blank(candidate.phone) && contact.phone) contactUpdate["phone"] = contact.phone;

    // Keep the readable text version of the document when the provider returns it.
    const normalized = str((raw as any)?.normalized_text ?? (raw as any)?.text);
    if (blank(candidate.resume_text) && normalized) contactUpdate["resume_text"] = normalized;


    const { error: updateErr } = await supabaseAdmin
      .from("candidates")
      .update({
        parsed_resume_data: parsed as unknown as never,
        ...contactUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.candidateId);
    if (updateErr) throw new Error(updateErr.message);

    return parsed;
  });
