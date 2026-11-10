import { cn } from "@/lib/utils";
import { statusLabels, type TaskStatus } from "@/lib/mock-data";

const styles: Record<TaskStatus, string> = {
  pending: "bg-warning-soft text-warning",
  negotiating: "bg-info-soft text-info",
  agreed: "bg-purple-soft text-purple",
  in_progress: "bg-brand-soft text-brand",
  completed: "bg-success-soft text-success",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabels[status]}
    </span>
  );
}
