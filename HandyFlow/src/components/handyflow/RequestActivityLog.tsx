import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTaskLog } from "@/lib/handyflow.functions";

export function RequestActivityLog({ taskId }: { taskId: string }) {
  const fetchLog = useServerFn(getTaskLog);
  const log = useQuery({
    queryKey: ["task-log", taskId],
    queryFn: () => fetchLog({ data: { taskId } }),
  });

  if (log.isPending) return <p className="text-sm text-muted-foreground" role="status">Loading activity…</p>;
  if (log.isError) return (
    <div role="alert" className="space-y-2 text-sm">
      <p>Could not load the activity log.</p>
      <button type="button" className="outline-button" onClick={() => void log.refetch()}>Try again</button>
    </div>
  );
  if (!log.data.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="space-y-3">
      {log.data.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-border p-3 text-sm">
          <span className="font-medium">{entry.actor}</span>{" "}
          <span className="text-muted-foreground">
            ({entry.actorRole}) · <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
          </span>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {entry.message}{entry.price != null ? ` · $${entry.price}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
