import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "success" | "warning" | "purple" | "info";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    purple: "bg-purple-soft text-purple",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <div className={cn("surface-card hover-lift p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("inline-flex size-10 items-center justify-center rounded-lg", tones)}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
