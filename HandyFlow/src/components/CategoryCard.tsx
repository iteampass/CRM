import { getCategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";
import type { RepairCategory } from "@/lib/mock-data";

export function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: RepairCategory;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const Icon = getCategoryIcon(category.icon);
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      aria-pressed={interactive ? selected : undefined}
      onClick={() => onSelect?.(category.id)}
      className={cn(
        "surface-card group w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        interactive && "hover-lift cursor-pointer",
        selected && "border-brand ring-1 ring-brand",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-brand text-brand-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{category.name}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {category.open_tasks} open tasks
      </p>
    </button>
  );
}
