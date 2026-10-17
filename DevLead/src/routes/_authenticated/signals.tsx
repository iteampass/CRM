import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/crm/bits";
import { SignalFormDialog } from "@/components/crm/signals/SignalFormDialog";
import { SignalsTable, SignalsTableSkeleton } from "@/components/crm/signals/SignalsTable";
import {
  label,
  SIGNAL_STATUSES,
  SIGNAL_STRENGTHS,
  SIGNAL_TYPES,
  useSignals,
  type SignalRow,
} from "@/lib/signals";
export const Route = createFileRoute("/_authenticated/signals")({
  head: () => ({
    meta: [
      { title: "Signals — DevLead CRM" },
      {
        name: "description",
        content: "Track hiring, funding, launches and other buying signals across every company.",
      },
      { property: "og:title", content: "Signals — DevLead CRM" },
      {
        property: "og:description",
        content: "Track hiring, funding, launches and other buying signals across every company.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignalsPage,
});
const PAGE = 25;
function SignalsPage() {
  const { t: ui } = useI18n();
  const { rows, error, reload } = useSignals();
  const [f, setF] = useState({
    type: "all",
    strength: "all",
    status: "all",
    from: "",
    to: "",
    q: "",
  });
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<SignalRow | null>(null);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const list = useMemo(
    () =>
      (rows ?? []).filter((s) => {
        if (f.type !== "all" && s.type !== f.type) return false;
        if (f.strength !== "all" && s.strength !== f.strength) return false;
        if (f.status !== "all" && s.status !== f.status) return false;
        const d = s.detected_at.slice(0, 10);
        if (f.from && d < f.from) return false;
        if (f.to && d > f.to) return false;
        if (f.q && !(s.company?.name ?? "").toLowerCase().includes(f.q.toLowerCase())) return false;
        return true;
      }),
    [rows, f],
  );
  const upd = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setPage(0);
  };
  const add = () => {
    setEditing(null);
    setForm(true);
  };
  const Sel = ({
    k,
    opts,
    name,
  }: {
    k: "type" | "strength" | "status";
    opts: readonly string[];
    name: string;
  }) => {
    const { t: ui } = useI18n();
    return (
      <Select value={f[k]} onValueChange={(v) => upd(k, v)}>
        <SelectTrigger className="h-8 w-auto min-w-[120px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {ui("All ")}
            {name}
          </SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {ui(label(o))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const newCount = rows?.filter((s) => s.status === "new").length ?? 0;
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={ui("Signals")}
        description={ui(
          rows ? `${rows.length} signals · ${newCount} new` : "Buying signals across every company",
        )}
        actions={
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
            {ui("Add signal")}
          </Button>
        }
      />
      <div className="card-surface">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={f.q}
              onChange={(e) => upd("q", e.target.value)}
              placeholder={ui("Search company")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Sel k="type" opts={SIGNAL_TYPES} name="types" />
          <Sel k="strength" opts={SIGNAL_STRENGTHS} name="strengths" />
          <Sel k="status" opts={SIGNAL_STATUSES} name="statuses" />
          <Input
            type="date"
            value={f.from}
            onChange={(e) => upd("from", e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label={ui("From date")}
          />
          <span className="text-xs text-muted-foreground">{ui("to")}</span>
          <Input
            type="date"
            value={f.to}
            onChange={(e) => upd("to", e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label={ui("To date")}
          />
        </div>
        {error ? (
          <p className="p-10 text-center text-sm text-destructive">
            {ui("Could not load signals. ")}
            <button className="underline" onClick={reload}>
              {ui("Retry")}
            </button>
          </p>
        ) : !rows ? (
          <SignalsTableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={ui("No signals yet")}
              text={ui(
                "Record hiring, funding, launches or leadership changes you spot. Job-board scans add hiring signals automatically.",
              )}
              action={<Button onClick={add}>{ui("Add signal")}</Button>}
            />
          </div>
        ) : list.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {ui("No signals match these filters.")}
          </p>
        ) : (
          <SignalsTable
            rows={list.slice(page * PAGE, page * PAGE + PAGE)}
            onChanged={reload}
            onEdit={(s) => {
              setEditing(s);
              setForm(true);
            }}
          />
        )}
        {list.length > PAGE && (
          <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
            <span>
              {ui("Page ")}
              {page + 1}
              {ui(" of ")}
              {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                {ui("Previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pages - 1}
                onClick={() => setPage(page + 1)}
              >
                {ui("Next")}
              </Button>
            </div>
          </div>
        )}
      </div>
      <SignalFormDialog open={form} onOpenChange={setForm} editing={editing} onSaved={reload} />
    </div>
  );
}
