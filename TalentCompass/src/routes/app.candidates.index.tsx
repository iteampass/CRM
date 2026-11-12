import { useWorkspace } from "@/lib/workspace";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/app-shell";
import { CandidateTable } from "@/components/app/candidate-table";
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
import { useRecruitment } from "@/data/store";
import { STATUS_LABEL, type CandidateStatus, type ParsedResume } from "@/lib/types";

function AddCandidateDialog() {
  const { canManagePosition, canCreateCandidate } = useWorkspace();
  const { addCandidate, positions } = useRecruitment();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionId, setPositionId] = useState("");
  const [status, setStatus] = useState<CandidateStatus>("new");

  const valid = firstName.trim() && lastName.trim() && email.trim() && (canManagePosition(positionId) || (canCreateCandidate && (!positionId || positions.some((p) => p.id === positionId))));

  const submit = async () => {
    if (!valid) return;
    try {
      await addCandidate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        positionId,
        status,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPositionId("");
      setStatus("new");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create candidate");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" aria-label="Add candidate">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add candidate</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add candidate</DialogTitle>
          <DialogDescription>
            Create a candidate record. A resume can be added from their profile later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cand-first">First name</Label>
              <Input
                id="cand-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cand-last">Last name</Label>
              <Input
                id="cand-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cand-email">Email</Label>
            <Input
              id="cand-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cand-phone">Phone</Label>
            <Input id="cand-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cand-position">Position</Label>
              <Select value={positionId || "unassigned"} onValueChange={(value) => setPositionId(value === "unassigned" ? "" : value)}>
                <SelectTrigger id="cand-position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {canCreateCandidate && <SelectItem value="unassigned">Unassigned</SelectItem>}
                  {positions.filter((p) => canCreateCandidate || canManagePosition(p.id)).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cand-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus)}>
                <SelectTrigger id="cand-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as CandidateStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const NEW_CANDIDATE = "__new__";


export const Route = createFileRoute("/app/candidates/")({
  head: () => ({
    meta: [
      { title: "Candidates - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Search, filter and move candidates through every recruitment stage.",
      },
      { property: "og:title", content: "Candidates - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Search, filter and move candidates through every recruitment stage.",
      },
    ],
  }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const { canCreateCandidate, positionRoles } = useWorkspace();
  const { candidates, positions } = useRecruitment();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CandidateStatus | "all">("all");
  const [positionId, setPositionId] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) => (positionId === "all" ? true : c.positionId === positionId))
      .filter((c) => (q ? `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [candidates, query, status, positionId]);

  return (
    <AppShell
      title="Candidates"
      subtitle={`${filtered.length} of ${candidates.length} candidates`}
      actions={
        <div className="flex items-center gap-2">
          
          {(canCreateCandidate || Object.values(positionRoles).includes("position_admin")) && <AddCandidateDialog />}
        </div>
      }
    >
      <section className="panel overflow-hidden">
        <div className="border-border grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
          <Select value={positionId} onValueChange={setPositionId}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All positions</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus | "all")}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as CandidateStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CandidateTable candidates={filtered} />
      </section>
    </AppShell>
  );
}
