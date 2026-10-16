// Server-only job-board scan pipeline: search sources → new postings → keyword match → extract → create lead.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SCORING_RULES } from "@/lib/mock-data";
import { AiPauseError, extractWithAi, type Extracted } from "./ai.server";
import { SOURCE_LABELS, fetchSource, matchKeywords, type RawPosting } from "./sources.server";

const MAX_EXTRACT_PER_RUN = 6;
const LOCK_MINUTES = 10;
// Some boards ask for gentle polling; minimum minutes between fetches per source.
const MIN_INTERVAL: Record<string, number> = { remotive: 360, arbeitnow: 25, hackernews: 25, adzuna: 25 };
const pts = (k: string) => SCORING_RULES.find((r) => r.key === k)?.points ?? 0;
const DM = /\b(cto|ceo|founder|co-founder|vp|head of|director|chief)\b/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface ScanResult { workspaceId: string; status: string; fetched: number; matched: number; newPostings: number; leadsCreated: number; log: string[] }

export async function runScanForAll(admin: SupabaseClient) {
  const s: Db = (admin as Db).schema("software");
  const { data, error } = await s.from("job_scan_settings").select("workspace_id").eq("enabled", true);
  if (error) throw error;
  const results: ScanResult[] = [];
  for (const row of data ?? []) results.push(await runScan(admin, row.workspace_id, "schedule"));
  return results;
}

