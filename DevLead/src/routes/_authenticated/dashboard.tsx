import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Flame,
  Percent,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CompanyAvatar,
  DemoNotice,
  IntentBadge,
  PageHeader,
  ScorePill,
  TechTags,
} from "@/components/crm/bits";
import { companies, contactFor, leadForCompany, tasks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { LatestSignals } from "@/components/crm/signals/LatestSignals";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DevLead CRM" },
      {
        name: "description",
        content: "Hot leads, buying signals and follow-ups for your dev agency.",
      },
      { property: "og:title", content: "Dashboard — DevLead CRM" },
      {
        property: "og:description",
        content: "Hot leads, buying signals and follow-ups for your dev agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});
const fmt = (n: number) => "$" + (n >= 1000 ? Math.round(n / 1000) + "k" : n);
function Dashboard() {
  const { t: ui } = useI18n();
  const open = companies.filter((c) => !["Won", "Lost", "New"].includes(c.stage));
  const won = companies.filter((c) => c.stage === "Won").length;
  const kpis = [
    {
      label: "New Leads",
      value: companies.filter((c) => c.stage === "New").length + 23,
      delta: "+12% vs last wk",
      icon: TrendingUp,
    },
    {
      label: "High-Intent Leads",
      value: companies.filter((c) => c.leadScore >= 70).length,
      delta: "score ≥ 70",
      icon: Flame,
      hot: true,
    },
    { label: "Needs Follow-up", value: 7, delta: "2 overdue", icon: AlertTriangle },
    { label: "Open Opportunities", value: open.length, delta: "across 6 stages", icon: Target },
    {
      label: "Pipeline Value",
      value: fmt(open.reduce((a, c) => a + c.dealValue, 0)),
      delta: "weighted $412k",
      icon: Wallet,
    },
    {
      label: "Conversion Rate",
      value: Math.round((won / companies.length) * 100 * 3) + "%",
      delta: "lead → won, 90d",
      icon: Percent,
    },
  ];
  const hot = [...companies]
    .filter((c) => c.stage !== "Lost")
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 4);
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={ui("Good evening, Ivan")}
        description={ui("Here's which companies most likely need software development right now.")}
        actions={
          <Button asChild>
            <Link to="/leads">{ui("Find leads")}</Link>
          </Button>
        }
      />
      <DemoNotice />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="card-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{ui(k.label)}</p>
              <k.icon className={cn("h-4 w-4", k.hot ? "text-highlight" : "text-primary")} />
            </div>
            <p className={cn("mt-2 text-2xl font-bold", k.hot && "text-highlight")}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{ui(k.delta)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{ui("Hot leads")}</h2>
            <Link to="/leads" className="text-sm font-medium text-primary">
              {ui("View all")}
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {hot.map((c) => {
              const dm = contactFor(c.id)[0];
              return (
                <div key={c.id} className="card-surface flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.industry} · {c.location} · {c.employees}
                        {ui(" emp.")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ScorePill score={c.leadScore} />
                      <IntentBadge score={c.leadScore} />
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {c.signals.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />
                        {s.description}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <TechTags tech={c.technologies} />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {dm ? (
                        <>
                          <span className="font-medium text-foreground">
                            {dm.firstName} {dm.lastName}
                          </span>{" "}
                          — {dm.title}
                        </>
                      ) : (
                        ui("No decision maker yet")
                      )}
                    </span>
                    <span>
                      {ui("Detected ")}
                      {c.detected}
                    </span>
                  </div>
                  <div className="mt-3 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                    <span className="font-semibold">{ui("Next: ")}</span>
                    {c.nextAction}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 self-start">
                    <Link to="/leads/$id" params={{ id: c.id }}>
                      {ui("View lead ")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
        <aside className="space-y-6">
          <LatestSignals />
          <div className="rounded-xl bg-sidebar p-4 text-sidebar-foreground">
            <p className="text-xs uppercase tracking-wider text-sidebar-foreground/70">
              {ui("Next up")}
            </p>
            <p className="mt-1 font-semibold text-sidebar-accent-foreground">
              {tasks[0] ? tasks[0].title : ui("Nothing scheduled")}
            </p>
            {tasks[0] && (
              <p className="mt-1 flex items-center gap-1 text-sm">
                <CalendarClock className="h-4 w-4" />
                {tasks[0].due}
              </p>
            )}
            {leadForCompany(tasks[0]?.companyId) && (
              <Button asChild size="sm" variant="secondary" className="mt-3">
                <Link to="/leads/$id" params={{ id: leadForCompany(tasks[0]!.companyId)!.id }}>
                  {ui("Open lead")}
                </Link>
              </Button>
            )}
          </div>
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{ui("Tasks")}</h2>
              <Link to="/tasks" className="text-xs font-medium text-primary">
                {ui("All tasks")}
              </Link>
            </div>
            <ul className="divide-y">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="py-2.5">
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="mt-0.5 flex justify-between text-xs">
                    <span
                      className={cn(
                        t.due.startsWith("Overdue")
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {t.due}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        t.priority === "Urgent"
                          ? "text-destructive"
                          : t.priority === "High"
                            ? "text-highlight"
                            : "text-muted-foreground",
                      )}
                    >
                      {ui(t.priority)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
