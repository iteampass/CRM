import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRecruitment } from "@/data/store";
import { STAGE_LABEL, type CommentStage } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const stageTone: Record<CommentStage, string> = {
  recruiter: "bg-muted text-foreground/80 border-border",
  hr: "bg-info/10 text-info border-info/25",
  technical: "bg-primary/10 text-primary border-primary/25",
  final: "bg-warning/12 text-warning border-warning/30",
};

function when(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentsFeed({ candidateId }: { candidateId: string }) {
  const { commentsFor, getUser, addComment, getCandidate, interviewsFor, getInterview } = useRecruitment();
  const { canManagePosition, attendedInterviews } = useWorkspace();
  const manage = canManagePosition(getCandidate(candidateId)?.positionId ?? "");
  const eligible = interviewsFor(candidateId).filter((i) => attendedInterviews.includes(i.id) && i.status === "completed" && new Date(i.interviewDate) <= new Date());
  const [interviewId, setInterviewId] = useState("");
  const canComment = manage || eligible.length > 0;
  const [content, setContent] = useState("");
  const [stage, setStage] = useState<CommentStage>("recruiter");
  const [sending, setSending] = useState(false);

  const items = commentsFor(candidateId);

  const submit = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await addComment({ candidateId, content: content.trim(), stage, ...(!manage ? { interviewId } : {}) });
      setContent("");
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No internal notes yet"
          description="Share screening context, references or concerns so the rest of the hiring team stays aligned."
        />
      ) : (
        <ol className="space-y-3">
          {items.map((c) => {
            const author = getUser(c.authorId);
            return (
              <li key={c.id} className="panel rise-in p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-accent text-accent-foreground grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold">
                      {author ? `${author.firstName[0]}${author.lastName[0]}` : "?"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {author ? `${author.firstName} ${author.lastName}` : "Unknown"}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {author?.companyPosition}
                      </span>
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      stageTone[c.stage],
                    )}
                  >
                    {STAGE_LABEL[c.stage]}
                  </span>
                </div>
                {c.interviewId && <p className="text-muted-foreground mt-2 text-xs">Interview: {getInterview(c.interviewId)?.interviewType ?? "Interview"} · {getInterview(c.interviewId) ? when(getInterview(c.interviewId)!.interviewDate) : ""}</p>}
                <p className="text-foreground/90 mt-3 text-sm leading-relaxed">{c.content}</p>
                <p className="text-muted-foreground mt-2 text-[11px]">{when(c.createdAt)}</p>
              </li>
            );
          })}
        </ol>
      )}

      {canComment ? <div className="panel p-3">
        {!manage && <div className="mb-3"><Select value={interviewId} onValueChange={setInterviewId}><SelectTrigger aria-label="Interview attended"><SelectValue placeholder="Select the interview you attended" /></SelectTrigger><SelectContent>{eligible.map((i) => <SelectItem key={i.id} value={i.id}>{i.interviewType} · {when(i.interviewDate)}</SelectItem>)}</SelectContent></Select></div>}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note for the hiring team…"
          className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
        />
        <div className="border-border mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t pt-2">
          <Select value={stage} onValueChange={(v) => setStage(v as CommentStage)}>
            <SelectTrigger className="h-8 w-full max-w-52 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STAGE_LABEL) as CommentStage[]).map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STAGE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={submit} disabled={!content.trim() || sending || (!manage && !eligible.some((i) => i.id === interviewId))}>
            <Send className="size-3.5" />
            {sending ? "Posting…" : "Post note"}
          </Button>
        </div>
      </div> : <p className="text-muted-foreground text-sm">Read-only access. You can add comments after an admin records your attendance at a completed interview.</p>}
    </div>
  );
}
