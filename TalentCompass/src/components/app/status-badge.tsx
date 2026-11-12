import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER, type CandidateStatus } from "@/lib/types";

const tone: Record<CandidateStatus, string> = {
  new: "bg-muted text-foreground/80 border-border",
  screening: "bg-info/10 text-info border-info/25",
  interview: "bg-primary/10 text-primary border-primary/25",
  technical: "bg-primary/10 text-primary border-primary/25",
  final: "bg-warning/12 text-warning border-warning/30",
  offer: "bg-success/12 text-success border-success/30",
  hired: "bg-success text-success-foreground border-success",
  rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CandidateStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
        tone[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusSelect({
  status,
  onChange,
  className,
  disabled = false,
}: {
  status: CandidateStatus;
  onChange: (status: CandidateStatus) => void;
  className?: string;
  disabled?: boolean;
}) {
  if (disabled) return <StatusBadge status={status} className={className ?? ""} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-all outline-none hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-ring/40",
          tone[status],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_LABEL[status]}
        <ChevronDown className="size-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52" onClick={(e) => e.stopPropagation()}>
        {STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => onChange(s)}
            className="justify-between text-sm"
          >
            {STATUS_LABEL[s]}
            {s === status ? <Check className="size-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
