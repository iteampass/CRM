import { CalendarDays, MapPin } from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { getCategoryIcon } from "./CategoryIcon";
import { categoriesById, formatDate, usersById, type TaskRequest } from "@/lib/mock-data";

export function RequestCard({
  task,
  perspective = "handyman",
  action,
}: {
  task: TaskRequest;
  perspective?: "handyman" | "client";
  action?: React.ReactNode;
}) {
  const client = usersById[task.client_id]!;
  const handyman = task.handyman_id ? (usersById[task.handyman_id] ?? null) : null;
  const category = categoriesById[task.category_id]!;
  const Icon = getCategoryIcon(category.icon);
  const person = perspective === "handyman" ? client : handyman;

  return (
    <article className="surface-card hover-lift p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {person ? (
            <Avatar name={person.name} initials={person.avatar} />
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4.5" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{task.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {perspective === "handyman"
                ? `${client.name} · ${category.name}`
                : person
                  ? `${person.name} · ${category.name}`
                  : `Awaiting handyman · ${category.name}`}
            </p>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {task.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDate(task.preferred_date)}
        </span>
        <span className="ml-auto font-semibold text-foreground">${task.budget}</span>
      </div>

      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </article>
  );
}
