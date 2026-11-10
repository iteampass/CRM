import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="surface-card animate-pulse p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-2.5 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-4/5 rounded bg-muted" />
      </div>
      <div className="mt-4 h-9 rounded-lg bg-muted" />
    </div>
  );
}
