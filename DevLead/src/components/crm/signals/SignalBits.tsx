import { cn } from "@/lib/utils";
import { label, type SignalStatus, type SignalStrength, type SignalType } from "@/lib/signals";

const typeTone: Record<SignalType, string> = {
  hiring: "bg-highlight/15 text-highlight",
  funding: "bg-success/15 text-success",
  product_launch: "bg-primary/10 text-primary",
  leadership_change: "bg-warning/20 text-foreground",
  tech_stack_change: "bg-accent text-accent-foreground",
  news_mention: "bg-secondary text-secondary-foreground",
  expansion: "bg-primary/15 text-primary",
  other: "bg-muted text-muted-foreground",
};
export function SignalTypeBadge({ type }: { type: SignalType }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold", typeTone[type])}>{label(type)}</span>;
}
export function StrengthDots({ strength }: { strength: SignalStrength }) {
  const n = strength === "high" ? 3 : strength === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="flex gap-0.5">{[1, 2, 3].map((i) => <span key={i} className={cn("h-2 w-2 rounded-full", i <= n ? (n === 3 ? "bg-highlight" : "bg-primary") : "bg-border")} />)}</span>
      {label(strength)}
    </span>
  );
}
const statusTone: Record<SignalStatus, string> = { new: "border-highlight text-highlight", reviewed: "border-primary text-primary", actioned: "border-success text-success", dismissed: "border-border text-muted-foreground" };
export function SignalStatusBadge({ status }: { status: SignalStatus }) {
  return <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", statusTone[status])}>{label(status)}</span>;
}
export const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
