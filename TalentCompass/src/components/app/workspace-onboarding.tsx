import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { INVITE_STORAGE_KEY, useWorkspace } from "@/lib/workspace";
import { createWorkspace, redeemInvitation } from "@/lib/workspace.functions";

export function WorkspaceOnboarding() {
  const { refresh } = useWorkspace();
  const { signOut } = useAuth();
  const create = useServerFn(createWorkspace);
  const join = useServerFn(redeemInvitation);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("invite");
    const stored = window.localStorage.getItem(INVITE_STORAGE_KEY);
    if (fromUrl) setCode(fromUrl);
    else if (stored) setCode(stored);
  }, []);

  const doJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await join({ data: { code: code.trim() } });
      window.localStorage.removeItem(INVITE_STORAGE_KEY);
      toast.success(`Joined workspace ${result.workspaceName}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join workspace");
    } finally {
      setBusy(false);
    }
  };

  const doCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await create({ data: { name: name.trim() } });
      window.localStorage.removeItem(INVITE_STORAGE_KEY);
      toast.success(`Workspace ${result.workspaceName} created`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Join or create a workspace
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Candidates, positions and interviews are shared inside a workspace.
          </p>
        </div>

        <form onSubmit={doJoin} className="border-border bg-surface space-y-3 rounded-xl border p-5">
          <h2 className="text-sm font-semibold">I have an invitation</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Invitation code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code" />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
            {busy ? "Working…" : "Join workspace"}
          </Button>
        </form>

        <form onSubmit={doCreate} className="border-border bg-surface space-y-3 rounded-xl border p-5">
          <h2 className="text-sm font-semibold">Create my own workspace</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Workspace name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Talent" />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={busy || name.trim().length < 2}>
            {busy ? "Working…" : "Create workspace"}
          </Button>
        </form>

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mx-auto block text-xs"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
