import { useWorkspace } from "@/lib/workspace";
import { CalendarClock, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ScoreBar, ScoreValue } from "@/components/app/score";
import { EmptyState } from "@/components/app/states";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import { DURATION_OPTIONS, durationLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES = [
  "Recruiter screen",
  "Technical interview",
  "Hiring manager",
  "Portfolio deep dive",
  "Values interview",
  "Final interview",
];

function when(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AddInterviewDialog({ candidateId }: { candidateId: string }) {
  const { users, addInterview } = useRecruitment();
  const [open, setOpen] = useState(false);
  const [interviewerId, setInterviewerId] = useState<string>(users[1]?.id ?? users[0]?.id ?? "u-1");
  const [interviewType, setInterviewType] = useState<string>(TYPES[1] ?? "Technical interview");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [score, setScore] = useState<number[]>([8]);
  const scoreValue = score[0] ?? 8;
  const [comments, setComments] = useState("");

  const submit = async () => {
    try {
      await addInterview({
        candidateId,
        interviewerId,
        interviewType,
        score: scoreValue,
        comments: comments.trim(),
        interviewDate: new Date(`${date}T${time || "09:00"}`).toISOString(),
        durationMinutes: Number(duration),
        meetingLink: meetingLink.trim(),
      });
      setOpen(false);
      setComments("");
      setMeetingLink("");
      toast.success("Evaluation saved - average score updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save evaluation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" />
          Add evaluation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New interview evaluation</DialogTitle>
          <DialogDescription>
            The candidate's average score recalculates from all submitted evaluations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Score</Label>
              <ScoreValue score={scoreValue} />
            </div>
            <Slider value={score} onValueChange={setScore} min={1} max={10} step={1} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What stood out, what needs verifying…"
              className="min-h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save evaluation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InterviewPanel({ candidateId }: { candidateId: string }) {
  const { canManagePosition } = useWorkspace();
  const { interviewsFor, getUser, scoreFor, updateInterviewScore, getCandidate } = useRecruitment();
  const interviews = interviewsFor(candidateId);
  const average = scoreFor(candidateId);
  const scored = interviews.filter((i) => typeof i.score === "number").length;

  return (
    <div className="space-y-4">
      <div className="panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4">
        <div className="min-w-0">
          <p className="label-caps">Average interview score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <ScoreValue score={average} size="lg" />
            <span className="text-muted-foreground text-xs">
              from {scored} submitted {scored === 1 ? "evaluation" : "evaluations"}
            </span>
          </div>
          <ScoreBar score={average} className="mt-3 max-w-sm" />
        </div>
        {canManagePosition(getCandidate(candidateId)?.positionId ?? "") && <AddInterviewDialog candidateId={candidateId} />}
      </div>

      {interviews.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No interviews recorded"
          description="Add an evaluation once the first interview round has taken place."
        />
      ) : (
        <ul className="space-y-3">
          {interviews.map((iv) => {
            const interviewer = getUser(iv.interviewerId);
            return (
              <li key={iv.id} className="panel rise-in p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{iv.interviewType}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {interviewer
                        ? `${interviewer.firstName} ${interviewer.lastName} · ${interviewer.companyPosition}`
                        : "Unassigned"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                        iv.status === "completed"
                          ? "bg-success/12 text-success border-success/30"
                          : iv.status === "scheduled"
                            ? "bg-info/10 text-info border-info/25"
                            : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {iv.status === "completed"
                        ? "Completed"
                        : iv.status === "scheduled"
                          ? "Scheduled"
                          : "Cancelled"}
                    </span>
                    <ScoreValue score={iv.score} />
                  </div>
                </div>

                <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                  <CalendarClock className="size-3.5" />
                  {when(iv.interviewDate)}
                  {` · ${new Date(iv.interviewDate).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} · ${durationLabel(iv.durationMinutes)}`}
                </div>

                {iv.criteria.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {iv.criteria.map((c) => (
                      <div key={c.label} className="bg-surface-muted rounded-lg px-3 py-2">
                        <p className="text-muted-foreground text-[11px]">{c.label}</p>
                        <p className="text-sm font-medium tabular-nums">{c.score}/10</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {iv.comments ? (
                  <p className="text-foreground/90 mt-3 text-sm leading-relaxed">{iv.comments}</p>
                ) : null}

                {iv.score === null && canManagePosition(getCandidate(candidateId)?.positionId ?? "") ? (
                  <div className="border-border mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="text-muted-foreground text-xs">Submit a score:</span>
                    {[5, 6, 7, 8, 9, 10].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className="h-7 w-9 px-0 text-xs tabular-nums"
                        onClick={async () => {
                          try {
                            await updateInterviewScore(iv.id, s);
                            toast.success("Score recorded - average updated");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Could not record score");
                          }
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
