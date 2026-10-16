// CRM data store — loaded from the Supabase "software" schema for the signed-in workspace.
// Arrays are mutated in place by loadCrm() so screens can read them synchronously.
import { supabase } from "@/integrations/supabase/client";

export type Intent = "Low" | "Medium" | "High" | "Very High";
export type Stage = "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
export const STAGES: Stage[] = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
export type ContactStatus = "Not contacted" | "Contacted" | "Replied" | "Qualified" | "Not interested" | "Do not contact";

export interface Signal { id: string; type: string; title: string; description: string; source: string; date: string; strength: "Weak" | "Moderate" | "Strong"; level: "low" | "medium" | "high"; status: string; url: string }
export interface Contact { id: string; companyId: string; firstName: string; lastName: string; title: string; department: string; email?: string | undefined; phone?: string | undefined; linkedin?: string | undefined; status: ContactStatus; lastContacted?: string | undefined }
// A lead = one sales opportunity at one company, with many stakeholder contacts.
// `id` is the lead id; `companyId` points at the company record.
export interface Company {
  id: string; companyId: string; stakeholders: Stakeholder[]; name: string; domain: string; industry: string; location: string; employees: number; description: string;
  technologies: string[]; funding?: string | undefined; founded: number; leadScore: number; leadType: string; stage: Stage; status: string;
  owner: string; source: string; detected: string; lastActivity: string; signals: Signal[]; dealValue: number; nextTask?: string | undefined;
  nextAction: string; breakdown: { label: string; points: number }[];
}
export const STAKEHOLDER_ROLES = ["Decision maker", "Technical", "Product owner", "Procurement", "Champion", "Influencer"] as const;
export type StakeholderRole = (typeof STAKEHOLDER_ROLES)[number];
export interface Stakeholder extends Contact { role: StakeholderRole; isPrimary: boolean }
export type Lead = Company;
export interface Activity { companyId: string | null; type: string; text: string; when: string }
export interface Task { id: string; companyId: string | null; title: string; company: string; due: string; priority: string; done: boolean }

export const SCORING_RULES = [
  { key: "hiring", label: "Developer hiring signal", points: 25 },
  { key: "multi", label: "Multiple developer openings", points: 15 },
  { key: "funding", label: "Recent funding", points: 20 },
  { key: "launch", label: "New product launch", points: 15 },
  { key: "saas", label: "SaaS company", points: 10 },
  { key: "tech", label: "Relevant technology match", points: 10 },
  { key: "size", label: "Company size within target range", points: 10 },
  { key: "dm", label: "Decision maker identified", points: 5 },
  { key: "recent", label: "Recent activity", points: 5 },
];
export const INTENT_BANDS = [
  { min: 85, label: "Very High" as Intent },
  { min: 70, label: "High" as Intent },
  { min: 40, label: "Medium" as Intent },
  { min: 0, label: "Low" as Intent },
];
export const intentFor = (score: number): Intent => INTENT_BANDS.find((b) => score >= b.min)!.label;

export const companies: Company[] = [];
export const contacts: Contact[] = [];
export const activities: Activity[] = [];
export const tasks: Task[] = [];
export const workspace = { id: "", name: "", role: "" };

/** Stakeholders on a lead, primary contact first. */
export const contactFor = (leadId: string): Stakeholder[] => companies.find((l) => l.id === leadId)?.stakeholders ?? [];
export const getCompany = (leadId: string) => companies.find((c) => c.id === leadId);
export const leadForCompany = (companyId: string | null | undefined) => companies.find((l) => l.companyId === companyId);
export const activitiesFor = (companyId: string) => activities.filter((a) => a.companyId === companyId);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = () => (supabase as any).schema("software");

