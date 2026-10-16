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
  if (pending)
    return (
      <p role="status" className="py-4 text-muted-foreground">
        Loading…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="space-y-2 py-4">
        <p>Couldn’t load data: {error.message}</p>
        <button className="text-primary underline" onClick={() => retry()}>
          Try again
        </button>
      </div>
    );
  if (empty) return <p className="py-4 text-muted-foreground">{emptyText}</p>;
  return null;
}
