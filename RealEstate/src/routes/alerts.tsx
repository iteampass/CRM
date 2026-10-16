import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { QueryStatus } from "@/components/QueryStatus";
import { RequireUser } from "@/lib/auth";
import { useAlerts } from "@/lib/personal-data";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/alerts")({
  head: pageHead("Alerts", "Your rental notifications."),
  component: Alerts,
});
function AlertList() {
  const query = useAlerts();
  return (
    <div className="px-6 pb-10">
      <p className="mb-4 text-sm text-muted-foreground">
        Automatic matching, email notifications, and push delivery are not available yet.
      </p>
      <QueryStatus
        pending={query.isPending}
        error={query.error}
        empty={!query.data?.length}
        emptyText="You have no alerts."
        retry={query.refetch}
      />
      {query.markRead.isError && <p role="alert">{query.markRead.error.message}</p>}
      <div className="divide-y rounded-2xl border bg-card">
        {!query.isError &&
          query.data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{a.listings?.title ?? "Listing unavailable"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              {a.is_read ? (
                <span className="text-sm text-muted-foreground">Read</span>
              ) : (
                <button
                  disabled={query.markRead.isPending}
                  className="text-sm text-primary"
                  onClick={() => query.markRead.mutate(a.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
function Alerts() {
  return (
    <AppShell>
      <PageHeader title="Alerts" sub="Your rental notifications" />
      <RequireUser>
        <AlertList />
      </RequireUser>
    </AppShell>
  );
}