const ago = (iso?: string | null) => {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 864e5;
  if (d < 1 / 24) return "just now";
  if (d < 1) return `${Math.round(d * 24)}h ago`;
  if (d < 7) return `${Math.round(d)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
};
const dueLabel = (date?: string | null) => {
  if (!date) return "No due date";
  const today = new Date().toISOString().slice(0, 10);
  const nice = new Date(date + "T00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
  if (date < today) return `Overdue · ${nice}`;
  if (date === today) return "Today";
  return nice;
};
const strength = (l: string): Signal["strength"] => (l === "high" ? "Strong" : l === "medium" ? "Moderate" : "Weak");
const POINTS: Record<string, number> = { high: 20, medium: 12, low: 5 };
const dept = (t: string) => (/CTO|Engineer|Technical|IT|Developer/i.test(t) ? "Engineering" : /Product/i.test(t) ? "Product" : "Executive");
const fill = <T,>(arr: T[], items: T[]) => { arr.splice(0, arr.length, ...items); };

let loaded: Promise<void> | null = null;
let generation = 0;
export function resetCrm() { generation++; loaded = null; fill(companies, []); fill(contacts, []); fill(activities, []); fill(tasks, []); workspace.id = ""; workspace.name = ""; workspace.role = ""; }
export function loadCrm(force = false) {
  if (!loaded || force) loaded = doLoad(generation).catch((e) => { loaded = null; throw e; });
  return loaded;
}

async function doLoad(startGeneration: number) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Not signed in");
  const { data: wsId, error: je } = await db().rpc("join_demo_workspace");
  if (je) throw je;
  const s = db();
  const [ws, mem, co, ct, sg, dl, ac, tk, ld, lc] = await Promise.all([
    s.from("workspaces").select("id,name").eq("id", wsId).single(),
    s.from("workspace_members").select("role").eq("workspace_id", wsId).eq("user_id", auth.user.id).single(),
    s.from("companies").select("*").eq("workspace_id", wsId),
    s.from("contacts").select("*").eq("workspace_id", wsId),
    s.from("signals").select("*").eq("workspace_id", wsId).order("detected_at", { ascending: false }),
    s.from("deals").select("*").eq("workspace_id", wsId),
    s.from("activities").select("*").eq("workspace_id", wsId).order("occurred_at", { ascending: false }),
    s.from("tasks").select("*").eq("workspace_id", wsId).eq("done", false).order("due_date"),
    s.from("leads").select("*").eq("workspace_id", wsId).eq("archived", false).order("lead_score", { ascending: false }),
    s.from("lead_contacts").select("*").eq("workspace_id", wsId),
  ]);
  for (const r of [ws, mem, co, ct, sg, dl, ac, tk, ld, lc]) if (r.error) throw r.error;
  if (startGeneration !== generation) throw new Error("Session changed. Please reload your workspace.");
  workspace.id = wsId; workspace.name = ws.data.name; workspace.role = mem.data.role;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type R = any;
  const contactRows: Contact[] = ct.data.map((p: R) => ({
    id: p.id, companyId: p.company_id, firstName: p.first_name, lastName: p.last_name ?? "", title: p.title ?? "", department: dept(p.title ?? ""),
    email: p.email ?? undefined, phone: p.phone ?? undefined, linkedin: p.linkedin_url ?? undefined, status: (p.status ?? "Not contacted") as ContactStatus,
    lastContacted: p.last_contacted_at ? new Date(p.last_contacted_at).toLocaleDateString() : undefined,
  }));
  // decision makers first
  contactRows.sort((a, b) => Number(ct.data.find((x: R) => x.id === b.id).is_decision_maker) - Number(ct.data.find((x: R) => x.id === a.id).is_decision_maker));
  const taskRows: Task[] = tk.data.map((t: R) => ({ id: t.id, companyId: t.company_id, title: t.title, company: co.data.find((c: R) => c.id === t.company_id)?.name ?? "", due: dueLabel(t.due_date), priority: t.priority, done: t.done }));

  fill(companies, ld.data.map((l: R): Company | null => {
    const c = co.data.find((x: R) => x.id === l.company_id);
    if (!c) return null;
    const stakeholders: Stakeholder[] = lc.data.filter((x: R) => x.lead_id === l.id)
      .map((x: R) => { const p = contactRows.find((k) => k.id === x.contact_id); return p ? { ...p, role: x.role, isPrimary: x.is_primary } : null; })
      .filter(Boolean).sort((a: Stakeholder, b: Stakeholder) => Number(b.isPrimary) - Number(a.isPrimary));
    const signals: Signal[] = sg.data.filter((x: R) => x.company_id === c.id && x.status !== "dismissed").map((x: R) => ({ id: x.id, type: String(x.type).replace(/_/g, " "), title: x.title, description: x.description ?? x.title, source: x.source_url ? (() => { try { return new URL(x.source_url).hostname; } catch { return x.source; } })() : x.source, date: ago(x.detected_at), strength: strength(x.strength), level: x.strength, status: x.status, url: x.source_url ?? "" }));
    const deals = dl.data.filter((d: R) => (d.lead_id ?? null) === l.id || (!d.lead_id && d.company_id === c.id));
    const nextTask = taskRows.find((t) => t.companyId === c.id)?.title;
    const hasDm = stakeholders.some((p) => p.role === "Decision maker");
    return {
      id: l.id, companyId: c.id, stakeholders, name: c.name, domain: c.domain ?? "", industry: c.industry ?? "—", location: c.location ?? "—", employees: c.employees ?? 0,
      description: `${c.name} is a ${c.employees ?? "?"}-person ${c.industry ?? ""} company based in ${c.location ?? "—"}.`,
      technologies: c.technologies ?? [], funding: c.funding ?? undefined, founded: new Date(c.created_at).getFullYear(), leadScore: l.lead_score,
      leadType: c.lead_type ?? "—", stage: l.stage, status: l.stage === "Lost" ? "Archived" : l.stage === "New" ? "New" : "Active",
      owner: l.owner_name ?? "Unassigned", source: l.source ?? c.source ?? "Manual", detected: ago(l.created_at), lastActivity: ago(l.last_activity_at),
      signals, dealValue: deals.reduce((a: number, d: R) => a + Number(d.value), 0), nextTask,
      nextAction: nextTask ?? (signals[0] ? `Reach out referencing: ${signals[0].description}` : "Research the company and find a decision maker."),
      breakdown: [...signals.map((x) => ({ label: x.type, points: POINTS[x.level] ?? 5 })), ...(hasDm ? [{ label: "Decision maker identified", points: 5 }] : [])],
    };
  }).filter(Boolean) as Company[]);
  fill(contacts, contactRows);
  fill(activities, ac.data.map((a: R) => ({ companyId: a.company_id, type: a.type, text: a.summary, when: ago(a.occurred_at) })));
  fill(tasks, taskRows);
}

export async function updateStage(leadId: string, stage: Stage) {
  const s = db();
  const { error } = await s.from("leads").update({ stage, last_activity_at: new Date().toISOString() }).eq("id", leadId);
  if (error) throw error;
  await s.from("deals").update({ stage }).eq("lead_id", leadId);
  const c = getCompany(leadId);
  const companyId = c?.companyId ?? null;
  const prev = c?.stage;
  if (c) { c.stage = stage; c.lastActivity = "just now"; }
  await s.from("activities").insert({ workspace_id: workspace.id, company_id: companyId, type: "Status", summary: `Stage changed ${prev} → ${stage}` });
  activities.unshift({ companyId, type: "Status", text: `Stage changed ${prev} → ${stage}`, when: "just now" });
}

export async function archiveCompanies(ids: string[]) {
  const { error } = await db().from("leads").update({ archived: true }).in("id", ids);
  if (error) throw error;
  fill(companies, companies.filter((c) => !ids.includes(c.id)));
}

/** Attach a company contact to a lead (or update their role). */
export async function setStakeholder(leadId: string, contactId: string, role: StakeholderRole, isPrimary = false) {
  const s = db();
  if (isPrimary) await s.from("lead_contacts").update({ is_primary: false }).eq("lead_id", leadId);
  const { error } = await s.from("lead_contacts").upsert({ lead_id: leadId, contact_id: contactId, workspace_id: workspace.id, role, is_primary: isPrimary });
  if (error) throw error;
  const l = getCompany(leadId); const p = contacts.find((c) => c.id === contactId);
  if (!l || !p) return;
  if (isPrimary) l.stakeholders.forEach((x) => (x.isPrimary = false));
  const ex = l.stakeholders.find((x) => x.id === contactId);
  if (ex) { ex.role = role; ex.isPrimary = isPrimary; } else l.stakeholders.push({ ...p, role, isPrimary });
  l.stakeholders.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export async function removeStakeholder(leadId: string, contactId: string) {
  const { error } = await db().from("lead_contacts").delete().eq("lead_id", leadId).eq("contact_id", contactId);
  if (error) throw error;
  const l = getCompany(leadId);
  if (l) l.stakeholders = l.stakeholders.filter((x) => x.id !== contactId);
}

// ---- Real CRUD from the lead page ----
export interface Note { id: string; companyId: string | null; body: string; when: string }
export const notes: Note[] = [];
export async function loadNotes(companyId: string) {
  const { data, error } = await db().from("notes").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((n): Note => ({ id: n.id, companyId: n.company_id, body: n.body, when: ago(n.created_at) }));
}
async function logActivity(companyId: string | null, type: string, summary: string, contactId?: string) {
  await db().from("activities").insert({ workspace_id: workspace.id, company_id: companyId, contact_id: contactId ?? null, type, summary });
  activities.unshift({ companyId, type, text: summary, when: "just now" });
  const l = leadForCompany(companyId); if (l) l.lastActivity = "just now";
}
export async function createNote(leadId: string, body: string) {
  const l = getCompany(leadId); if (!l) throw new Error("Lead not found");
  const { data: u } = await supabase.auth.getUser();
  const { error } = await db().from("notes").insert({ workspace_id: workspace.id, company_id: l.companyId, body, created_by: u.user?.id ?? null });
  if (error) throw error;
  await logActivity(l.companyId, "Note", body.length > 120 ? body.slice(0, 117) + "…" : body);
}
export async function createTask(leadId: string, t: { title: string; due: string; priority: string }) {
  const l = getCompany(leadId); if (!l) throw new Error("Lead not found");
  const { data, error } = await db().from("tasks").insert({ workspace_id: workspace.id, company_id: l.companyId, title: t.title, due_date: t.due || null, priority: t.priority }).select().single();
  if (error) throw error;
  tasks.push({ id: data.id, companyId: l.companyId, title: t.title, company: l.name, due: dueLabel(t.due || null), priority: t.priority, done: false });
  l.nextTask ??= t.title;
  await logActivity(l.companyId, "Task", `Task created: ${t.title}`);
}
export async function createContact(leadId: string, p: { firstName: string; lastName: string; title: string; email: string; phone: string; linkedin: string; role: StakeholderRole }) {
  const l = getCompany(leadId); if (!l) throw new Error("Lead not found");
  const { data, error } = await db().from("contacts").insert({
    workspace_id: workspace.id, company_id: l.companyId, first_name: p.firstName, last_name: p.lastName || null, title: p.title || null,
    email: p.email || null, phone: p.phone || null, linkedin_url: p.linkedin || null, is_decision_maker: p.role === "Decision maker",
  }).select().single();
  if (error) throw error;
  contacts.push({ id: data.id, companyId: l.companyId, firstName: p.firstName, lastName: p.lastName, title: p.title, department: dept(p.title), email: p.email || undefined, phone: p.phone || undefined, linkedin: p.linkedin || undefined, status: "Not contacted" });
  await setStakeholder(leadId, data.id, p.role, l.stakeholders.length === 0);
  await logActivity(l.companyId, "Contact", `Added ${p.firstName} ${p.lastName}`.trim() + (p.title ? ` (${p.title})` : ""), data.id);
}
export async function logContactAttempt(leadId: string, channel: string, contactName: string) {
  const l = getCompany(leadId); if (!l) return;
  await logActivity(l.companyId, channel, `Reached out to ${contactName}`);
  if (l.stage === "New") await updateStage(leadId, "Contacted");
}
/** Records that an email was sent to a contact: updates status, last contacted date and activity history. */
export async function recordEmailSent(contactId: string, subject: string) {
  const p = contacts.find((x) => x.id === contactId); if (!p) throw new Error("Contact not found");
  const now = new Date();
  const status: ContactStatus = p.status === "Not contacted" ? "Contacted" : p.status;
  const { error } = await db().from("contacts").update({ status, last_contacted_at: now.toISOString() }).eq("id", contactId);
  if (error) throw error;
  p.status = status; p.lastContacted = now.toLocaleDateString();
  await logActivity(p.companyId, "Email", `Emailed ${p.firstName} ${p.lastName}`.trim() + (subject ? `: ${subject}` : ""), contactId);
  const l = leadForCompany(p.companyId);
  if (l && l.stage === "New") await updateStage(l.id, "Contacted");
}
