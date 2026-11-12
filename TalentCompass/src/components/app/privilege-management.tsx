import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
};
type Role = "position_admin" | "interview_group";
export function PrivilegeManagement({ members }: { members: Member[] }) {
  const { workspaceId, refresh } = useWorkspace();
  const [selected, setSelected] = useState("");
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [grants, setGrants] = useState<{ position_id: string; profile_id: string; role: Role }[]>(
    [],
  );
  const [candidateGrants, setCandidateGrants] = useState<{ profile_id: string; can_create: boolean; can_view: boolean }[]>([]);
  const [draftCandidates, setDraftCandidates] = useState<{ can_create: boolean; can_view: boolean } | null>(null);
  const [draftAdmin, setDraftAdmin] = useState<boolean | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, Role | "none">>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const member = members.find((m) => m.id === selected);
  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [p, w, g, c] = await Promise.all([
        supabase.from("positions").select("id, name").eq("workspace_id", workspaceId).order("name"),
        supabase.from("workspace").select("workspace_admins").eq("id", workspaceId).single(),
        supabase.from("position_members").select("position_id, profile_id, role"),
        supabase.from("candidate_privileges").select("profile_id, can_create, can_view"),
      ]);
      if (p.error || w.error || g.error || c.error) throw p.error || w.error || g.error || c.error;
      setCandidateGrants(c.data ?? []);
      setPositions(p.data ?? []);
      setAdmins(w.data?.workspace_admins ?? []);
      setGrants(g.data ?? []);
    } catch {
      setError("Could not load privileges. Contact your system administrator if this persists.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);
  useEffect(() => {
    void load();
  }, [load]);
  const savedAdmin = !!member?.user_id && admins.includes(member.user_id);
  const savedRole = (positionId: string) =>
    grants.find((grant) => grant.profile_id === selected && grant.position_id === positionId)
      ?.role ?? "none";
  const changedRoles = Object.entries(draftRoles).filter(([id, role]) => role !== savedRole(id));
  const adminChanged = draftAdmin !== null && draftAdmin !== savedAdmin;
  const savedCandidates = candidateGrants.find((g) => g.profile_id === selected) ?? { can_create: false, can_view: false };
  const candidatesChanged = draftCandidates !== null && (draftCandidates.can_create !== savedCandidates.can_create || draftCandidates.can_view !== savedCandidates.can_view);
  const dirty = adminChanged || changedRoles.length > 0 || candidatesChanged;
  const cancel = () => {
    setDraftCandidates(null);
    setDraftAdmin(null);
    setDraftRoles({});
  };

  const apply = async () => {
    if (busy || !member || !dirty) return;
    setBusy(true);
    let applied = 0;
    try {
      for (const [positionId, role] of changedRoles) {
        const result =
          role === "none"
            ? await supabase
                .from("position_members")
                .delete()
                .eq("position_id", positionId)
                .eq("profile_id", member.id)
            : await supabase
                .from("position_members")
                .upsert(
                  { position_id: positionId, profile_id: member.id, role },
                  { onConflict: "position_id,profile_id" },
                );
        if (result.error) throw new Error(result.error.message);
        applied++;
      }
      if (candidatesChanged) {
        const result = await supabase.from("candidate_privileges").upsert({ profile_id: member.id, ...draftCandidates! }, { onConflict: "profile_id" });
        if (result.error) throw new Error(result.error.message);
        applied++;
      }
      // Save this last: removing our own admin role must not prevent position updates.
      if (adminChanged) {
        const result = await supabase.rpc("set_workspace_admin", {
          _profile_id: member.id,
          _enabled: draftAdmin!,
        });
        if (result.error) throw new Error(result.error.message);
      }
      cancel();
      await load();
      await refresh();
      toast.success("Privileges applied");
    } catch (cause) {
      await load();
      await refresh();
      const detail = cause instanceof Error ? cause.message : "Could not update privileges";
      toast.error(
        applied
          ? `Some changes were saved. ${detail} Review and apply the remaining changes.`
          : detail,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel space-y-5 p-5">
      <div>
        <h2 className="text-base font-semibold">User privileges</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Workspace admins see and manage all data. Other users have access through their position assignments and candidate privileges.
        </p>
      </div>
      <div className="max-w-md space-y-2">
        <label htmlFor="privilege-user" className="text-sm font-medium">
          Workspace member
        </label>
        <Select
          value={selected}
          onValueChange={(value) => {
            cancel();
            setSelected(value);
          }}
          disabled={busy || dirty}
        >
          <SelectTrigger id="privilege-user">
            <SelectValue placeholder="Select a member" />
          </SelectTrigger>
          <SelectContent>
            {members
              .filter((m) => m.user_id)
              .map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} · {m.email}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <div role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <p className="text-muted-foreground text-sm">Loading privileges…</p>
      ) : member ? (
        <>
          <label className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              checked={draftAdmin ?? savedAdmin}
              disabled={busy || (admins.length === 1 && admins.includes(member.user_id ?? ""))}
              onCheckedChange={(value) => setDraftAdmin(value === true)}
            />
            <span>
              <span className="block text-sm font-medium">Workspace admin</span>
              <span className="text-muted-foreground text-xs">
                Manage all data, workspace members, and privileges. The last admin cannot be
                removed.
              </span>
            </span>
          </label>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Candidate privileges</h3>
            {([
              ["can_create", "Create candidate", "Add candidates and upload or extract resumes for candidates they create. Unassigned candidates can be created without a position role."],
              ["can_view", "View candidates", "Read all candidates and their resumes in this workspace. This does not allow editing or commenting."],
            ] as const).map(([key, title, description]) => (
              <label key={key} className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox disabled={busy} checked={(draftCandidates ?? savedCandidates)[key]}
                  onCheckedChange={(checked) => setDraftCandidates((current) => ({ can_create: savedCandidates.can_create, can_view: savedCandidates.can_view, ...current, [key]: checked === true }))} />
                <span><span className="block text-sm font-medium">{title}</span><span className="text-muted-foreground text-xs">{description}</span></span>
              </label>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Position privileges</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Position admins manage the position, candidates, interviews, and attendance.
              Interview-group members can read data and comment only on interviews they attended.
            </p>
          </div>
          {(draftAdmin ?? savedAdmin) && (
            <p className="text-muted-foreground text-sm">
              Workspace admin gives this user full access. Candidate privileges and position assignments apply if that
              role is removed.
            </p>
          )}
          <ul className="divide-border divide-y">
            {positions.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <Select
                  disabled={busy}
                  value={draftRoles[p.id] ?? savedRole(p.id)}
                  onValueChange={(role) =>
                    setDraftRoles((current) => ({ ...current, [p.id]: role as Role | "none" }))
                  }
                >
                  <SelectTrigger className="sm:w-64" aria-label={`Role for ${p.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No access</SelectItem>
                    <SelectItem value="position_admin">Position admin</SelectItem>
                    <SelectItem value="interview_group">Interview group member</SelectItem>
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
          {!positions.length && (
            <p className="text-muted-foreground text-sm">
              Create a position to assign position privileges.
            </p>
          )}
          <div className="border-border flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            <p className="text-muted-foreground mr-auto text-xs" role="status">
              {dirty
                ? "Unsaved changes. Apply or cancel before selecting another member."
                : "Changes are saved only when you click Apply."}
            </p>
            <Button type="button" variant="outline" disabled={busy || !dirty} onClick={cancel}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || !dirty} onClick={() => void apply()}>
              {busy ? "Applying…" : "Apply"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Select a member to view and change their privileges.
        </p>
      )}
    </section>
  );
}
