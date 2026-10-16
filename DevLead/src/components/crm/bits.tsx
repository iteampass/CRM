import { cn } from "@/lib/utils";
import { intentFor, type Intent } from "@/lib/mock-data";
import type { ReactNode } from "react";

const intentStyle: Record<Intent, string> = {
  "Very High": "bg-highlight text-highlight-foreground",
  High: "bg-highlight/15 text-highlight",
  Medium: "bg-accent text-accent-foreground",
  Low: "bg-muted text-muted-foreground",
};
export function IntentBadge({ score }: { score: number }) {
  const i = intentFor(score);
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap", intentStyle[i])}>{i}</span>;
}
export function ScorePill({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const tone = score >= 85 ? "border-highlight text-highlight" : score >= 70 ? "border-primary text-primary" : score >= 40 ? "border-border text-foreground" : "border-border text-muted-foreground";
  return <span className={cn("inline-flex items-center justify-center rounded-full border-2 font-bold font-mono", tone, size === "lg" ? "h-14 w-14 text-xl" : "h-8 w-8 text-xs")}>{score}</span>;
}
export function CompanyAvatar({ name, className }: { name: string; className?: string }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
  const tones = ["bg-primary/10 text-primary", "bg-highlight/15 text-highlight", "bg-success/15 text-success", "bg-accent text-accent-foreground", "bg-warning/20 text-foreground"];
  return <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold", tones[hue], className)}>{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>;
}
export function TechTags({ tech, max = 3 }: { tech: string[]; max?: number }) {
  return <div className="flex flex-wrap gap-1">{tech.slice(0, max).map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">{t}</span>)}{tech.length > max && <span className="text-[11px] text-muted-foreground">+{tech.length - max}</span>}</div>;
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-bold tracking-tight">{title}</h1>{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function DemoNotice() {
  return null;
}
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="card-surface flex flex-col items-center px-6 py-14 text-center"><p className="font-semibold">{title}</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
