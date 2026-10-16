import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/insights")({
  head: pageHead("Price insights", "Average rents and trends by neighborhood."),
  component: Insights,
});

const areas = [
  { name: "Dedinje", avg: 1900 }, { name: "Senjak", avg: 1500 }, { name: "Belgrade Waterfront", avg: 1350 },
  { name: "Vračar", avg: 980 }, { name: "Dorćol", avg: 850 }, { name: "Novi Beograd", avg: 720 },
];
const trend = [810, 830, 845, 860, 880, 870, 900, 920, 935, 950, 960, 975];

function Insights() {
  const max = Math.max(...areas.map((a) => a.avg));
  const tMax = Math.max(...trend), tMin = Math.min(...trend);
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${100 - ((v - tMin) / (tMax - tMin)) * 90 - 5}`).join(" ");
  return (
    <AppShell>
      <PageHeader title="Price insights" sub="Belgrade · based on discovered listings (sample data)" />
      <div className="grid gap-4 px-6 sm:grid-cols-3">
        {[["Average rent", "€975"], ["12-month change", "+20.4%"], ["New listings / week", "412"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{k}</p><p className="mt-1 text-3xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-6 px-6 py-6 pb-10 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-semibold">Average rent trend</p>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-56 w-full">
            <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <p className="font-semibold">By neighborhood</p>
          <div className="mt-4 space-y-3">
            {areas.map((a) => (
              <div key={a.name}>
                <div className="flex justify-between text-sm"><span>{a.name}</span><b>€{a.avg}</b></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(a.avg / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
