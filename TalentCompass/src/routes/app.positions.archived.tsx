import { Link, createFileRoute } from "@tanstack/react-router";
import { Archive } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { ScoreBar, ScoreValue } from "@/components/app/score";
import { StatusBadge } from "@/components/app/status-badge";
import { CardSkeletons, EmptyState } from "@/components/app/states";
import { useRecruitment } from "@/data/store";

export const Route = createFileRoute("/app/positions/archived")({
  head: () => ({
    meta: [
      { title: "Archived positions - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Closed roles kept for reference, with their candidates and average scores.",
      },
      { property: "og:title", content: "Archived positions - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Closed roles kept for reference, with their candidates and average scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchivedPositionsPage,
});

function fmt(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ArchivedPositionsPage() {
  const { positions, candidates, scoreFor, loading } = useRecruitment();
  const archived = positions.filter((p) => p.status === "closed");

  return (
    <AppShell title="Archived positions" subtitle={`${archived.length} closed roles`}>
      {loading ? (
        <CardSkeletons count={3} />
      ) : archived.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No archived positions"
          description="Positions you set to closed will appear here."
        />
      ) : (
        <div className="flex flex-col gap-3 overflow-hidden">
          {archived.map((p) => {
            const list = candidates.filter((c) => c.positionId === p.id);
            const scores = list.map((c) => scoreFor(c.id)).filter((s): s is number => s !== null);
            const average =
              scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : null;
            return (
              <section
                key={p.id}
                className="rise-in rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-accent/25"
              >
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
                      {p.department} · opened {fmt(p.createdAt)}
                    </p>
                  </div>
                  <span className="bg-muted text-muted-foreground border-border shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize">
                    {p.status}
                  </span>
                </div>

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
                    No candidates associated with this position.
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
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
