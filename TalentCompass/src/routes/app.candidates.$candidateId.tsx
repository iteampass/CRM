import { useWorkspace } from "@/lib/workspace";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  Briefcase,
  GraduationCap,
  Languages as LanguagesIcon,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trash2,
  UserCog,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { AppShell } from "@/components/app/app-shell";
import { CommentsFeed } from "@/components/app/comments-feed";
import { InterviewPanel } from "@/components/app/interview-panel";
import { ResumeExperience } from "@/components/app/resume-experience";
import { ResumeViewer } from "@/components/app/resume-viewer";
import { ScoreBar, ScoreValue } from "@/components/app/score";
import { EmptyState } from "@/components/app/states";
import { StatusSelect } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruitment } from "@/data/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Candidate - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content:
          "Candidate workspace: original resume, parsed data, interview evaluations and internal notes.",
      },
      { property: "og:title", content: "Candidate - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content:
          "Candidate workspace: original resume, parsed data, interview evaluations and internal notes.",
      },
    ],
  }),
  component: CandidateDetail,
});

function fmt(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CandidateDetail() {
  const { canManagePosition, canUploadCandidateResume } = useWorkspace();
  const { candidateId } = Route.useParams();
  const {
    getCandidate,
    getPosition,
    scoreFor,
    setCandidateStatus,
    loading,
    commentsFor,
    parseResume,
    deleteCandidate,
    updateCandidate,
    positions,
  } = useRecruitment();
  const [parsing, setParsing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const navigate = useNavigate();
  const candidate = getCandidate(candidateId);

  const runDelete = async () => {
    if (!candidate) return;
    setDeleting(true);
    try {
      await deleteCandidate(candidate.id);
      toast.success("Candidate deleted");
      navigate({ to: "/app/candidates" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete this candidate");
      setDeleting(false);
    }
  };

  const runAssign = async () => {
    if (!candidate) return;
    setAssigning(true);
    try {
      const positionId = selectedPositionId === "__unassigned__" ? null : selectedPositionId;
      await updateCandidate(candidate.id, { positionId });
      toast.success(positionId ? "Position assigned" : "Position unassigned");
      setAssignOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update position");
    } finally {
      setAssigning(false);
    }
  };


  const runParse = async () => {
    if (!candidate) return;
    setParsing(true);
    try {
      await parseResume(candidate.id);
      toast.success("Resume details extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the resume details");
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return (
      <AppShell title={<Skeleton className="h-6 w-48" />}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!candidate) {
    return (
      <AppShell title="Candidate not found">
        <EmptyState
          icon={Sparkles}
          title="This candidate no longer exists"
          description="They may have been removed from the pipeline."
          action={
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/candidates">Back to candidates</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const position = getPosition(candidate.positionId);
  const average = scoreFor(candidate.id);
  const parsed = candidate.parsedResumeData;
  const noteCount = commentsFor(candidate.id).length;

  return (
    <AppShell
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={position ? `${position.name} · ${position.department}` : "No position assigned"}
      actions={canManagePosition(candidate.positionId) &&
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/app/candidates">
              <ArrowLeft className="size-3.5" />
              All candidates
            </Link>
          </Button>
          <Dialog open={assignOpen} onOpenChange={(open) => {
            if (open) setSelectedPositionId(candidate.positionId || "__unassigned__");
            setAssignOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={assigning} aria-label="Assign to position">
                <UserCog className="size-3.5" />
                <span className="hidden sm:inline">Assign</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign to position</DialogTitle>
                <DialogDescription>
                  Choose a position for {candidate.firstName} {candidate.lastName}.
                </DialogDescription>
              </DialogHeader>
              <Select
                value={selectedPositionId}
                onValueChange={setSelectedPositionId}
                disabled={assigning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No position assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">No position assigned</SelectItem>
                  {positions.filter((p) => canManagePosition(p.id)).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm" disabled={assigning}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button size="sm" onClick={runAssign} disabled={assigning}>
                  {assigning ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={deleting} aria-label={deleting ? "Deleting candidate" : "Delete candidate"}>
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Delete {candidate.firstName} {candidate.lastName}?
                </DialogTitle>
                <DialogDescription>
                  This removes the candidate along with their interviews and notes. This cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant="destructive" size="sm" onClick={runDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="panel rise-in grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-accent text-accent-foreground grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold">
                  {candidate.firstName[0]}
                  {candidate.lastName[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {position?.name ?? "-"} · added {fmt(candidate.createdAt)}
                  </p>
                </div>
                <StatusSelect disabled={!canManagePosition(candidate.positionId)}
                  status={candidate.status}
                  onChange={async (s) => {
                    try {
                      await setCandidateStatus(candidate.id, s);
                      toast.success("Status updated");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not update status");
                    }
                  }}
                  className="sm:ml-2"
                />
              </div>

              <div className="text-muted-foreground mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Mail className="size-3.5 shrink-0" />
                  <a href={`mailto:${candidate.email}`} className="truncate hover:underline">
                    {candidate.email}
                  </a>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <a href={`tel:${candidate.phone}`} className="truncate hover:underline sm:hidden">
                    {candidate.phone}
                  </a>
                  <span className="hidden truncate sm:inline">{candidate.phone}</span>
                </span>
                {parsed?.location ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{parsed.location}</span>
                  </span>
                ) : null}
                <span className="flex min-w-0 items-center gap-2">
                  <Briefcase className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {parsed ? `${parsed.yearsOfExperience} years experience` : "Experience unknown"}
                  </span>
                </span>
              </div>
            </div>

            <div className="bg-surface-muted rounded-xl p-4 sm:w-44">
              <p className="label-caps">Average score</p>
              <div className="mt-1">
                <ScoreValue score={average} size="lg" />
              </div>
              <ScoreBar score={average} className="mt-3" />
              <p className="text-muted-foreground mt-2 text-[11px]">
                Updated {fmt(candidate.updatedAt)}
              </p>
            </div>
          </div>

          <Tabs defaultValue="resume">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="resume">Original resume</TabsTrigger>
              <TabsTrigger value="parsed">Parsed data</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
              <TabsTrigger value="notes">Notes ({noteCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-4 duration-200 animate-in fade-in">
              <ResumeViewer candidate={candidate} />
            </TabsContent>

            <TabsContent value="parsed" className="mt-4 duration-200 animate-in fade-in">
              {!parsed ? (
                <EmptyState
                  icon={Sparkles}
                  title="Nothing parsed yet"
                  description="Upload a resume, then extract the details from it automatically."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runParse}
                      disabled={parsing || !candidate.resumeUrl || !canUploadCandidateResume(candidate)}
                    >
                      <Sparkles className="size-3.5" />
                      {parsing ? "Extracting…" : "Extract resume details"}
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={runParse} disabled={parsing || !canUploadCandidateResume(candidate)}>
                      <Sparkles className="size-3.5" />
                      {parsing ? "Extracting…" : "Re-extract from resume"}
                    </Button>
                  </div>
                  <div className="panel p-4">
                    <p className="label-caps">Professional summary</p>
                    <p className="mt-2 text-sm leading-relaxed">{parsed.summary}</p>
                  </div>

                  <div className="panel p-4">
                    <p className="label-caps flex items-center gap-1.5">
                      <Briefcase className="size-3.5" /> Work experience
                    </p>
                    <ol className="mt-3 space-y-4">
                      {parsed.experience.map((e, index) => (
                        <li key={`${e.role}-${e.company}-${e.period}-${index}`}>
                          <ResumeExperience experience={e} />
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="panel p-4">
                      <p className="label-caps flex items-center gap-1.5">
                        <GraduationCap className="size-3.5" /> Education
                      </p>
                      <ul className="mt-3 space-y-3">
                        {parsed.education.map((e) => (
                          <li key={e.school}>
                            <p className="text-sm font-medium">{e.degree}</p>
                            <p className="text-muted-foreground text-xs">
                              {e.school} · {e.period}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="panel p-4">
                      <p className="label-caps flex items-center gap-1.5">
                        <LanguagesIcon className="size-3.5" /> Languages
                      </p>
                      <ul className="mt-3 space-y-2">
                        {parsed.languages.map((l) => (
                          <li key={l.name} className="flex items-center justify-between text-sm">
                            <span>{l.name}</span>
                            <span className="text-muted-foreground text-xs">{l.level}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="panel p-4">
                    <p className="label-caps">Skills</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {parsed.skills.map((s) => (
                        <span
                          key={s}
                          className="bg-surface-muted border-border rounded-md border px-2 py-1 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {parsed.certifications.length > 0 ? (
                    <div className="panel p-4">
                      <p className="label-caps flex items-center gap-1.5">
                        <Award className="size-3.5" /> Certifications
                      </p>
                      <ul className="text-foreground/85 mt-2 space-y-1 text-sm">
                        {parsed.certifications.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </TabsContent>

            <TabsContent value="interviews" className="mt-4 duration-200 animate-in fade-in">
              <InterviewPanel candidateId={candidate.id} />
            </TabsContent>

            <TabsContent value="notes" className="mt-4 duration-200 animate-in fade-in">
              <CommentsFeed candidateId={candidate.id} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="hidden min-w-0 xl:block">
          <div className="panel sticky top-20 p-4">
            <p className="label-caps">Hiring snapshot</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Position</dt>
                <dd className="truncate">{position?.name ?? "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Department</dt>
                <dd className="truncate">{position?.department ?? "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Resume</dt>
                <dd className="truncate">{candidate.resumeMeta?.fileName ?? "Not uploaded"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Internal notes</dt>
                <dd className="tabular-nums">{noteCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Created</dt>
                <dd>{fmt(candidate.createdAt)}</dd>
              </div>
            </dl>
            {parsed?.links.length ? (
              <div className="border-border mt-4 space-y-1.5 border-t pt-3">
                {parsed.links.map((l) => (
                  <p key={l.url} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className="truncate">{l.url}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
