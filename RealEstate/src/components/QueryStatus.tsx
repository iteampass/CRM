import { useI18n } from "@/lib/i18n";
export function QueryStatus({
  pending,
  error,
  empty,
  emptyText,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  empty: boolean;
  emptyText: string;
  retry: () => unknown;
}) {
  const { t: ui } = useI18n();
  if (pending)
    return (
      <p role="status" className="py-4 text-muted-foreground">
        {ui("Loading\u2026")}
      </p>
    );
  if (error)
    return (
      <div role="alert" className="space-y-2 py-4">
        <p>
          {ui("Couldn\u2019t load data: ")}
          {error.message}
        </p>
        <button className="text-primary underline" onClick={() => retry()}>
          {ui("Try again")}
        </button>
      </div>
    );
  if (empty) return <p className="py-4 text-muted-foreground">{emptyText}</p>;
  return null;
}
