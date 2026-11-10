import { cn } from "@/lib/utils";

const palette = [
  "bg-brand-soft text-brand",
  "bg-purple-soft text-purple",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-info-soft text-info",
];

export function Avatar({
  name,
  initials,
  size = "md",
  className,
}: {
  name: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label =
    initials ??
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("");
  const hue = palette[name.charCodeAt(0) % palette.length];
  const sizes = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        hue,
        sizes,
        className,
      )}
    >
      {label}
    </span>
  );
}
