import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { LeadDialogs } from "@/components/crm/LeadDialogs";
import { toast } from "sonner";
import { Archive, ExternalLink, UserPlus, Globe, Linkedin, Mail, MessageSquarePlus, Phone, Sparkles, SquareCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyAvatar, IntentBadge, ScorePill, TechTags } from "@/components/crm/bits";
import { useEffect, useState } from "react";
import { activitiesFor, archiveCompanies, loadNotes, logContactAttempt, type Note, contactFor, contacts, getCompany, removeStakeholder, setStakeholder, STAGES, STAKEHOLDER_ROLES, updateStage, type Stage, type StakeholderRole } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { CompanySignals, RecentSignalsCard } from "@/components/crm/signals/CompanySignals";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  loader: ({ params }) => { const c = getCompany(params.id); if (!c) throw notFound(); return { c }; },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.c.name} — DevLead CRM` : "Lead not found — DevLead CRM";
    const d = loaderData ? `Lead profile, buying signals and contacts for ${loaderData.c.name}.` : "Lead not found.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  notFoundComponent: () => <div className="p-10 text-center"><p className="font-semibold">Lead not found</p><Link to="/leads" className="text-sm text-primary">Back to leads</Link></div>,
  errorComponent: () => <div className="p-10 text-center">Could not load this lead.</div>,
  component: LeadDetail,
});

function LeadDetail() {
  const { c } = Route.useLoaderData();
  const [, rerender] = useState(0);
  const people = contactFor(c.id);
  const others = contacts.filter((p) => p.companyId === c.companyId && !people.some((x) => x.id === p.id));
  const run = (p: Promise<unknown>, msg: string) => p.then(() => { rerender((n) => n + 1); toast.success(msg); }).catch((e) => toast.error(e.message));
  const total = c.breakdown.reduce((a, b) => a + b.points, 0);
  const [dlg, setDlg] = useState<"task" | "note" | "contact" | null>(null);
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  useEffect(() => { loadNotes(c.companyId).then(setNoteList).catch((e) => toast.error(e.message)); }, [c.companyId, tick]);
  const saved = () => { setTick((n) => n + 1); rerender((n) => n + 1); };
  const contact = () => {
    const p = people.find((x) => x.email);
    if (!p) { toast.info("No email on file — add a contact first"); return setDlg("contact"); }
    window.location.href = `mailto:${p.email}`;
    logContactAttempt(c.id, "Email", `${p.firstName} ${p.lastName}`.trim()).then(saved).catch((e) => toast.error(e.message));
  };
  const archive = () => {
    if (!window.confirm(`Archive ${c.name}? It will be hidden from leads and the pipeline.`)) return;
    archiveCompanies([c.id]).then(() => { toast.success("Lead archived"); navigate({ to: "/leads" }); }).catch((e) => toast.error(e.message));
  };
  return (
    <div className="mx-auto max-w-[1300px]">
      <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground">← Leads</Link>
      <div className="card-surface mt-2 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <CompanyAvatar name={c.name} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{c.name}</h1><IntentBadge score={c.leadScore} /></div>
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground"><a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary"><Globe className="h-3.5 w-3.5" />{c.domain}</a><span>{c.industry}</span><span>{c.location}</span><span>{c.employees} employees</span></p>
          </div>
          <div className="flex items-center gap-3"><div className="text-right"><p className="text-[11px] uppercase text-muted-foreground">Lead score</p></div><ScorePill score={c.leadScore} size="lg" /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={contact}><Mail className="h-4 w-4" />Contact</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg("task")}><SquareCheck className="h-4 w-4" />Add task</Button>
          <Button size="sm" variant="outline" onClick={() => setDlg("note")}><MessageSquarePlus className="h-4 w-4" />Add note</Button>
          <Select defaultValue={c.stage} onValueChange={(v) => updateStage(c.id, v as Stage).then(() => toast.success(`Stage changed to ${v}`)).catch((e) => toast.error(e.message))}><SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Button size="sm" variant="outline" onClick={() => setDlg("contact")}><UserPlus className="h-4 w-4" />Add contact</Button>
          <Button size="sm" variant="ghost" onClick={archive}><Archive className="h-4 w-4" />Archive</Button>
        </div>
      </div>
      <LeadDialogs leadId={c.id} kind={dlg} onClose={() => setDlg(null)} onSaved={saved} />
      <div className="mt-4" />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Tabs defaultValue="overview">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="signals">Buying signals ({c.signals.length})</TabsTrigger><TabsTrigger value="contacts">Stakeholders ({people.length})</TabsTrigger><TabsTrigger value="notes">Notes ({noteList.length})</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="ai">AI analysis</TabsTrigger></TabsList>
          <TabsContent value="overview" className="card-surface p-5">
            <p className="text-sm">{c.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {[["Industry", c.industry], ["Employees", c.employees], ["Size band", c.employees <= 50 ? "Small (1–50)" : c.employees <= 200 ? "Mid (51–200)" : "Large (200+)"], ["Location", c.location], ["Founded", c.founded], ["Funding", c.funding ?? "Unknown"], ["Lead source", c.source], ["Owner", c.owner], ["Detected", c.detected]].map(([k, v]) => <div key={k as string}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">Technologies</p><div className="mt-1"><TechTags tech={c.technologies} max={10} /></div>
            <div className="mt-5"><RecentSignalsCard companyId={c.companyId} /></div>
          </TabsContent>
          <TabsContent value="signals"><CompanySignals companyId={c.companyId} onChanged={() => rerender((n) => n + 1)} /></TabsContent>
          <TabsContent value="contacts" className="card-surface divide-y">
            {people.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{p.firstName[0]}{p.lastName[0]}</div>
                <div className="flex-1"><p className="font-semibold">{p.firstName} {p.lastName}{p.isPrimary && <span className="ml-2 rounded bg-highlight/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-highlight">Primary</span>}</p><p className="text-xs text-muted-foreground">{p.title} · {p.department}</p></div>
                <div className="flex gap-2 text-muted-foreground">{p.email && <a href={`mailto:${p.email}`} title={p.email}><Mail className="h-4 w-4" /></a>}{p.phone && <span title={p.phone}><Phone className="h-4 w-4" /></span>}{p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /></a>}</div>
                <Select value={p.role} onValueChange={(v) => run(setStakeholder(c.id, p.id, v as StakeholderRole, p.isPrimary), `${p.firstName} is now ${v}`)}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent>{STAKEHOLDER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                {!p.isPrimary && <Button size="sm" variant="ghost" className="text-xs" onClick={() => run(setStakeholder(c.id, p.id, p.role, true), `${p.firstName} is the primary contact`)}>Make primary</Button>}
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Remove from lead" onClick={() => run(removeStakeholder(c.id, p.id), `${p.firstName} removed from this lead`)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            {people.length === 0 && <p className="p-4 text-sm text-muted-foreground">No stakeholders on this lead yet.</p>}
            <div className="p-4"><Button size="sm" variant="outline" onClick={() => setDlg("contact")}><UserPlus className="h-4 w-4" />New contact</Button></div>
            {others.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-4">
                <span className="text-xs text-muted-foreground">Add someone from {c.name}:</span>
                {others.map((p) => <Button key={p.id} size="sm" variant="outline" className="text-xs" onClick={() => run(setStakeholder(c.id, p.id, "Influencer", people.length === 0), `${p.firstName} added`)}>+ {p.firstName} {p.lastName}{p.title ? ` · ${p.title}` : ""}</Button>)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="notes" className="card-surface divide-y">
            {noteList.map((n) => <div key={n.id} className="p-4"><p className="whitespace-pre-wrap text-sm">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{n.when}</p></div>)}
            {noteList.length === 0 && <div className="p-4 text-sm text-muted-foreground">No notes yet. <button className="text-primary" onClick={() => setDlg("note")}>Add the first note</button></div>}
          </TabsContent>
          <TabsContent value="activity" className="card-surface p-5">
            <ol className="relative space-y-4 border-l pl-5">{activitiesFor(c.companyId).map((a, i) => <li key={i}><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-card bg-primary" /><p className="text-sm"><span className="font-semibold">{a.type}</span> — {a.text}</p><p className="text-xs text-muted-foreground">{a.when}</p></li>)}</ol>
          </TabsContent>
          <TabsContent value="ai" className="card-surface p-5">
            <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-highlight" />AI lead analysis</p><Button size="sm" variant="outline" disabled>Generate (coming in Phase 3)</Button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-success">Verified evidence</p><ul className="mt-2 space-y-1 text-sm">{c.signals.map((s) => <li key={s.id}>• {s.description} <span className="text-xs text-muted-foreground">({s.source})</span></li>)}</ul></div>
              <div className="rounded-lg border border-dashed border-highlight/50 p-3"><p className="text-xs font-semibold uppercase text-highlight">AI-inferred (preview)</p><p className="mt-2 text-sm">Likely project type: <b>{c.leadType}</b>. Likely decision maker: <b>{people[0]?.title}</b>. Suggested approach: {c.nextAction}</p></div>
            </div>
          </TabsContent>
        </Tabs>
        <aside className="card-surface h-fit p-4">
          <p className="font-semibold">Score breakdown</p>
          <ul className="mt-3 space-y-1.5 text-sm">{c.breakdown.map((b) => <li key={b.label} className="flex justify-between"><span className="text-muted-foreground">{b.label}</span><span className="font-mono font-semibold text-success">+{b.points}</span></li>)}</ul>
          <div className="mt-3 flex justify-between border-t pt-2 text-sm"><span>Raw points {total}</span><span className="font-bold">Score {c.leadScore}</span></div>
          <p className="mt-2 text-[11px] text-muted-foreground">Rules are configurable in Settings.</p>
        </aside>
      </div>
    </div>
  );
}
