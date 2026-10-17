import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WebRentalSearch } from "@/components/WebRentalSearch";
import { ListingCard } from "@/components/ListingCard";
import { MapView } from "@/components/MapView";
import { QueryStatus } from "@/components/QueryStatus";
import { useListings } from "@/lib/data";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/discover")({
  head: pageHead(
    "Discover apartments",
    "Browse rental listings from every source, ranked by match.",
  ),
  component: Discover,
});
function Discover() {
  const { t: ui } = useI18n();
  const query = useListings();
  const listings = query.isError ? [] : (query.data ?? []);
  const [active, setActive] = useState("1");
  return (
    <AppShell>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            {["All types", "Long term", "€500 – €2,500", "Furnished"].map((f) => (
              <button
                key={f}
                className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm"
              >
                {ui(f)}
                <ChevronDown className="h-4 w-4" />
              </button>
            ))}
            <button
              className="ml-auto grid h-10 w-10 place-items-center rounded-full border bg-card"
              aria-label={ui("More filters")}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{ui("Belgrade, Serbia")}</h1>
            <span className="text-sm text-muted-foreground">
              {listings.length}
              {ui(" results")}
            </span>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {ui("Sort by")}
              <b className="text-foreground">{ui("Newest")}</b>
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full"
              aria-label={ui("Grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground"
              aria-label={ui("List")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <WebRentalSearch />
          <div className="mt-5 space-y-4">
            <QueryStatus
              pending={query.isPending}
              error={query.error}
              empty={!listings.length}
              emptyText={ui(
                "No active listings are available yet. Check back when rental sources are connected.",
              )}
              retry={query.refetch}
            />
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                l={l}
                active={l.id === active}
                onHover={() => setActive(l.id)}
              />
            ))}
          </div>
        </div>
        <div className="sticky top-20 hidden h-[calc(100vh-5rem)] lg:block">
          <MapView items={listings} activeId={active} onSelect={setActive} />
        </div>
      </div>
    </AppShell>
  );
}
