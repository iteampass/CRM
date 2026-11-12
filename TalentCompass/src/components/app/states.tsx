import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground mb-3 grid size-10 place-items-center rounded-lg">
        <Icon className="size-4.5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function RowSkeletons({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-border divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel space-y-3 p-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
