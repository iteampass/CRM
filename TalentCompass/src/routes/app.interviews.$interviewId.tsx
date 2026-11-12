import { InterviewAttendance } from "@/components/app/interview-attendance";
import { useWorkspace } from "@/lib/workspace";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Clock,
  ExternalLink,
  MessageSquare,
  PencilLine,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/app-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import {
  DURATION_OPTIONS,
  STATUS_LABEL,
  durationLabel,
  type InterviewStatus,
} from "@/lib/types";

export const Route = createFileRoute("/app/interviews/$interviewId")({
  head: () => ({
    meta: [
      { title: "Interview schedule - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Interview schedule details, candidate, time, and notes.",
      },
      { property: "og:title", content: "Interview schedule - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Interview schedule details, candidate, time, and notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InterviewDetailPage,
});

const STATUS_OPTIONS: InterviewStatus[] = ["scheduled", "completed", "cancelled"];

function InterviewDetailPage() {
  const { canManagePosition } = useWorkspace();
  const { interviewId } = Route.useParams();
  const navigate = useNavigate();
  const {
    getInterview,
    getCandidate,
    getPosition,
    getUser,
    updateInterview,
    deleteInterview,
    loading,
  } = useRecruitment();

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");
  const [rDuration, setRDuration] = useState("60");
  const [rMeetingLink, setRMeetingLink] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const interview = getInterview(interviewId);
  const candidate = interview ? getCandidate(interview.candidateId) : undefined;
  const position = candidate ? getPosition(candidate.positionId) : undefined;
  const interviewer = interview ? getUser(interview.interviewerId) : undefined;

  if (loading) {
    return (
      <AppShell title="Interview schedule" subtitle="Loading...">
        <div className="bg-surface h-64 animate-pulse rounded-xl border" />
      </AppShell>
    );
  }

  if (!interview) {
    return (
      <AppShell title="Interview schedule" subtitle="Not found">
        <div className="text-muted-foreground py-12 text-center">
          This interview could not be found.
        </div>
      </AppShell>
    );
  }

  const date = new Date(interview.interviewDate);

  const handleStatusChange = async (status: InterviewStatus) => {
    setUpdating(true);
    try {
      await updateInterview(interview.id, { status });
      toast.success("Status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInterview(interview.id);
      toast.success("Interview deleted");
      navigate({ to: "/app/interviews" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete interview");
      setDeleting(false);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  const openReschedule = () => {
    const d = new Date(interview.interviewDate);
    setRDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setRTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setRDuration(String(interview.durationMinutes ?? 60));
    setRMeetingLink(interview.meetingLink ?? "");
    setRNotes(interview.comments ?? "");
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!rDate) {
      toast.error("Pick a date first");
      return;
    }
    setSaving(true);
    try {
      await updateInterview(interview.id, {
        interviewDate: new Date(`${rDate}T${rTime || "09:00"}`).toISOString(),
        durationMinutes: Number(rDuration),
        meetingLink: rMeetingLink.trim(),
        comments: rNotes.trim(),
      });
      toast.success("Interview schedule updated");
      setRescheduleOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reschedule interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Interview schedule"
      subtitle={`${interview.interviewType || "Interview"}${candidate ? ` - ${candidate.firstName} ${candidate.lastName}` : ""}`}
      actions={canManagePosition(candidate?.positionId ?? "") &&
        <div className="flex items-center gap-2">
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Reschedule interview" onClick={openReschedule}>
              <PencilLine className="size-4" />
              <span className="hidden sm:inline">Reschedule</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit interview schedule</DialogTitle>
              <DialogDescription>Update the time, duration, meeting link, or notes.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Input
                  type="time"
                  step={900}
                  value={rTime}
                  onChange={(e) => setRTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={rDuration} onValueChange={setRDuration}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {durationLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meeting link <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                type="url"
                value={rMeetingLink}
                onChange={(e) => setRMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={rNotes}
                onChange={(e) => setRNotes(e.target.value)}
                placeholder="Agenda, location, or video link..."
                className="min-h-20 resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" aria-label="Delete interview">
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete interview?</DialogTitle>
              <DialogDescription>
                This will permanently remove the scheduled interview from the workspace.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link to="/app/interviews">
              <ArrowLeft className="size-4" />
              Back to interviews
            </Link>
          </Button>

          <div className="bg-surface border-border rounded-xl border p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-foreground text-lg font-semibold">
                  {interview.interviewType || "Interview"}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {date.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Select
                value={interview.status}
                onValueChange={(v) => handleStatusChange(v as InterviewStatus)}
                disabled={updating || !canManagePosition(candidate?.positionId ?? "")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="bg-surface-muted flex items-start gap-3 rounded-lg p-3">
                <Clock className="text-muted-foreground mt-0.5 size-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-foreground text-sm font-medium">
                    {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="bg-surface-muted flex items-start gap-3 rounded-lg p-3">
                <CalendarClock className="text-muted-foreground mt-0.5 size-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-foreground text-sm font-medium">
                    {durationLabel(interview.durationMinutes)}
                  </p>
                </div>
              </div>
              {interview.meetingLink ? (
                <div className="bg-surface-muted flex items-start gap-3 rounded-lg p-3">
                  <ExternalLink className="text-muted-foreground mt-0.5 size-4" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Meeting</p>
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary block truncate text-sm font-medium hover:underline"
                    >
                      Join meeting
                    </a>
                  </div>
                </div>
              ) : null}
              <div className="bg-surface-muted flex items-start gap-3 rounded-lg p-3">
                <User className="text-muted-foreground mt-0.5 size-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Interviewer</p>
                  <p className="text-foreground text-sm font-medium">
                    {interviewer
                      ? `${interviewer.firstName} ${interviewer.lastName}`
                      : "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="bg-surface-muted flex items-start gap-3 rounded-lg p-3">
                <CalendarDays className="text-muted-foreground mt-0.5 size-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-foreground text-sm font-medium">
                    {new Date(interview.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {typeof interview.score === "number" && (
              <div className="border-border mt-6 rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-foreground text-2xl font-semibold tabular-nums">
                  {interview.score.toFixed(1)}
                </p>
              </div>
            )}

            {interview.comments ? (
              <div className="border-border mt-6 rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquare className="text-muted-foreground size-4" />
                  <p className="text-xs text-muted-foreground">Notes</p>
                </div>
                <p className="text-foreground whitespace-pre-wrap text-sm">{interview.comments}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {candidate && (
            <div className="bg-surface border-border rounded-xl border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Candidate
              </p>
              <Link
                to="/app/candidates/$candidateId"
                params={{ candidateId: candidate.id }}
                className="text-foreground mt-2 block text-base font-semibold hover:underline"
              >
                {candidate.firstName} {candidate.lastName}
              </Link>
              <p className="text-muted-foreground text-sm">{candidate.email}</p>
              <p className="text-muted-foreground mt-3 text-xs">
                Status: {STATUS_LABEL[candidate.status]}
              </p>
            </div>
          )}

          {position && (
            <div className="bg-surface border-border rounded-xl border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Position
              </p>
              <Link
                to="/app/positions/$positionId"
                params={{ positionId: position.id }}
                className="text-foreground mt-2 block text-base font-semibold hover:underline"
              >
                {position.name}
              </Link>
              <p className="text-muted-foreground text-sm">{position.department}</p>
            </div>
          )}
        </div>
      </div>
      <InterviewAttendance interview={interview} positionId={candidate?.positionId ?? ""} />
    </AppShell>
  );
}
