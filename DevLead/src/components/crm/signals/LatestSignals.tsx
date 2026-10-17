import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { useSignals } from "@/lib/signals";
import { fmtDate, SignalTypeBadge } from "./SignalBits";
/** Dashboard widget: 5 most recent signals still marked "new". */
export function LatestSignals() {
  const { t: ui, locale: uiLocale } = useI18n();
  const { rows, error } = useSignals();
  const list = rows?.filter((s) => s.status === "new").slice(0, 5);
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{ui("Latest signals")}</h2>
        <Link to="/signals" className="text-xs font-medium text-primary">
          {ui("All signals")}
        </Link>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{ui("Could not load signals.")}</p>
      ) : !list ? (
        <p className="text-xs text-muted-foreground">{ui("Loading\u2026")}</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted-foreground">{ui("No new signals.")}</p>
      ) : (
        <ul className="divide-y">
          {list.map((s) => (
            <li key={s.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{s.company?.name}</span>
                <SignalTypeBadge type={s.type} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {s.title} · {fmtDate(s.detected_at, uiLocale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
