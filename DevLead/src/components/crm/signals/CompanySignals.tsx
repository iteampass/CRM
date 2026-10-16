import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/bits";
import { useSignals, type SignalRow } from "@/lib/signals";
import { SignalFormDialog } from "./SignalFormDialog";
import { SignalsTable, SignalsTableSkeleton } from "./SignalsTable";
import { fmtDate, SignalTypeBadge, StrengthDots } from "./SignalBits";

/** Full signals list for one company, with add/edit. */
export function CompanySignals({ companyId, onChanged }: { companyId: string; onChanged?: () => void }) {
  const { rows, error, reload } = useSignals(companyId);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<SignalRow | null>(null);
  useEffect(() => { if (error) toast.error(error); }, [error]);
  const changed = () => { reload(); onChanged?.(); };
  const add = () => { setEditing(null); setForm(true); };
  return (
    <div className="card-surface">
      <div className="flex items-center justify-between border-b p-3"><p className="text-sm font-semibold">Buying signals</p><Button size="sm" onClick={add}><Plus className="h-4 w-4" />Add signal</Button></div>
      {error ? <p className="p-6 text-center text-sm text-destructive">Could not load signals. <button className="underline" onClick={reload}>Retry</button></p>
        : !rows ? <SignalsTableSkeleton />
        : rows.length === 0 ? <div className="p-3"><EmptyState title="No signals yet" text="Record hiring, funding or launches you spot for this company." action={<Button size="sm" onClick={add}>Add signal</Button>} /></div>
        : <SignalsTable rows={rows} showCompany={false} onChanged={changed} onEdit={(s) => { setEditing(s); setForm(true); }} />}
      <SignalFormDialog open={form} onOpenChange={setForm} editing={editing} companyId={companyId} onSaved={changed} />
    </div>
  );
}

/** Compact card with the 3 most recent signals for a company. */
export function RecentSignalsCard({ companyId }: { companyId: string }) {
  const { rows } = useSignals(companyId);
  const recent = rows?.filter((s) => s.status !== "dismissed").slice(0, 3);
  return (
    <div className="card-surface p-4">
      <p className="mb-2 text-sm font-semibold">Recent signals</p>
      {!recent ? <p className="text-xs text-muted-foreground">Loading…</p> : recent.length === 0 ? <p className="text-xs text-muted-foreground">No signals recorded.</p> : (
        <ul className="space-y-2.5">{recent.map((s) => <li key={s.id}><div className="flex items-center gap-2"><SignalTypeBadge type={s.type} /><StrengthDots strength={s.strength} /></div><p className="mt-1 text-sm">{s.title}</p><p className="text-[11px] text-muted-foreground">{fmtDate(s.detected_at)}</p></li>)}</ul>
      )}
    </div>
  );
}
