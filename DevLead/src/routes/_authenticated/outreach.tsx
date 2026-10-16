import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db, workspace, contacts, leadForCompany } from "@/lib/mock-data";
import { PageHeader, EmptyState } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/outreach")({
  head: () => ({ meta: [
    { title: "Outreach — DevLead CRM" },
    { name: "description", content: "Track emails, LinkedIn messages and calls with replies and follow-up dates." },
    { property: "og:title", content: "Outreach — DevLead CRM" },
    { property: "og:description", content: "Track emails, LinkedIn messages and calls with replies and follow-up dates." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OutreachPage,
});

const CHANNELS = ["Email", "LinkedIn", "Phone", "Other"];
const STATUSES = ["Sent", "Replied", "No reply", "Follow-up due", "Closed"];

interface Row { id: string; company_id: string | null; contact_id: string | null; channel: string; subject: string | null; message: string | null; status: string; reply: string | null; sent_at: string; follow_up_date: string | null; companies?: { name: string } | null; contacts?: { first_name: string; last_name: string | null; title: string | null } | null }

const sel = "h-9 rounded-md border bg-background px-2 text-sm";

function OutreachPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState<Row | null>(null);

  const load = async () => {
    const { data, error } = await db().from("outreach").select("*, companies(name), contacts(first_name,last_name,title)").eq("workspace_id", workspace.id).order("sent_at", { ascending: false });
    if (error) setError(error.message); else setRows(data);
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(() => (rows ?? []).filter((r) => {
    if (channel && r.channel !== channel) return false;
    if (status && r.status !== status) return false;
    const hay = `${r.subject ?? ""} ${r.message ?? ""} ${r.companies?.name ?? ""} ${r.contacts?.first_name ?? ""} ${r.contacts?.last_name ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [rows, q, channel, status]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = { total: rows?.length ?? 0, replied: rows?.filter((r) => r.status === "Replied").length ?? 0, due: rows?.filter((r) => r.follow_up_date && r.follow_up_date <= today && r.status !== "Closed" && r.status !== "Replied").length ?? 0 };

  const setRowStatus = async (r: Row, s: string) => {
    const { error } = await db().from("outreach").update({ status: s }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setRows((p) => p?.map((x) => (x.id === r.id ? { ...x, status: s } : x)) ?? null);
    toast.success("Status updated");
  };
  const remove = async (r: Row) => {
    if (!confirm("Delete this outreach entry?")) return;
    const { error } = await db().from("outreach").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setRows((p) => p?.filter((x) => x.id !== r.id) ?? null);
    toast.success("Outreach deleted");
  };

  return (
    <div className="p-6">
      <PageHeader title="Outreach" description="Every message you sent yourself — nothing is sent automatically." actions={<Button onClick={() => setOpen(true)}>Log outreach</Button>} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[["Total", stats.total], ["Replies", stats.replied], ["Follow-ups due", stats.due]].map(([l, v]) => (
          <div key={l} className="card-surface p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono text-2xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Search subject, company, person…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className={sel} value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">All channels</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {error ? <p className="text-sm text-destructive">Couldn't load outreach: {error}</p>
        : !rows ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : list.length === 0 ? <EmptyState title="No outreach yet" text="Log an email, LinkedIn message or call to start your timeline." action={<Button onClick={() => setOpen(true)}>Log outreach</Button>} />
        : (
          <ol className="card-surface divide-y">
            {list.map((r) => {
              const lead = leadForCompany(r.company_id);
              const overdue = r.follow_up_date && r.follow_up_date <= today && !["Replied", "Closed"].includes(r.status);
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 p-4">
                  <span className="mt-0.5 w-20 shrink-0 rounded bg-secondary px-2 py-0.5 text-center text-xs font-medium">{r.channel}</span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen2(r)}>
                    <p className="truncate text-sm font-semibold">{r.subject || "(no subject)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.contacts ? `${r.contacts.first_name} ${r.contacts.last_name ?? ""}`.trim() : "—"}
                      {r.contacts?.title ? ` · ${r.contacts.title}` : ""} · {r.companies?.name ?? "—"} · {new Date(r.sent_at).toLocaleDateString()}
                    </p>
                    {r.reply && <p className="mt-1 text-xs text-success">↩ {r.reply}</p>}
                  </button>
                  <div className="flex items-center gap-2">
                    {r.follow_up_date && <span className={`text-xs ${overdue ? "font-semibold text-highlight" : "text-muted-foreground"}`}>Follow up {r.follow_up_date}</span>}
                    <select className={sel} value={r.status} onChange={(e) => setRowStatus(r, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                    {lead && <Button asChild size="sm" variant="ghost"><Link to="/leads/$id" params={{ id: lead.id }}>Lead</Link></Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      <LogDialog open={open} onOpenChange={setOpen} onSaved={load} />
      <Dialog open={!!open2} onOpenChange={(o) => !o && setOpen2(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open2?.subject || "Outreach"}</DialogTitle></DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{open2?.message || "No message saved."}</p>
          {open2?.reply && <div className="rounded-md bg-secondary p-3 text-sm"><p className="mb-1 text-xs font-semibold">Reply</p>{open2.reply}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const empty = { contactId: "", channel: "Email", subject: "", message: "", status: "Sent", reply: "", followUp: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const c = contacts.find((x) => x.id === f.contactId);
    if (!c) { toast.error("Choose a contact"); return; }
    setBusy(true);
    const { error } = await db().from("outreach").insert({ workspace_id: workspace.id, company_id: c.companyId, contact_id: c.id, channel: f.channel, subject: f.subject || null, message: f.message || null, status: f.status, reply: f.reply || null, follow_up_date: f.followUp || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Outreach logged");
    setF(empty); onOpenChange(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log outreach</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <select className={`${sel} w-full`} value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}>
            <option value="">Select contact…</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.title ? `— ${c.title}` : ""}</option>)}
          </select>
          <div className="flex gap-2">
            <select className={`${sel} flex-1`} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
            <select className={`${sel} flex-1`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <Input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <Textarea placeholder="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <Textarea placeholder="Reply (optional)" value={f.reply} onChange={(e) => setF({ ...f, reply: e.target.value })} />
          <label className="block text-xs text-muted-foreground">Follow-up date<Input type="date" value={f.followUp} onChange={(e) => setF({ ...f, followUp: e.target.value })} /></label>
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
