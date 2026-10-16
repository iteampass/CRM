import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { QueryStatus } from "@/components/QueryStatus";
import { RequireUser } from "@/lib/auth";
import { useSavedSearches, type SavedSearch } from "@/lib/personal-data";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/saved")({ head: pageHead("Saved searches", "Manage your saved apartment searches."), component: Saved });
const field = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
function SearchForm({ initial, onDone }: { initial: SavedSearch | null; onDone: () => void }) {
  const { save } = useSavedSearches();
  return <form className="mb-6 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2" onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const value = (k: string) => String(f.get(k) ?? "").trim();
    const price = (k: string) => value(k) === "" ? null : Number(value(k));
    save.mutate({ ...(initial ? { id: initial.id } : {}), values: { name: value("name"), city: value("city") || null, areas: value("areas").split(",").map(x => x.trim()).filter(Boolean), min_price: price("min"), max_price: price("max"), property_type: value("type") || null, move_in_date: value("move") || null } }, { onSuccess: onDone });
  }}>
    <label>Search name<input className={field} name="name" required maxLength={120} defaultValue={initial?.name ?? ""} /></label>
    <label>City<input className={field} name="city" maxLength={120} defaultValue={initial?.city ?? "Belgrade"} /></label>
    <label>Areas (separate with commas)<input className={field} name="areas" defaultValue={initial?.areas.join(", ") ?? ""} /></label>
    <label>Property type<select className={field} name="type" defaultValue={initial?.property_type ?? ""}><option value="">Any</option><option>Apartment</option><option>Studio</option><option>House</option></select></label>
    <label>Minimum rent (€)<input className={field} type="number" name="min" min="0" max="99999999" step="0.01" defaultValue={initial?.min_price ?? ""} /></label>
    <label>Maximum rent (€)<input className={field} type="number" name="max" min="0" max="99999999" step="0.01" defaultValue={initial?.max_price ?? ""} /></label>
    <label>Move-in date<input className={field} type="date" name="move" defaultValue={initial?.move_in_date ?? ""} /></label>
    <p className="self-center text-sm text-muted-foreground">Automatic matching and alerts are not available yet. Your search criteria will be saved.</p>
    {save.isError && <p role="alert" className="text-destructive sm:col-span-2">{save.error.message}</p>}
    <div className="flex gap-4"><button disabled={save.isPending} className="rounded-full bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50">{save.isPending ? "Saving…" : "Save search"}</button><button type="button" disabled={save.isPending} onClick={onDone}>Cancel</button></div>
  </form>;
}
function SearchList() {
  const query = useSavedSearches();
  const [editing, setEditing] = useState<SavedSearch | null | undefined>(undefined);
  return <div className="px-6 pb-10">
    {editing === undefined ? <button className="mb-5 rounded-full bg-primary px-5 py-2 text-primary-foreground" onClick={() => setEditing(null)}>New search</button> : <SearchForm key={editing?.id ?? "new"} initial={editing} onDone={() => setEditing(undefined)} />}
    <QueryStatus pending={query.isPending} error={query.error} empty={!query.data?.length} emptyText="No saved searches yet." retry={query.refetch} />
    {query.remove.isError && <p role="alert" className="text-destructive">{query.remove.error.message}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!query.isError && query.data?.map(s => <div key={s.id} className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">{s.name}</h2><p className="mt-2 text-sm">{s.city || "Any city"}{s.areas.length ? ` · ${s.areas.join(", ")}` : ""}</p><p className="mt-2 text-sm">€{s.min_price ?? 0} – {s.max_price === null ? "No maximum" : `€${s.max_price}`} · {s.property_type || "Any type"}</p>{s.move_in_date && <p className="mt-2 text-sm">Move-in: {s.move_in_date}</p>}<div className="mt-4 flex gap-4 text-sm"><button className="text-primary" onClick={() => setEditing(s)}>Edit</button><button disabled={query.remove.isPending} className="text-destructive" onClick={() => { if (window.confirm(`Delete saved search “${s.name}”?`)) query.remove.mutate(s.id); }}>Delete</button></div></div>)}</div>
  </div>;
}
function Saved() { return <AppShell><PageHeader title="Saved searches" sub="Save and edit your rental criteria. Automatic alerts are coming later." /><RequireUser><SearchList /></RequireUser></AppShell>; }
