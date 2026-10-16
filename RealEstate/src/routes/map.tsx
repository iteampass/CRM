import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MapView } from "@/components/MapView";
import { QueryStatus } from "@/components/QueryStatus";
import { useListings } from "@/lib/data";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/map")({
  head: pageHead("Map search", "Explore apartment rentals on the map by neighborhood."),
  component: MapPage,
});

function MapPage() {
  const query = useListings();
  const listings = query.isError ? [] : query.data ?? [];
  const [active, setActive] = useState("3");
  return (
    <AppShell>
      <div className="relative h-[calc(100vh-5rem)]">
        <div className="absolute bottom-6 left-6 z-10 rounded-xl bg-card px-4"><QueryStatus pending={query.isPending} error={query.error} empty={!listings.length} emptyText="No active listings are available yet. Check back when rental sources are connected." retry={query.refetch} /></div>
        <MapView items={listings} activeId={active} onSelect={setActive} />
        <div className="absolute left-6 top-6 rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold">Search radius</p>
          <input type="range" min={1} max={20} defaultValue={5} className="mt-2 w-48 accent-primary" />
          <p className="text-xs text-muted-foreground">Within 5 km of center</p>
        </div>
      </div>
    </AppShell>
  );
}
