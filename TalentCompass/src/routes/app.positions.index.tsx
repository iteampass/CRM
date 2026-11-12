import { useWorkspace } from "@/lib/workspace";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Briefcase, Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
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
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import { generatePositionDescription } from "@/lib/ai.functions";
import type { PositionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/positions/")({
  head: () => ({
    meta: [
      { title: "Positions - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Open roles, departments and the candidates being considered for each.",
      },
      { property: "og:title", content: "Positions - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Open roles, departments and the candidates being considered for each.",
      },
    ],
  }),
  component: PositionsPage,
});

function fmt(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AddPositionDialog() {
  const { addPosition } = useRecruitment();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PositionStatus>("open");
  const [busy, setBusy] = useState(false);
  const [aiDescription, setAiDescription] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDepartment("");
    setDescription("");
    setStatus("open");
    setAiDescription(false);
    setGenerating(false);
    setAiError(null);
  };

  const generate = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    setAiError(null);
    try {
      const result = await generatePositionDescription({
        data: { name: name.trim(), department: department.trim() },
      });
      setDescription(result.description);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Could not generate a description.");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addPosition({
        name: name.trim(),
        department: department.trim(),
        description: description.trim(),
        status,
      });
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create position");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" aria-label="Add position">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add position</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add position</DialogTitle>
          <DialogDescription>
            Create a new open role. Candidates can be associated with it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="position-name">Position name</Label>
            <Input
              id="position-name"
              placeholder="e.g. Senior Frontend Engineer"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position-department">Department</Label>
            <Input
              id="position-department"
              placeholder="e.g. Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position-description">Description</Label>
            <Textarea
              id="position-description"
              placeholder="Brief overview of the role and responsibilities"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={generating}
            />
            <div className="flex items-start gap-2">
              <Checkbox
                id="position-description-ai"
                checked={aiDescription}
                onCheckedChange={(v) => setAiDescription(v === true)}
              />
              <Label
                htmlFor="position-description-ai"
                className="text-sm font-normal text-muted-foreground leading-snug"
              >
                Generate description with AI from the position name and department
              </Label>
            </div>
            {aiDescription ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!name.trim() || generating}
                  onClick={generate}
                >
                  {generating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {description.trim() ? "Regenerate" : "Generate description"}
                </Button>
                {aiError ? <span className="text-sm text-destructive">{aiError}</span> : null}
              </div>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PositionStatus)}>
              <SelectTrigger id="position-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PositionsPage() {
  const { isAdmin } = useWorkspace();
  const { positions: allPositions, candidates, scoreFor, loading } = useRecruitment();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const positions = allPositions.filter((p) => p.status !== "closed");

  return (
    <AppShell
      title="Positions"
      subtitle={`${positions.length} roles in the pipeline`}
      actions={isAdmin && <AddPositionDialog />}
    >
      {loading ? (
        <CardSkeletons count={4} />
      ) : positions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No positions yet"
          description="Create a position to start associating candidates with a specific role."
        />
      ) : (
        <div className="flex flex-col gap-3 overflow-hidden">
          {positions.map((p) => {
            const isExpanded = expanded.has(p.id);
            const list = candidates.filter((c) => c.positionId === p.id);
            const scores = list.map((c) => scoreFor(c.id)).filter((s): s is number => s !== null);
            const average =
              scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : null;
            return (
              <section key={p.id} className="rise-in rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-accent/25">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/app/positions/$positionId"
                      params={{ positionId: p.id }}
                      className="hover:text-primary truncate text-sm font-semibold transition-colors"
                    >
                      <h2 className="truncate">{p.name}</h2>
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {p.department} · {list.length} {list.length === 1 ? "candidate" : "candidates"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
                        p.status === "open"
                          ? "bg-success/12 text-success border-success/30"
                          : p.status === "paused"
                            ? "bg-warning/12 text-warning border-warning/30"
                            : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {p.status}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${p.name}`}
                      aria-expanded={isExpanded}
                      aria-controls={`position-details-${p.id}`}
                      onClick={() => setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })}
                    >
                      {isExpanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div id={`position-details-${p.id}`} hidden={!isExpanded}>
                  <p className="text-muted-foreground mt-3 text-xs">Opened {fmt(p.createdAt)}</p>
                  <p className="text-foreground/85 mt-3 text-sm leading-relaxed">{p.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="label-caps">Candidates</p>
                      <p className="text-lg font-semibold tabular-nums">{list.length}</p>
                    </div>
                    <div>
                      <p className="label-caps">Average score</p>
                      <ScoreValue score={average} />
                      <ScoreBar score={average} className="mt-1.5" />
                    </div>
                  </div>

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
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
