import { cn } from "@/lib/utils";

function toneFor(score: number) {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-foreground";
  return "text-destructive";
}

export function ScoreValue({
  score,
  size = "sm",
  className,
}: {
  score: number | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (score === null) {
    return (
      <span className={cn("text-muted-foreground tabular-nums", className)}>
        {size === "lg" ? "-" : "-"}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-semibold tabular-nums transition-colors",
        size === "lg" ? "text-3xl tracking-tight" : "text-sm",
        toneFor(score),
        className,
      )}
    >
      {score.toFixed(1)}
      <span
        className={cn(
          "text-muted-foreground font-normal",
          size === "lg" ? "ml-1 text-base" : "ml-0.5 text-xs",
        )}
      >
        /10
      </span>
    </span>
  );
}

export function ScoreBar({ score, className }: { score: number | null; className?: string }) {
  return (
    <div className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          score === null
            ? "bg-transparent"
            : score >= 8
              ? "bg-success"
              : score >= 6
                ? "bg-primary"
                : "bg-destructive",
        )}
        style={{ width: `${((score ?? 0) / 10) * 100}%` }}
      />
    </div>
  );
}