export async function runScan(admin: SupabaseClient, workspaceId: string, trigger: "schedule" | "manual"): Promise<ScanResult> {
  const s: Db = (admin as Db).schema("software");
  const log: string[] = [];
  const res: ScanResult = { workspaceId, status: "skipped", fetched: 0, matched: 0, newPostings: 0, leadsCreated: 0, log };

  await s.from("job_scan_settings").upsert({ workspace_id: workspaceId }, { onConflict: "workspace_id", ignoreDuplicates: true });
  const nowIso = new Date().toISOString();
  const { data: locked, error: le } = await s.from("job_scan_settings")
    .update({ locked_until: new Date(Date.now() + LOCK_MINUTES * 60e3).toISOString(), ...(trigger === "manual" ? { paused_reason: null } : {}) })
    .eq("workspace_id", workspaceId).or(`locked_until.is.null,locked_until.lt.${nowIso}`).select("*");
  if (le) throw le;
  const settings = locked?.[0];
  if (!settings) { log.push("Another scan is already running."); return res; }

  const { data: run } = await s.from("job_scan_runs").insert({ workspace_id: workspaceId, trigger }).select("id").single();
  try {
    const keywords: string[] = (settings.keywords ?? []).filter(Boolean);
    if (!keywords.length) throw new Error("No keywords configured");
    const { data: srcRows } = await s.from("lead_sources").select("id,name,last_sync_at").eq("workspace_id", workspaceId).eq("kind", "job_board");

    // 1–2. Search sources & collect postings
    const all: RawPosting[] = [];
    await Promise.all((settings.sources as string[]).map(async (src) => {
      const label = SOURCE_LABELS[src] ?? src;
      const row = srcRows?.find((r: { name: string }) => r.name === label);
      if (row?.last_sync_at && trigger === "schedule" && Date.now() - new Date(row.last_sync_at).getTime() < (MIN_INTERVAL[src] ?? 25) * 60e3) {
        log.push(`${label}: checked recently, skipped`); return;
      }
      try {
        const items = await fetchSource(src, keywords, settings.adzuna_country ?? "us");
        all.push(...items);
        log.push(`${label}: ${items.length} postings`);
        if (row) await s.from("lead_sources").update({ last_sync_at: new Date().toISOString() }).eq("id", row.id);
      } catch (e) { log.push(`${label}: ${(e as Error).message}`); }
    }));
    res.fetched = all.length;

    // 3. Keyword matching, 4. new postings only (DB unique key dedupes)
    const matched = all.map((p) => ({ p, kws: matchKeywords(p, keywords) })).filter((x) => x.kws.length);
    res.matched = matched.length;
    const unique = new Map(matched.map((x) => [`${x.p.source}:${x.p.external_id}`, x]));
    if (unique.size) {
      const { data: inserted, error } = await s.from("job_postings").upsert(
        [...unique.values()].map(({ p, kws }) => ({ workspace_id: workspaceId, ...p, description: p.description.slice(0, 20000), matched_keywords: kws })),
        { onConflict: "workspace_id,source,external_id", ignoreDuplicates: true },
      ).select("id");
      if (error) throw error;
      res.newPostings = inserted?.length ?? 0;
    }

    // 5–7. Extract & create leads (bounded batch; backlog continues next run)
    if (settings.paused_reason) log.push(`Extraction paused: ${settings.paused_reason}`);
    else {
      const { data: queue } = await s.from("job_postings").select("*").eq("workspace_id", workspaceId).eq("status", "new").order("created_at").limit(MAX_EXTRACT_PER_RUN);
      for (const post of queue ?? []) {
        try {
          const ex = settings.use_ai ? await extractWithAi({ title: post.title, company: post.company_name, location: post.location, url: post.url, text: (post.description ?? "").slice(0, 6000) }) : ruleExtract(post);
          if (!ex.is_software_role) { await s.from("job_postings").update({ status: "skipped", extracted: ex, error: "Not a software role" }).eq("id", post.id); continue; }
          const companyId = await createLead(s, workspaceId, post, ex);
          await s.from("job_postings").update({ status: "processed", extracted: ex, company_id: companyId, error: null }).eq("id", post.id);
          res.leadsCreated++;
        } catch (e) {
          if (e instanceof AiPauseError) {
            if (e.status !== 429) await s.from("job_scan_settings").update({ paused_reason: e.message }).eq("workspace_id", workspaceId);
            log.push(e.message); break;
          }
          await s.from("job_postings").update({ status: "failed", error: (e as Error).message.slice(0, 500) }).eq("id", post.id);
        }
      }
    }
    res.status = "success";
  } catch (e) {
    res.status = "failed"; log.push((e as Error).message);
  } finally {
    if (run) await s.from("job_scan_runs").update({ finished_at: new Date().toISOString(), status: res.status, fetched: res.fetched, matched: res.matched, new_postings: res.newPostings, leads_created: res.leadsCreated, log, error: res.status === "failed" ? log.at(-1) : null }).eq("id", run.id);
    await s.from("job_scan_settings").update({ locked_until: null, last_run_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
  }
  return res;
}

function ruleExtract(post: { title: string; company_name: string | null; location: string | null; description: string | null }): Extracted {
  const text = post.description ?? "";
  const techs = ["React", "Node.js", "TypeScript", "JavaScript", "Python", "Django", "Ruby", "Rails", "Go", "Java", "PHP", "Laravel", "Vue", "Angular", "Next.js", "AWS", "GCP", "Azure", "PostgreSQL", "Docker", "Kubernetes"]
    .filter((t) => new RegExp(`\\b${t.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text));
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  return {
    company_name: post.company_name, company_domain: email ? email.split("@")[1]!.toLowerCase() : null, industry: null, company_location: post.location,
    employees_estimate: null, technologies: techs, requirements: [], seniority: /senior|sr\./i.test(post.title) ? "Senior" : null, employment_type: null,
    contact_name: null, contact_title: null, contact_email: email, contact_linkedin: null, is_software_role: true, summary: post.title,
  };
}

async function createLead(s: Db, ws: string, post: { title: string; source: string; url: string | null; company_name: string | null; location: string | null }, ex: Extracted) {
  const name = (ex.company_name || post.company_name || "").trim().slice(0, 120);
  if (!name) throw new Error("No company name found");
  const domain = ex.company_domain?.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  const sourceLabel = `Job board · ${SOURCE_LABELS[post.source] ?? post.source}`;

  let q = s.from("companies").select("id,lead_score,technologies").eq("workspace_id", ws).limit(1);
  q = domain ? q.or(`domain.eq.${domain},name.ilike.${name.replace(/[,()%]/g, "")}`) : q.ilike("name", name.replace(/[%_]/g, ""));
  const { data: found } = await q;
  let company = found?.[0];
  if (!company) {
    const { data, error } = await s.from("companies").insert({
      workspace_id: ws, name, domain, industry: ex.industry, employees: ex.employees_estimate ? Math.round(ex.employees_estimate) : null,
      location: ex.company_location ?? post.location, technologies: ex.technologies.slice(0, 12), lead_type: "Hiring developers", source: sourceLabel,
      stage: "New", lead_score: 0, last_activity_at: new Date().toISOString(),
    }).select("id,lead_score,technologies").single();
    if (error) throw error;
    company = data;
  } else if (ex.technologies.length) {
    await s.from("companies").update({ technologies: [...new Set([...(company.technologies ?? []), ...ex.technologies])].slice(0, 15) }).eq("id", company.id);
  }

  const { data: openLead } = await s.from("leads").select("id,lead_score").eq("company_id", company.id).eq("archived", false).not("stage", "in", "(Won,Lost)").limit(1);
  let lead = openLead?.[0];
  if (!lead) {
    const { data, error } = await s.from("leads").insert({ workspace_id: ws, company_id: company.id, title: `Hiring: ${post.title}`.slice(0, 200), source: sourceLabel, stage: "New", lead_score: 0 }).select("id,lead_score").single();
    if (error) throw error;
    lead = data;
  }

  const reqs = ex.requirements.slice(0, 3).join("; ");
  await s.from("signals").insert({ workspace_id: ws, company_id: company.id, lead_id: lead?.id ?? null, type: "hiring", source: "automated", title: `Hiring: ${post.title}`.slice(0, 120), description: `Hiring: ${post.title}${reqs ? ` — ${reqs}` : ""}`.slice(0, 500), strength: "high", source_url: post.url });

  let hasDm = false;
  if (ex.contact_name || ex.contact_email) {
    const [first, ...rest] = (ex.contact_name ?? ex.contact_email!.split("@")[0]!).split(" ");
    hasDm = DM.test(ex.contact_title ?? "");
    const { data: dup } = ex.contact_email ? await s.from("contacts").select("id").eq("workspace_id", ws).eq("email", ex.contact_email).limit(1) : { data: [] };
    let contactId = dup?.[0]?.id as string | undefined;
    if (!contactId) {
      const { data: ins } = await s.from("contacts").insert({ workspace_id: ws, company_id: company.id, first_name: first, last_name: rest.join(" ") || null, title: ex.contact_title, email: ex.contact_email, linkedin_url: ex.contact_linkedin, is_decision_maker: hasDm }).select("id").single();
      contactId = ins?.id;
    }
    if (contactId) {
      const { count: n } = await s.from("lead_contacts").select("contact_id", { count: "exact", head: true }).eq("lead_id", lead.id);
      await s.from("lead_contacts").upsert({ lead_id: lead.id, contact_id: contactId, workspace_id: ws, role: hasDm ? "Decision maker" : "Influencer", is_primary: !n }, { onConflict: "lead_id,contact_id", ignoreDuplicates: true });
    }
  }

  const { count } = await s.from("signals").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("type", "hiring");
  const emp = ex.employees_estimate ?? 0;
  const score = Math.min(100, pts("hiring") + ((count ?? 0) >= 2 ? pts("multi") : 0) + (ex.technologies.length ? pts("tech") : 0) + (emp >= 10 && emp <= 500 ? pts("size") : 0) + (hasDm ? pts("dm") : 0) + pts("recent"));
  await s.from("companies").update({ lead_score: Math.max(score, company.lead_score ?? 0), last_activity_at: new Date().toISOString() }).eq("id", company.id);
  await s.from("leads").update({ lead_score: Math.max(score, lead.lead_score ?? 0), last_activity_at: new Date().toISOString() }).eq("id", lead.id);
  await s.from("activities").insert({ workspace_id: ws, company_id: company.id, type: "Signal", summary: `New job posting found on ${SOURCE_LABELS[post.source] ?? post.source}: ${post.title}`.slice(0, 300) });
  return company.id as string;
}
