import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/app-shell";
import { ScoreBar, ScoreValue } from "@/components/app/score";
import { StatusBadge } from "@/components/app/status-badge";
import { CardSkeletons, EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import { generatePositionDescription } from "@/lib/ai.functions";
import type { PositionStatus } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/app/positions/$positionId")({
  head: () => ({
    meta: [
      { title: "Edit position - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Edit role details, department, description and hiring status.",
      },
      { property: "og:title", content: "Edit position - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Edit role details, department, description and hiring status.",
      },
    ],
  }),
  component: PositionDetailPage,
});

function PositionDetailPage() {
  const { positionId } = Route.useParams();
  const navigate = useNavigate();
  const { positions, candidates, scoreFor, loading, updatePosition, deletePosition } =
    useRecruitment();
  const { isAdmin, canManagePosition } = useWorkspace();
  const canEdit = canManagePosition(positionId);
  const position = positions.find((p) => p.id === positionId);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PositionStatus>("open");
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!position) return;
    setName(position.name);
    setDepartment(position.department);
    setDescription(position.description);
    setStatus(position.status);
  }, [position?.id, position?.name, position?.department, position?.description, position?.status]);

  if (loading) {
    return (
      <AppShell title="Position">
        <CardSkeletons count={2} />
      </AppShell>
    );
  }

  if (!position) {
    return (
      <AppShell title="Position">
        <EmptyState
          icon={Briefcase}
          title="Position not found"
          description="This role may have been removed."
          action={
            <Link to="/app/positions">
              <Button size="sm" variant="outline">
                Back to positions
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const list = candidates.filter((c) => c.positionId === position.id);
  const scores = list.map((c) => scoreFor(c.id)).filter((s): s is number => s !== null);
  const average =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updatePosition(position.id, {
        name: name.trim(),
        department: department.trim(),
        description: description.trim(),
        status,
      });
      toast.success("Position updated");
    } catch {
      toast.error("Could not save the position");
    } finally {
      setSaving(false);
    }
  };

  const generateDescription = async () => {
    if (!name.trim()) {
      toast.error("Add a position name before generating a description");
      return;
    }
    setGeneratingDescription(true);
    try {
      const result = await generatePositionDescription({
        data: { name: name.trim(), department: department.trim() },
      });
      setDescription(result.description);
      toast.success("Description generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a description");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePosition(position.id);
      toast.success("Position deleted");
      void navigate({ to: "/app/positions" });
    } catch {
      toast.error("Could not delete the position");
      setDeleting(false);
    }
  };

  return (
    <AppShell
      title={position.name}
      subtitle={position.department}
      actions={
        <Link to="/app/positions">
          <Button size="sm" variant="outline">
            <ArrowLeft className="size-4" />
            All positions
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="panel rise-in p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Position details</h2>
              <p className="text-muted-foreground text-xs">{canEdit ? "Edit the role and save your changes." : "Read-only position details."}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={!canEdit}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>

          <fieldset disabled={!canEdit} className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-position-name">Position name</Label>
              <Input
                id="edit-position-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position-department">Department</Label>
              <Input
                id="edit-position-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position-description">Description</Label>
              <Textarea
                id="edit-position-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {!description.trim() ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={generateDescription}
                  disabled={generatingDescription || !name.trim()}
                >
                  {generatingDescription ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generate description with AI
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position-status">Status</Label>
              <Select disabled={!canEdit} value={status} onValueChange={(v) => setStatus(v as PositionStatus)}>
                <SelectTrigger id="edit-position-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Link to="/app/positions">
                <Button variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button onClick={save} disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </fieldset>

          {isAdmin && <Link className="text-primary mt-4 block text-sm underline" to="/app/workspace">Manage user privileges in workspace settings</Link>}
        </section>

        <section className="rise-in">
          <p className="label-caps">Candidates</p>
          <p className="text-lg font-semibold tabular-nums">{list.length}</p>
          <p className="label-caps mt-4">Average score</p>
          <ScoreValue score={average} />
          <ScoreBar score={average} className="mt-1.5" />

          {list.length === 0 ? (
            <p className="text-muted-foreground border-border mt-4 border-t pt-3 text-xs">
              No candidates associated with this position yet.
            </p>
          ) : (
            <ul className="border-border mt-4 space-y-2 border-t pt-3">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/app/candidates/$candidateId"
                    params={{ candidateId: c.id }}
                    className="hover:bg-surface-muted grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="truncate text-sm">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={c.status} />
                      <ScoreValue score={scoreFor(c.id)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete position</DialogTitle>
            <DialogDescription>
              This removes the role permanently. Candidates stay, but lose this position.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
