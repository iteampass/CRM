import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Play, X } from "lucide-react";
import { PageHeader } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db, loadCrm, workspace } from "@/lib/mock-data";
import { scanJobBoardsNow } from "@/lib/jobs/jobs.functions";

export const Route = createFileRoute("/_authenticated/lead-sources")({
  head: () => ({ meta: [
    { title: "Lead Sources — DevLead CRM" },
    { name: "description", content: "Job boards scanned every 30 minutes for companies hiring developers." },
    { property: "og:title", content: "Lead Sources — DevLead CRM" },
    { property: "og:description", content: "Job boards scanned every 30 minutes for companies hiring developers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LeadSourcesPage,
});

const SOURCES = [
  { key: "remotive", label: "Remotive", note: "Remote tech jobs · checked every 6h (their limit)" },
  { key: "arbeitnow", label: "Arbeitnow", note: "Europe & remote jobs" },
  { key: "hackernews", label: "Hacker News hiring", note: "Monthly “Who is hiring” thread" },
  { key: "adzuna", label: "Adzuna", note: "Connected with your saved Adzuna key" },
];
const ago = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never");

function LeadSourcesPage() {
  const qc = useQueryClient();
  const scan = useServerFn(scanJobBoardsNow);
  const [running, setRunning] = useState(false);
  const [kw, setKw] = useState("");
  const isAdmin = workspace.role === "owner" || workspace.role === "admin";

  const settings = useQuery({ queryKey: ["job-settings", workspace.id], queryFn: async () => {
    const { data, error } = await db().from("job_scan_settings").select("*").eq("workspace_id", workspace.id).maybeSingle();
    if (error) throw error; return data;
  } });
  const runs = useQuery({ queryKey: ["job-runs", workspace.id], queryFn: async () => {
    const { data, error } = await db().from("job_scan_runs").select("*").eq("workspace_id", workspace.id).order("started_at", { ascending: false }).limit(8);
    if (error) throw error; return data;
  } });
  const postings = useQuery({ queryKey: ["job-postings", workspace.id], queryFn: async () => {
    const { data, error } = await db().from("job_postings").select("id,source,title,company_name,url,matched_keywords,status,error,company_id,created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw error; return data;
  } });

  const save = async (patch: Record<string, unknown>) => {
    const { error } = await db().from("job_scan_settings").upsert({ workspace_id: workspace.id, ...settings.data, ...patch }, { onConflict: "workspace_id" });
    if (error) { toast.error(`Couldn't save: ${error.message}`); return; }
    toast.success("Saved"); qc.invalidateQueries({ queryKey: ["job-settings"] });
  };
  const s = settings.data;
  const keywords: string[] = s?.keywords ?? [];
  const sources: string[] = s?.sources ?? [];

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await scan({ data: { workspaceId: workspace.id } });
      if (r.status === "skipped") toast.info(r.log[0] ?? "Scan skipped");
      else if (r.status === "failed") toast.error(`Scan failed: ${r.log.at(-1)}`);
      else toast.success(`Scan done: ${r.matched} matching, ${r.newPostings} new, ${r.leadsCreated} leads created`);
      await loadCrm(true);
    } catch (e) { toast.error((e as Error).message); }
    finally { setRunning(false); qc.invalidateQueries(); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Lead Sources" description="Job boards are scanned every 30 minutes. Matching postings become leads automatically."
        actions={isAdmin && <Button onClick={runNow} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running ? "Scanning…" : "Scan now"}</Button>} />

      {s?.paused_reason && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Reading postings is paused: {s.paused_reason} Press “Scan now” to resume.</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-surface space-y-4 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div><h2 className="font-semibold">Job board scanner</h2><p className="text-xs text-muted-foreground">Last run: {ago(s?.last_run_at)}</p></div>
            {settings.isLoading ? <Skeleton className="h-5 w-10" /> : <Switch checked={!!s?.enabled} disabled={!isAdmin} onCheckedChange={(v) => save({ enabled: v })} aria-label="Scanner on" />}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Keywords</p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => <Badge key={k} variant="secondary" className="gap-1">{k}{isAdmin && <button aria-label={`Remove ${k}`} onClick={() => save({ keywords: keywords.filter((x) => x !== k) })}><X className="h-3 w-3" /></button>}</Badge>)}
              {!keywords.length && !settings.isLoading && <span className="text-xs text-muted-foreground">No keywords — add one so the scanner can match postings.</span>}
            </div>
            {isAdmin && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = kw.trim(); if (v && !keywords.includes(v)) save({ keywords: [...keywords, v] }); setKw(""); }}>
              <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Add keyword, e.g. React developer" className="h-9 max-w-xs" maxLength={60} />
              <Button type="submit" variant="outline" size="sm">Add</Button>
            </form>}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Use AI to read postings</p><p className="text-xs text-muted-foreground">Pulls out company, requirements and contacts. Only stated facts are kept.</p></div>
            <Switch checked={!!s?.use_ai} disabled={!isAdmin} onCheckedChange={(v) => save({ use_ai: v })} aria-label="Use AI" />
          </div>
        </section>

        <section className="card-surface p-4">
          <h2 className="mb-3 font-semibold">Job sites</h2>
          <div className="space-y-3">
            {SOURCES.map((src) => (
              <div key={src.key} className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-medium">{src.label}</p><p className="text-xs text-muted-foreground">{src.note}</p></div>
                <Switch checked={sources.includes(src.key)} disabled={!isAdmin} aria-label={src.label}
                  onCheckedChange={(v) => save({ sources: v ? [...sources, src.key] : sources.filter((x) => x !== src.key) })} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-surface overflow-hidden">
        <h2 className="border-b p-4 font-semibold">Recent scans</h2>
        {runs.isLoading ? <div className="p-4"><Skeleton className="h-16" /></div> : !runs.data?.length ? <p className="p-4 text-sm text-muted-foreground">No scans yet. Press “Scan now” to run the first one.</p> : (
          <div className="divide-y text-sm">
            {runs.data.map((r: { id: string; started_at: string; status: string; trigger: string; fetched: number; matched: number; new_postings: number; leads_created: number; log: string[] }) => (
              <details key={r.id} className="px-4 py-2">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="w-32 text-muted-foreground">{ago(r.started_at)}</span>
                  <Badge variant={r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge>
                  <span className="text-xs text-muted-foreground">{r.trigger}</span>
                  <span className="font-mono text-xs">{r.fetched} found · {r.matched} matched · {r.new_postings} new · {r.leads_created} leads</span>
                </summary>
                <ul className="mt-2 list-disc pl-6 text-xs text-muted-foreground">{(r.log ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="card-surface overflow-hidden">
        <h2 className="border-b p-4 font-semibold">Matched job postings</h2>
        {postings.isLoading ? <div className="p-4"><Skeleton className="h-24" /></div> : !postings.data?.length ? <p className="p-4 text-sm text-muted-foreground">No matching postings yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">Job</th><th className="p-3">Company</th><th className="p-3">Site</th><th className="p-3">Keywords</th><th className="p-3">Status</th></tr></thead>
              <tbody className="divide-y">
                {postings.data.map((p: { id: string; title: string; url: string | null; company_name: string | null; source: string; matched_keywords: string[]; status: string; error: string | null; company_id: string | null }) => (
                  <tr key={p.id}>
                    <td className="max-w-xs p-3"><a href={p.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">{p.title}<ExternalLink className="h-3 w-3 shrink-0" /></a></td>
                    <td className="p-3">{p.company_id ? <Link to="/leads/$id" params={{ id: p.company_id }} className="text-primary hover:underline">{p.company_name ?? "View lead"}</Link> : p.company_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{SOURCES.find((x) => x.key === p.source)?.label ?? p.source}</td>
                    <td className="p-3 text-xs">{p.matched_keywords.join(", ")}</td>
                    <td className="p-3"><Badge variant={p.status === "failed" ? "destructive" : p.status === "processed" ? "default" : "outline"} title={p.error ?? ""}>{p.status === "processed" ? "Lead created" : p.status === "new" ? "Waiting" : p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
