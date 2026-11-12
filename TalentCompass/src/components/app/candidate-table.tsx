import { useWorkspace } from "@/lib/workspace";
import { Link } from "@tanstack/react-router";
import { UserSearch } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, RowSkeletons } from "@/components/app/states";
import { ScoreValue } from "@/components/app/score";
import { StatusSelect } from "@/components/app/status-badge";
import { useRecruitment } from "@/data/store";
import type { Candidate } from "@/lib/types";

function initials(c: Candidate) {
  return `${c.firstName[0]}${c.lastName[0]}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CandidateTable({
  candidates,
  emptyTitle = "No candidates match your filters",
  emptyDescription = "Try clearing the search or selecting a different position or status.",
}: {
  candidates: Candidate[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { canManagePosition } = useWorkspace();
  const { loading, getPosition, scoreFor, setCandidateStatus, interviewsFor } = useRecruitment();

  if (loading) return <RowSkeletons rows={7} />;

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={UserSearch}
        title={emptyTitle}
        description={emptyDescription}
        className="m-4"
      />
    );
  }

  return (
    <div>
      <div className="bg-surface-muted text-muted-foreground border-border hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_88px_120px] gap-4 border-b px-5 py-3 text-[11px] font-semibold uppercase lg:grid">
        <span>Candidate</span>
        <span>Position</span>
        <span>Status</span>
        <span className="text-right">Score</span>
        <span className="text-right">Updated</span>
      </div>
      <ul className="divide-border divide-y">
        {candidates.map((c) => {
          const position = getPosition(c.positionId);
          const score = scoreFor(c.id);
          const rounds = interviewsFor(c.id).length;
          return (
            <li key={c.id} className="hover:bg-accent/35 transition-colors duration-150">
              <Link
                to="/app/candidates/$candidateId"
                params={{ candidateId: c.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_88px_120px] lg:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold">
                    {initials(c)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">{c.email}</span>
                  </span>
                </div>

                <div className="text-muted-foreground hidden min-w-0 text-sm lg:block">
                  <span className="text-foreground block truncate">{position?.name ?? "-"}</span>
                  <span className="block truncate text-xs">{position?.department}</span>
                </div>

                <div className="justify-self-end lg:justify-self-start">
                  <StatusSelect disabled={!canManagePosition(c.positionId)}
                    status={c.status}
                    onChange={async (s) => {
                      try {
                        await setCandidateStatus(c.id, s);
                        toast.success("Status updated");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not update status");
                      }
                    }}
                  />
                </div>

                <div className="hidden text-right lg:block">
                  <ScoreValue score={score} />
                  <span className="text-muted-foreground block text-[11px]">
                    {rounds} {rounds === 1 ? "round" : "rounds"}
                  </span>
                </div>

                <div className="text-muted-foreground hidden text-right text-xs lg:block">
                  {formatDate(c.updatedAt)}
                </div>

                <div className="text-muted-foreground col-span-2 flex items-center gap-3 text-xs lg:hidden">
                  <span className="truncate">{position?.name ?? "No position"}</span>
                  <span className="ml-auto">
                    <ScoreValue score={score} />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
