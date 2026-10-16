import { Link } from "@tanstack/react-router";
import { useSignals } from "@/lib/signals";
import { fmtDate, SignalTypeBadge } from "./SignalBits";

/** Dashboard widget: 5 most recent signals still marked "new". */
export function LatestSignals() {
  const { rows, error } = useSignals();
  const list = rows?.filter((s) => s.status === "new").slice(0, 5);
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Latest signals</h2><Link to="/signals" className="text-xs font-medium text-primary">All signals</Link></div>
      {error ? <p className="text-xs text-destructive">Could not load signals.</p> : !list ? <p className="text-xs text-muted-foreground">Loading…</p> : list.length === 0 ? <p className="text-xs text-muted-foreground">No new signals.</p> : (
        <ul className="divide-y">{list.map((s) => (
          <li key={s.id} className="py-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{s.company?.name}</span><SignalTypeBadge type={s.type} /></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{s.title} · {fmtDate(s.detected_at)}</p></li>
        ))}</ul>
      )}
    </div>
  );
}
