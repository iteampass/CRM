import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ExtractRentalButton } from "@/components/ExtractRentalButton";
import { RequireUser, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";
import { listImportedRentals, getRentalRawData } from "@/lib/rental-import-function";
import { rentalAuthHeaders } from "@/lib/rental-import-client";
import { importStatusLabels, publicWebUrl, type ImportedRental } from "@/lib/rental-import";

export const Route = createFileRoute("/imports")({
  head: pageHead(
    "Imported apartments",
    "Structured apartment details extracted from rental pages.",
  ),
  component: Imports,
});
function Imports() {
  const { user } = useAuth();
  return (
    <AppShell>
      <PageHeader
        title="Imported apartments"
        sub="Your extracted rental records, source images and raw data."
      />
      <RequireUser>
        <ImportList key={user?.id} />
      </RequireUser>
    </AppShell>
  );
}
export function ImportList() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["imported-rentals", user?.id, page],
    enabled: !!user,
    queryFn: async () =>
      listImportedRentals({ data: { page }, headers: await rentalAuthHeaders() }),
  });
  const rows = (query.data?.rows ?? []).filter(
    (row) =>
      (!status || row.status === status) &&
      (!filter ||
        [row.title, row.location, row.street, row.address, row.advertiser_name].some((value) =>
          value?.toLowerCase().includes(filter.toLowerCase()),
        )),
  );
  const active = rows.find((row) => row.id === selected);
  return (
    <div className="space-y-5 px-6 pb-10">
      <p className="text-sm text-muted-foreground">
        {t(
          "AI-extracted details are unverified. Blank fields mean the source did not provide them. Photos remain hosted on the original website.",
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          {t("Filter this page")}
          <input
            className="ml-2 rounded border bg-background p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("Location, street or advertiser")}
          />
        </label>
        <label className="text-sm">
          {t("Status")}
          <select
            className="ml-2 rounded border bg-background p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t("All records")}</option>
            {Object.entries(importStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          {t("Refresh")}
        </button>
      </div>
      {query.isPending && <p role="status">{t("Loading…")}</p>}
      {query.isError && <p role="alert">{t(query.error.message)}</p>}
      {query.isSuccess && !query.data.count && (
        <p>{t("No imported apartments yet. Use Extract with AI on a web search result.")}</p>
      )}
      {query.isSuccess && !!query.data.count && !rows.length && (
        <p>{t("No records match the filters on this page.")}</p>
      )}
      {!!rows.length && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                {[
                  "Apartment",
                  "Location",
                  "Street / address",
                  "Floor",
                  "Price",
                  "Building / house",
                  "Parking place",
                  "Agency / owner",
                  "Date announced",
                  "Status",
                  "Details",
                ].map((label) => (
                  <th key={label} className="p-3 font-medium">
                    {t(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="max-w-56 p-3 font-medium">{row.title || t("Untitled listing")}</td>
                  <td className="p-3">{row.location || "—"}</td>
                  <td className="p-3">
                    {[row.street, row.address].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="p-3">{row.floor || "—"}</td>
                  <td className="p-3">
                    {row.price_raw ||
                      [row.price, row.currency, row.price_period]
                        .filter((v) => v !== null)
                        .join(" ") ||
                      "—"}
                  </td>
                  <td className="p-3">{row.building_type || "—"}</td>
                  <td className="p-3">{row.parking || "—"}</td>
                  <td className="p-3">
                    {t(row.advertiser_type)}
                    {row.advertiser_name ? ` · ${row.advertiser_name}` : ""}
                  </td>
                  <td className="p-3">{row.date_announced || "—"}</td>
                  <td className="p-3">{t(importStatusLabels[row.status])}</td>
                  <td className="p-3">
                    <button className="text-primary underline" onClick={() => setSelected(row.id)}>
                      {t("View details")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!query.data?.count && (
        <div className="flex items-center gap-4 text-sm">
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={!page || query.isFetching}
            onClick={() => {
              setPage((p) => p - 1);
              setSelected(null);
            }}
          >
            {t("Previous")}
          </button>
          <span>
            {page + 1} / {Math.ceil(query.data.count / 50)} · {query.data.count} {t("records")}
          </span>
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={(page + 1) * 50 >= query.data.count || query.isFetching}
            onClick={() => {
              setPage((p) => p + 1);
              setSelected(null);
            }}
          >
            {t("Next")}
          </button>
        </div>
      )}
      {active && <RentalDetails key={active.id} row={active} close={() => setSelected(null)} />}
    </div>
  );
}
function RentalDetails({ row, close }: { row: ImportedRental; close: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [showRaw, setShowRaw] = useState(false);
  const raw = useQuery({
    queryKey: ["imported-rental-raw", user?.id, row.id],
    enabled: showRaw,
    queryFn: async () =>
      getRentalRawData({ data: { id: row.id }, headers: await rentalAuthHeaders() }),
  });
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5"
      aria-label={t("Apartment details")}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{row.title || t("Untitled listing")}</h2>
        <button className="rounded border px-3 py-2" onClick={close}>
          {t("Close")}
        </button>
      </div>
      {publicWebUrl(row.source_url) && (
        <a
          className="break-all text-primary underline"
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Original source")}: {row.source_url}
        </a>
      )}
      <p className="text-xs text-muted-foreground">
        {t("Imported")}: {new Date(row.imported_at).toLocaleString(locale)} · {t("Updated")}:{" "}
        {new Date(row.updated_at).toLocaleString(locale)}
      </p>
      {row.error_message && <p role="alert">{t(row.error_message)}</p>}
      {row.status === "failed" && (
        <ExtractRentalButton
          item={{ url: row.source_url, title: row.title ?? "", description: row.description ?? "" }}
        />
      )}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Location", row.location],
          ["Street", row.street],
          ["Address", row.address],
          ["Floor", row.floor],
          [
            "Price",
            row.price_raw ||
              [row.price, row.currency, row.price_period].filter((v) => v !== null).join(" "),
          ],
          ["Building / house", row.building_type],
          ["Parking place", row.parking],
          [
            "Agency / owner",
            `${t(row.advertiser_type)}${row.advertiser_name ? ` · ${row.advertiser_name}` : ""}`,
          ],
          ["Date announced", row.date_announced],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{t(label)}</dt>
            <dd className="break-words text-sm">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="font-medium">{t("Other descriptions")}</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.description || "—"}</p>
      </div>
      {!!row.notes.length && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {row.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
      <div>
        <h3 className="mb-2 font-medium">{t("Apartment images")}</h3>
        {row.images.length ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {row.images
              .filter((image) => publicWebUrl(image.url))
              .map((image, i) => (
                <a
                  key={`${image.url}:${i}`}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={image.url}
                    alt={image.caption || t("Apartment image")}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <p className="text-xs">{image.caption}</p>
                </a>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("No apartment images found in the source.")}
          </p>
        )}
      </div>
      {!!row.listing_links.length && (
        <div>
          <h3 className="font-medium">{t("Individual listing links found on this page")}</h3>
          <div className="mt-3 space-y-3">
            {row.listing_links
              .filter((link) => publicWebUrl(link.url))
              .map((link, i) => (
                <div key={`${link.url}:${i}`} className="rounded border p-3">
                  <a
                    className="text-primary underline"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.title || link.url}
                  </a>
                  <ExtractRentalButton
                    item={{ url: link.url, title: link.title, description: "" }}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
      <button className="rounded border px-3 py-2 text-sm" onClick={() => setShowRaw(!showRaw)}>
        {t(showRaw ? "Hide raw data" : "Show raw data")}
      </button>
      {showRaw && (
        <div>
          {raw.isPending && <p>{t("Loading…")}</p>}
          {raw.isError && <p role="alert">{t(raw.error.message)}</p>}
          {raw.data && (
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-4 text-xs">
              {raw.data}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
