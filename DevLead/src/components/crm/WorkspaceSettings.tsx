import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { workspace } from "@/lib/mock-data";

// software schema isn't in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabase as any).schema("software");

type Role = "owner" | "admin" | "manager" | "member";
const ASSIGNABLE: Role[] = ["admin", "manager", "member"];
const ROLE_INFO: Record<Role, string> = {
  owner: "Full control, billing. Can't be removed.",
  admin: "Manage members, roles, scoring and lead sources.",
  manager: "Work all leads, pipeline and tasks.",
  member: "Work leads, contacts and tasks.",
};
type Member = { user_id: string; email: string; full_name: string | null; avatar_url: string; role: Role; joined_at: string };
type Invite = { id: string; email: string; role: Role; created_at: string };

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-[220px_1fr]">
      <div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{text}</p></div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export function WorkspaceSettings() {
  const isAdmin = workspace.role === "owner" || workspace.role === "admin";
  const [me, setMe] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState(workspace.name);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("member");
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    const [{ data: u }, m, i] = await Promise.all([
      supabase.auth.getUser(),
      db().rpc("list_members", { _ws: workspace.id }),
      db().from("workspace_invitations").select("id,email,role,created_at").eq("workspace_id", workspace.id).order("created_at"),
    ]);
    setMe(u.user?.id ?? "");
    if (m.error) { toast.error(`Couldn't load members: ${m.error.message}`); setMembers([]); return; }
    const rows = m.data as (Omit<Member, "avatar_url"> & { avatar_path: string | null })[];
    const paths = rows.map((r) => r.avatar_path).filter(Boolean) as string[];
    const urls: Record<string, string> = {};
    if (paths.length) {
      const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
      data?.forEach((d) => { if (d.path && d.signedUrl) urls[d.path] = d.signedUrl; });
    }
    setMembers(rows.map((r) => ({ ...r, avatar_url: r.avatar_path ? urls[r.avatar_path] ?? "" : "" })));
    setInvites((i.data ?? []) as Invite[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    if (error) { toast.error(error.message); return; }
    toast.success(ok);
    load();
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v || v.length > 80) { toast.error("Workspace name must be 1–80 characters."); return; }
    const { error } = await db().from("workspaces").update({ name: v }).eq("id", workspace.id);
    if (error) { toast.error(error.message); return; }
    workspace.name = v;
    toast.success("Workspace renamed");
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = invEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || em.length > 255) { toast.error("Enter a valid email address."); return; }
    if (members?.some((m) => m.email.toLowerCase() === em)) { toast.error("That person is already a member."); return; }
    const { data: u } = await supabase.auth.getUser();
    await act(() => db().from("workspace_invitations").insert({ workspace_id: workspace.id, email: em, role: invRole, invited_by: u.user?.id }), `Invitation added for ${em}`);
    setInvEmail("");
  };

  return (
    <div className="space-y-5">
      <Section title="Workspace" text={isAdmin ? "Name shown to everyone in this workspace." : "Only admins can rename the workspace."}>
        <form onSubmit={saveName} className="flex gap-2">
          <Input value={name} maxLength={80} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} />
          {isAdmin && <Button type="submit" variant="outline" disabled={name.trim() === workspace.name}>Save</Button>}
        </form>
      </Section>

      <Section title="Members" text="Everyone with access to this workspace and their role.">
        {!members ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
        ) : (
          <div className="divide-y rounded-md border">
            {members.map((m) => {
              const label = m.full_name || m.email;
              const editable = isAdmin && m.role !== "owner" && m.user_id !== me;
              return (
                <div key={m.user_id} className="flex flex-wrap items-center gap-3 p-3">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground">{label.slice(0, 2)}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}{m.user_id === me && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email} · joined {new Date(m.joined_at).toLocaleDateString()}</p>
                  </div>
                  {editable ? (
                    <>
                      <Select value={m.role} onValueChange={(r) => act(() => db().from("workspace_members").update({ role: r }).eq("workspace_id", workspace.id).eq("user_id", m.user_id), `${label} is now ${r}`)}>
                        <SelectTrigger className="h-8 w-32 capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" aria-label={`Remove ${label}`} onClick={() => setConfirm({ title: `Remove ${label}?`, text: "They will lose access to this workspace immediately.", run: () => act(() => db().from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", m.user_id), `${label} removed`) })}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  ) : <Badge variant="secondary" className="capitalize">{m.role}</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Invitations" text={isAdmin ? "Invitations expire after 7 days. People join with the chosen role after verifying that email." : "Pending invitations. Only admins can invite people."}>
        {isAdmin && (
          <form onSubmit={invite} className="flex flex-wrap gap-2">
            <Input type="email" required placeholder="colleague@company.com" className="min-w-48 flex-1" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
            <Select value={invRole} onValueChange={(r) => setInvRole(r as Role)}>
              <SelectTrigger className="w-32 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="submit"><UserPlus className="mr-2 h-4 w-4" />Invite</Button>
          </form>
        )}
        {invites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invitations.</p> : (
          <div className="divide-y rounded-md border">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.email}</span>
                <Badge variant="outline" className="capitalize">{i.role}</Badge>
                <span className="text-xs text-muted-foreground">{Date.now() - new Date(i.created_at).getTime() >= 7 * 86400000 ? "Expired — cancel and invite again" : `Expires ${new Date(new Date(i.created_at).getTime() + 7 * 86400000).toLocaleDateString()}`}</span>
                {isAdmin && <Button size="sm" variant="ghost" onClick={() => setConfirm({ title: `Cancel invitation for ${i.email}?`, text: "They won't be added to this workspace when they sign up.", run: () => act(() => db().from("workspace_invitations").delete().eq("id", i.id), "Invitation cancelled") })}>Cancel</Button>}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">No email is sent automatically — share the sign-up link with them yourself.</p>
      </Section>

      <Section title="Roles" text="What each role can do.">
        <div className="space-y-2">
          {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
            <div key={r} className="flex items-start gap-3 text-sm"><Badge variant="secondary" className="w-20 justify-center capitalize">{r}</Badge><span className="text-muted-foreground">{ROLE_INFO[r]}</span></div>
          ))}
        </div>
      </Section>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.text}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm?.run(); setConfirm(null); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
