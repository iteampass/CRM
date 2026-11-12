import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app/app-shell";
import { CandidateTable } from "@/components/app/candidate-table";
import { ScoreBar, ScoreValue } from "@/components/app/score";
import { CardSkeletons } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruitment } from "@/data/store";
import { averageScore, STATUS_LABEL, type CandidateStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Pipeline overview: candidate volume, stages, average interview scores.",
      },
      { property: "og:title", content: "Dashboard - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Pipeline overview: candidate volume, stages, average interview scores.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { candidates, positions, interviews, loading, scoreFor } = useRecruitment();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CandidateStatus | "all">("all");
  const [positionId, setPositionId] = useState<string>("all");

  const stats = useMemo(() => {
    const count = (s: CandidateStatus[]) => candidates.filter((c) => s.includes(c.status)).length;
    const awaiting = candidates.filter((c) =>
      interviews.some((i) => i.candidateId === c.id && i.score === null && i.status !== "cancelled"),
    ).length;
    return {
      total: candidates.length,
      newCount: count(["new"]),
      interviewing: count(["interview", "technical", "final"]),
      awaiting,
      progressing: count(["offer", "hired"]),
      rejected: count(["rejected"]),
      average: averageScore(interviews),
    };
  }, [candidates, interviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) => (positionId === "all" ? true : c.positionId === positionId))
      .filter((c) =>
        q
          ? `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [candidates, query, status, positionId]);

  const byPosition = useMemo(
    () =>
      positions.map((p) => {
        const list = candidates.filter((c) => c.positionId === p.id);
        const scores = list.map((c) => scoreFor(c.id)).filter((s): s is number => s !== null);
        return {
          position: p,
          count: list.length,
          average:
            scores.length > 0
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
              : null,
        };
      }),
    [positions, candidates, scoreFor],
  );

  const cards = [
    { label: "Total candidates", value: stats.total, hint: `${positions.length} open searches` },
    { label: "New", value: stats.newCount, hint: "Not yet screened" },
    { label: "Interviewing", value: stats.interviewing, hint: "Interview, technical, final" },
    { label: "Awaiting feedback", value: stats.awaiting, hint: "Scores not submitted" },
  ];

  return (
    <AppShell
      title="My Portal"
      subtitle="Recruitment pipeline overview"
      actions={
        <Button size="sm" variant="outline" asChild className="hidden sm:inline-flex">
          <Link to="/app/positions">
            Positions
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        {loading ? (
          <CardSkeletons />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => {
              const isTotal = c.label === "Total candidates";
              const card = (
                <div
                  className={cn(
                    "panel rise-in p-4 first:border-l-[3px] first:border-l-brand-accent",
                    isTotal && "hover:bg-accent/40 cursor-pointer transition-colors",
                  )}
                >
                  <p className="label-caps">{c.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                    {c.value}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">{c.hint}</p>
                </div>
              );
              return isTotal ? (
                <Link key={c.label} to="/app/candidates">
                  {card}
                </Link>
              ) : (
                <div key={c.label}>{card}</div>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="panel overflow-hidden">
            <div className="border-border grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="relative min-w-0">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search candidates by name or email"
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
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CandidateStatus | "all")}
              >
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

           <aside className="space-y-4">
             <div className="panel p-4">
              <p className="label-caps">Average score, all interviews</p>
              <div className="mt-1.5">
                <ScoreValue score={stats.average} size="lg" />
              </div>
              <ScoreBar score={stats.average} className="mt-3" />
              <div className="text-muted-foreground mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-foreground text-lg font-semibold tabular-nums">
                    {stats.progressing}
                  </p>
                  Progressing
                </div>
                <div>
                  <p className="text-foreground text-lg font-semibold tabular-nums">
                    {stats.rejected}
                  </p>
                  Rejected
                </div>
              </div>
            </div>

             <div className="panel p-4">
              <p className="label-caps">Candidates by position</p>
              <ul className="mt-3 space-y-3">
                {byPosition.map((row) => (
                  <li key={row.position.id}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="truncate text-sm">{row.position.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {row.count} · {row.average?.toFixed(1) ?? "-"}
                      </span>
                    </div>
                    <ScoreBar score={row.average} className="mt-1.5" />
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/app/positions">View all positions</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
