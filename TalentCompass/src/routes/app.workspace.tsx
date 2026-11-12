import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PrivilegeManagement } from "@/components/app/privilege-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { createInvitation, removeMember } from "@/lib/workspace.functions";

export const Route = createFileRoute("/app/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace admin - Talent Compass" },
      { name: "description", content: "Invite teammates and manage members of your Talent Compass workspace." },
      { property: "og:title", content: "Workspace admin - Talent Compass" },
      { property: "og:description", content: "Invite teammates and manage members of your Talent Compass workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspaceAdminPage,
});

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_position: string;
  user_id: string | null;
}

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  expires_at: string;
  revoked: boolean;
  used_by: string | null;
  created_at: string;
}

function WorkspaceAdminPage() {
  const { workspaceName, isAdmin, workspaceId, refresh: refreshWorkspace } = useWorkspace();
  const invite = useServerFn(createInvitation);
  const remove = useServerFn(removeMember);

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: m }, { data: i }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, email, company_position, user_id"),
      supabase.from("workspace_invitations").select("*").order("created_at", { ascending: false }),
    ]);
    setMembers((m ?? []) as Member[]);
    setInvitations((i ?? []) as Invitation[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load, workspaceId]);

  const inviteLink = (invitation: Invitation) => {
    const url = new URL("/auth", window.location.origin);
    url.searchParams.set("tab", "signup");
    url.searchParams.set("invite", invitation.code);
    if (invitation.email) url.searchParams.set("email", invitation.email);
    return url.toString();
  };

  const doInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await invite({ data: { email: email.trim() } });
      setEmail("");
      if (result.emailStatus === "sent") {
        toast.success(`Invitation emailed to ${result.invitation.email}`);
      } else if (result.emailStatus === "failed") {
        toast.warning(`Invitation created. ${result.emailError} You can still copy its link to share it.`, { duration: 15000 });
      } else {
        toast.success("Invitation link created");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invitation");
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").update({ revoked: true }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation revoked");
      await load();
    }
  };

  const doRemove = async (member: Member) => {
    if (!window.confirm(`Remove ${member.first_name} ${member.last_name} from this workspace?`)) return;
    try {
      await remove({ data: { profileId: member.id } });
      toast.success("Member removed");
      await load();
      await refreshWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove member");
    }
  };

  return (
    <AppShell
      title={`Workspace ${workspaceName}`}
      subtitle="Invite teammates and manage who can see this workspace"
    >
      {!isAdmin ? (
        <p className="text-muted-foreground text-sm">
          Only workspace admins can manage invitations and members.
        </p>
      ) : (
        <Tabs defaultValue="members">
          <TabsList className="mb-4"><TabsTrigger value="members">Members & invitations</TabsTrigger><TabsTrigger value="privileges">Privilege management</TabsTrigger></TabsList>
          <TabsContent value="members">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-border bg-surface space-y-4 rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Invitations</h2>
            <form onSubmit={doInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="invitation-email" className="text-xs">Email (optional)</Label>
                <Input
                  id="invitation-email"
                  type="email"
                  maxLength={254}
                  disabled={busy}
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? (email.trim() ? "Sending…" : "Creating…") : (email.trim() ? "Send invitation" : "Create link")}
              </Button>
            </form>

            <p className="text-muted-foreground text-xs">Enter an email to send the invitation immediately, or leave it blank to create a shareable link.</p>

            <ul className="divide-border divide-y">
              {invitations.map((row) => {
                const expired = new Date(row.expires_at) < new Date();
                const state = row.revoked
                  ? "Revoked"
                  : row.used_by
                    ? "Used"
                    : expired
                      ? "Expired"
                      : "Active";
                return (
                  <li key={row.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.email || "Anyone with the link"}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {state} · expires {new Date(row.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {state === "Active" ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Copy invitation link"
                          onClick={() => {
                            void navigator.clipboard.writeText(inviteLink(row));
                            toast.success("Invitation link copied");
                          }}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void doRevoke(row.id)}>
                          Revoke
                        </Button>
                      </>
                    ) : null}
                  </li>
                );
              })}
              {invitations.length === 0 ? (
                <li className="text-muted-foreground py-3 text-sm">No invitations yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="border-border bg-surface space-y-4 rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Members</h2>
            <ul className="divide-border divide-y">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.email} · {member.company_position || "-"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="Remove member"
                    onClick={() => void doRemove(member)}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </li>
              ))}
              {members.length === 0 ? (
                <li className="text-muted-foreground py-3 text-sm">No members yet.</li>
              ) : null}
            </ul>
          </section>
        </div>
          </TabsContent>
          <TabsContent value="privileges"><PrivilegeManagement members={members} /></TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
