import { useWorkspace } from "@/lib/workspace";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/app-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import { DURATION_OPTIONS, STATUS_LABEL, durationLabel } from "@/lib/types";

export const Route = createFileRoute("/app/interviews/")({
  head: () => ({
    meta: [
      { title: "Interviews - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "All candidate interviews, scores, statuses, and scheduled dates.",
      },
      { property: "og:title", content: "Interviews - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "All candidate interviews, scores, statuses, and scheduled dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InterviewsPage,
});

const TYPES = [
  "Recruiter screen",
  "Technical interview",
  "Hiring manager",
  "Portfolio deep dive",
  "Values interview",
  "Final interview",
];

function ScheduleInterviewDialog() {
  const { canManagePosition } = useWorkspace();
  const { candidates, users, addInterview } = useRecruitment();
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState<string>(candidates.find((c) => canManagePosition(c.positionId))?.id ?? "");
  const [interviewerId, setInterviewerId] = useState<string>(
    users[1]?.id ?? users[0]?.id ?? "",
  );
  const [interviewType, setInterviewType] = useState<string>(TYPES[0] ?? "Recruiter screen");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [comments, setComments] = useState("");

  const submit = async () => {
    if (!candidateId) {
      toast.error("Select a candidate first");
      return;
    }
    try {
      await addInterview({
        candidateId,
        interviewerId,
        interviewType,
        score: null,
        comments: comments.trim(),
        interviewDate: new Date(`${date}T${time || "09:00"}`).toISOString(),
        durationMinutes: Number(duration),
        meetingLink: meetingLink.trim(),
      });
      setOpen(false);
      setComments("");
      setMeetingLink("");
      toast.success("Interview scheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not schedule interview");
    }
  };

  const hasCandidates = candidates.some((c) => canManagePosition(c.positionId));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!hasCandidates} aria-label="Schedule interview">
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">Schedule interview</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            Pick a candidate, interviewer, and time for the interview.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Candidate</Label>
            <Select value={candidateId} onValueChange={setCandidateId} disabled={!hasCandidates}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.filter((c) => canManagePosition(c.positionId)).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Interview type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Interviewer</Label>
              <Select value={interviewerId} onValueChange={setInterviewerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start time</Label>
              <Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
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
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Agenda, location, or video link..."
              className="min-h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!candidateId || !canManagePosition(candidates.find((c) => c.id === candidateId)?.positionId ?? "")}>
            <Plus className="size-4" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InterviewsPage() {
  const { isAdmin, positionRoles } = useWorkspace();
  const { interviews, candidates, positions, loading } = useRecruitment();

  const sorted = [...interviews].sort(
    (a, b) => new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime(),
  );

  return (
    <AppShell
      title="Interviews"
      subtitle={`${sorted.length} total interviews`}
      actions={(isAdmin || Object.values(positionRoles).includes("position_admin")) && <ScheduleInterviewDialog />}
    >
      {loading ? (
        <CardSkeletons count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No interviews yet"
          description="Schedule interviews with candidates to see them here."
        />
      ) : (
        <div className="grid gap-3">
          {sorted.map((interview) => {
            const candidate = candidates.find((c) => c.id === interview.candidateId);
            const position = candidate
              ? positions.find((p) => p.id === candidate.positionId)
              : undefined;

            return (
              <Link
                key={interview.id}
                to="/app/interviews/$interviewId"
                params={{ interviewId: interview.id }}
                className="bg-surface border-border hover:bg-surface-muted flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-semibold">
                      {candidate
                        ? `${candidate.firstName} ${candidate.lastName}`
                        : "Unknown candidate"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(interview.interviewDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {new Date(interview.interviewDate).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {` - ${durationLabel(interview.durationMinutes)}`}
                    {` - ${interview.interviewType || "Interview"}`}
                    {position ? ` - ${position.name}` : ""}
                    {candidate ? ` - ${STATUS_LABEL[candidate.status]}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      interview.status === "completed"
                        ? "bg-success/12 text-success"
                        : interview.status === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/12 text-warning"
                    }`}
                  >
                    {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                  </span>
                  {typeof interview.score === "number" ? (
                    <span className="text-foreground font-semibold tabular-nums">
                      {interview.score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No score</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
