import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { companies, contacts, STAGES, intentFor, db, workspace } from "@/lib/mock-data";
import { PageHeader } from "@/components/crm/bits";
export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — DevLead CRM" },
      {
        name: "description",
        content: "Conversion, pipeline value and lead breakdowns by source, signal and industry.",
      },
      { property: "og:title", content: "Analytics — DevLead CRM" },
      {
        property: "og:description",
        content: "Conversion, pipeline value and lead breakdowns by source, signal and industry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
function countBy(items: string[]) {
  const m = new Map<string, number>();
  items.filter(Boolean).forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}
function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const { t: ui } = useI18n();
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="card-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{ui(title)}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{ui("No data yet.")}</p>
      ) : (
        <ul className="space-y-2">
          {data.map(([k, v]) => (
            <li key={k} className="text-xs">
              <div className="mb-1 flex justify-between">
                <span className="truncate">{k}</span>
                <span className="font-mono">{v}</span>
              </div>
              <div className="h-2 rounded bg-secondary">
                <div className="h-2 rounded bg-primary" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function AnalyticsPage() {
  const { t: ui } = useI18n();
  const [out, setOut] = useState<{
    total: number;
    replied: number;
  } | null>(null);
  useEffect(() => {
    db()
      .from("outreach")
      .select("status")
      .eq("workspace_id", workspace.id)
      .then(
        ({
          data,
        }: {
          data:
            | {
                status: string;
              }[]
            | null;
        }) => {
          const rows = data ?? [];
          setOut({
            total: rows.length,
            replied: rows.filter((r) => r.status === "Replied").length,
          });
        },
      );
  }, []);
  const leads = companies;
  const n = leads.length;
  const at = (s: string[]) => leads.filter((l) => s.includes(l.stage)).length;
  const won = at(["Won"]),
    lost = at(["Lost"]);
  const qualified = at(["Qualified", "Proposal", "Negotiation", "Won"]);
  const contacted = at(["Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]);
  const open = leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost");
  const pipeline = open.reduce((s, l) => s + (l.dealValue || 0), 0);
  const avg = n ? Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / n) : 0;
  const kpis: [string, string | number][] = [
    ["Leads discovered", n],
    ["Qualified", qualified],
    ["Contacted", contacted],
    ["Replies", out ? out.replied : "…"],
    ["Open opportunities", open.length],
    ["Won", won],
    ["Lost", lost],
    ["Win rate", pct(won, won + lost)],
    ["Lead → won", pct(won, n)],
    ["Average score", avg],
    ["Pipeline value", money(pipeline)],
    ["Contacts", contacts.length],
  ];
  return (
    <div className="p-6">
      <PageHeader
        title={ui("Analytics")}
        description={ui("Live numbers from your workspace's leads, contacts and outreach.")}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {kpis.map(([l, v]) => (
          <div key={l} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="font-mono text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Bars
          title={ui("Pipeline by stage")}
          data={STAGES.map((s) => [s, at([s])] as [string, number])}
        />
        <Bars
          title={ui("Leads by intent")}
          data={countBy(leads.map((l) => intentFor(l.leadScore)))}
        />
        <Bars title={ui("Leads by source")} data={countBy(leads.map((l) => l.source))} />
        <Bars
          title={ui("Leads by signal")}
          data={countBy(leads.flatMap((l) => l.signals.map((s) => s.type)))}
        />
        <Bars title={ui("Leads by industry")} data={countBy(leads.map((l) => l.industry))} />
        <Bars
          title={ui("Leads by technology")}
          data={countBy(leads.flatMap((l) => l.technologies))}
        />
      </div>
    </div>
  );
}
