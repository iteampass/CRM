import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { QueryStatus } from "@/components/QueryStatus";
import { RequireUser } from "@/lib/auth";
import { useFavorites } from "@/lib/personal-data";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/favorites")({
  head: pageHead("Favorites", "Apartments you've saved."),
  component: Favorites,
});
function FavoriteList() {
  const { t: ui } = useI18n();
  const query = useFavorites();
  return (
    <div className="px-6 pb-10">
      <QueryStatus
        pending={query.isPending}
        error={query.error}
        empty={!query.data?.length}
        emptyText={ui(
          "No saved apartments yet. Bookmark an apartment from Discover to add it here.",
        )}
        retry={query.refetch}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {!query.isError && query.data?.map((l) => <ListingCard key={l.id} l={l} />)}
      </div>
    </div>
  );
}
function Favorites() {
  const { t: ui } = useI18n();
  return (
    <AppShell>
      <PageHeader title={ui("Favorites")} sub={ui("Your saved apartments")} />
      <RequireUser>
        <FavoriteList />
      </RequireUser>
    </AppShell>
  );
}
