import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTaskLog } from "@/lib/handyflow.functions";

export function RequestActivityLog({ taskId }: { taskId: string }) {
  const { t: tr, locale } = useI18n();
  const fetchLog = useServerFn(getTaskLog);
  const log = useQuery({
    queryKey: ["task-log", taskId],
    queryFn: () => fetchLog({ data: { taskId } }),
  });

  if (log.isPending) return <p className="text-sm text-muted-foreground" role="status">{tr("Loading activity…")}</p>;
  if (log.isError) return (
    <div role="alert" className="space-y-2 text-sm">
      <p>{tr("Could not load the activity log.")}</p>
      <button type="button" className="outline-button" onClick={() => void log.refetch()}>{tr("Try again")}</button>
    </div>
  );
  if (!log.data.length) return <p className="text-sm text-muted-foreground">{tr("No activity yet.")}</p>;
  return (
    <ol className="space-y-3">
      {log.data.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-border p-3 text-sm">
          <span className="font-medium">{entry.actor}</span>{" "}
          <span className="text-muted-foreground">
            ({entry.actorRole}) · <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(locale)}</time>
          </span>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {entry.message}{entry.price != null ? ` · $${entry.price}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
