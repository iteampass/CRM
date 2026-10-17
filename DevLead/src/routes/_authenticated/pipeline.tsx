import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DemoNotice, PageHeader, ScorePill } from "@/components/crm/bits";
import { companies, contactFor, STAGES, updateStage, type Stage } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — DevLead CRM" },
      { name: "description", content: "Drag opportunities across your sales stages." },
      { property: "og:title", content: "Pipeline — DevLead CRM" },
      { property: "og:description", content: "Drag opportunities across your sales stages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pipeline,
});
function Pipeline() {
  const { t: ui, locale: uiLocale } = useI18n();
  const [deals, setDeals] = useState(
    companies.map((c) => ({
      id: "o" + c.id,
      companyId: c.id,
      name: c.name,
      score: c.leadScore,
      stage: c.stage,
      value: c.dealValue,
      last: c.lastActivity,
      next: c.nextTask,
      contact: contactFor(c.id)[0],
    })),
  );
  const [over, setOver] = useState<Stage | null>(null);
  const drop = (stage: Stage, id: string) => {
    setOver(null);
    const d = deals.find((x) => x.id === id);
    if (!d || d.stage === stage) return;
    const prev = deals;
    setDeals(deals.map((x) => (x.id === id ? { ...x, stage } : x)));
    updateStage(d.companyId, stage)
      .then(() => toast.success(`${d.name} moved to ${stage}`))
      .catch((e) => {
        setDeals(prev);
        toast.error(e.message);
      });
  };
  return (
    <div>
      <PageHeader
        title={ui("Pipeline")}
        description={ui(
          "Opportunities are separate from leads \u2014 one company can have several.",
        )}
      />
      <DemoNotice />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = deals.filter((d) => d.stage === s);
          return (
            <div
              key={s}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(s, e.dataTransfer.getData("id"))}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-xl border bg-muted/60 p-2 transition-colors",
                over === s && "border-primary bg-accent",
              )}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-sm font-semibold">
                  {ui(s)} <span className="text-muted-foreground">{col.length}</span>
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  ${Math.round(col.reduce((a, d) => a + d.value, 0) / 1000)}
                  {ui("k")}
                </p>
              </div>
              <div className="flex min-h-24 flex-col gap-2">
                {col.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("id", d.id)}
                    className="card-surface cursor-grab p-3 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/leads/$id"
                        params={{ id: d.companyId }}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {d.name}
                      </Link>
                      <ScorePill score={d.score} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.contact
                        ? `${d.contact.firstName} ${d.contact.lastName} · ${d.contact.title}`
                        : ui("No contact")}
                    </p>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="font-mono font-semibold">
                        ${d.value.toLocaleString(uiLocale)}
                      </span>
                      <span className="text-muted-foreground">{d.last}</span>
                    </div>
                    {d.next && (
                      <p className="mt-2 rounded bg-accent px-2 py-1 text-[11px] text-accent-foreground">
                        {ui("Next: ")}
                        {d.next}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
