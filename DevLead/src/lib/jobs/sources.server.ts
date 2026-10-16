// Server-only job-board adapters. Each returns normalized postings; no provider details leak elsewhere.
export interface RawPosting {
  source: string; external_id: string; url: string | null; title: string;
  company_name: string | null; location: string | null; description: string; posted_at: string | null;
}

export const SOURCE_LABELS: Record<string, string> = {
  remotive: "Remotive", arbeitnow: "Arbeitnow", hackernews: "Hacker News hiring", adzuna: "Adzuna",
};

export const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

async function getJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "DevLeadCRM/1.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function remotive(keywords: string[]): Promise<RawPosting[]> {
  const out: RawPosting[] = [];
  for (const kw of keywords) {
    const j = await getJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(kw)}&limit=50`);
    for (const r of j.jobs ?? []) out.push({
      source: "remotive", external_id: String(r.id), url: r.url, title: r.title, company_name: r.company_name ?? null,
      location: r.candidate_required_location ?? "Remote", description: stripHtml(r.description ?? ""), posted_at: r.publication_date ?? null,
    });
  }
  return out;
}

async function arbeitnow(): Promise<RawPosting[]> {
  const j = await getJson("https://www.arbeitnow.com/api/job-board-api");
  return (j.data ?? []).map((r: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    source: "arbeitnow", external_id: r.slug, url: r.url, title: r.title, company_name: r.company_name ?? null,
    location: r.remote ? `${r.location ?? ""} (remote)`.trim() : r.location ?? null, description: stripHtml(r.description ?? ""),
    posted_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : null,
  }));
}

async function hackernews(keywords: string[]): Promise<RawPosting[]> {
  const s = await getJson("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring&hitsPerPage=5");
  const story = (s.hits ?? []).find((h: { title?: string }) => /who is hiring/i.test(h.title ?? ""));
  if (!story) return [];
  const out: RawPosting[] = [];
  for (const kw of keywords) {
    const j = await getJson(`https://hn.algolia.com/api/v1/search?tags=comment,story_${story.objectID}&query=${encodeURIComponent(kw)}&hitsPerPage=50`);
    for (const c of j.hits ?? []) {
      if (c.parent_id !== Number(story.objectID)) continue; // top-level job comments only
      const text = stripHtml(c.comment_text ?? "");
      const first = text.split("\n")[0] ?? "";
      const parts = first.split("|").map((p) => p.trim()).filter(Boolean);
      out.push({
        source: "hackernews", external_id: String(c.objectID), url: `https://news.ycombinator.com/item?id=${c.objectID}`,
        title: parts.find((p) => /engineer|developer|stack|cto|programmer/i.test(p)) ?? parts[1] ?? first.slice(0, 100),
        company_name: parts[0]?.slice(0, 80) ?? null, location: parts.find((p) => /remote|onsite|hybrid|,/i.test(p)) ?? null,
        description: text, posted_at: c.created_at ?? null,
      });
    }
  }
  return out;
}

async function adzunaKeys(): Promise<{ id: string | undefined; key: string | undefined }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).schema("software").from("api_keys") // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("api_id,key").in("name", ["Adzune", "Adzuna", "adzuna"]).limit(1).maybeSingle();
    if (data?.api_id && data?.key) return { id: String(data.api_id).trim(), key: String(data.key).trim() };
  } catch { /* fall back to env */ }
  return { id: process.env["ADZUNA_APP_ID"], key: process.env["ADZUNA_APP_KEY"] };
}

async function adzuna(keywords: string[], country: string): Promise<RawPosting[]> {
  const { id, key } = await adzunaKeys();
  if (!id || !key) throw new Error("Not connected — Adzuna keys missing");
  const out: RawPosting[] = [];
  for (const kw of keywords) {
    const j = await getJson(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?app_id=${id}&app_key=${key}&results_per_page=50&max_days_old=3&what_phrase=${encodeURIComponent(kw)}&content-type=application/json`);
    for (const r of j.results ?? []) out.push({
      source: "adzuna", external_id: String(r.id), url: r.redirect_url, title: r.title, company_name: r.company?.display_name ?? null,
      location: r.location?.display_name ?? null, description: stripHtml(r.description ?? ""), posted_at: r.created ?? null,
    });
  }
  return out;
}

export async function fetchSource(source: string, keywords: string[], country: string): Promise<RawPosting[]> {
  switch (source) {
    case "remotive": return remotive(keywords);
    case "arbeitnow": return arbeitnow();
    case "hackernews": return hackernews(keywords);
    case "adzuna": return adzuna(keywords, country);
    default: return [];
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
export function matchKeywords(p: RawPosting, keywords: string[]) {
  const text = norm(`${p.title} ${p.description}`);
  const tight = text.replace(/\s/g, "");
  return keywords.filter((k) => { const n = norm(k); return n && (text.includes(n) || tight.includes(n.replace(/\s/g, ""))); });
}
