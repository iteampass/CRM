import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { CardSkeletons, EmptyState } from "@/components/app/states";
import { useRecruitment } from "@/data/store";
import { durationLabel } from "@/lib/types";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Upcoming scheduled interviews with candidates, dates and interview types.",
      },
      { property: "og:title", content: "Calendar - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Upcoming scheduled interviews with candidates, dates and interview types.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

function dayKey(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function timeOf(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function CalendarPage() {
  const { interviews, candidates, positions, loading } = useRecruitment();

  const scheduled = interviews
    .filter((i) => i.status === "scheduled")
    .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());

  const groups = new Map<string, typeof scheduled>();
  for (const i of scheduled) {
    const key = dayKey(i.interviewDate);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }

  return (
    <AppShell title="Calendar" subtitle={`${scheduled.length} scheduled interviews`}>
      {loading ? (
        <CardSkeletons count={3} />
      ) : scheduled.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No scheduled interviews"
          description="Interviews you schedule with candidates will appear here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day} className="rise-in border-border bg-surface rounded-lg border p-5">
              <h2 className="text-sm font-semibold">{day}</h2>
              <ul className="border-border mt-3 space-y-2 border-t pt-3">
                {items.map((i) => {
                  const candidate = candidates.find((c) => c.id === i.candidateId);
                  const position = candidate
                    ? positions.find((p) => p.id === candidate.positionId)
                    : undefined;
                  return (
                    <li key={i.id}>
                      <Link
                        to="/app/candidates/$candidateId"
                        params={{ candidateId: i.candidateId }}
                        className="hover:bg-surface-muted grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                      >
                        <span className="text-sm font-semibold tabular-nums">
                          {timeOf(i.interviewDate)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {candidate
                              ? `${candidate.firstName} ${candidate.lastName}`
                              : "Unknown candidate"}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {i.interviewType || "Interview"}
                            {` · ${durationLabel(i.durationMinutes)}`}
                            {position ? ` · ${position.name}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
