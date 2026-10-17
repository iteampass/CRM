import { FacebookRentalSearch } from "./FacebookRentalSearch";
import { SaveWebSearch } from "./SaveWebSearch";
import { ExtractRentalButton } from "./ExtractRentalButton";
import { useState } from "react";
import { useSearchLocation } from "@/lib/search-location";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { searchWebRentals } from "@/lib/web-search-function";
import {
  mergeResults,
  searchQueries,
  webSearchInput,
  type RentalWebResult,
  type WebSearchInput,
} from "@/lib/web-search";

type InitialSearch = Pick<WebSearchInput, "location" | "keywords">;
export function WebRentalSearch({ initialSearch }: { initialSearch?: InitialSearch | undefined }) {
  const { user } = useAuth();
  return (
    <SearchForm
      key={`${user?.id ?? "guest"}:${JSON.stringify(initialSearch)}`}
      signedIn={!!user}
      initialSearch={initialSearch}
    />
  );
}
function SearchForm({
  signedIn,
  initialSearch,
}: {
  signedIn: boolean;
  initialSearch?: InitialSearch | undefined;
}) {
  const { t } = useI18n();
  const { location: profileLocation } = useSearchLocation();
  const [editedLocation, setLocation] = useState<string | null>(null);
  const location = editedLocation ?? initialSearch?.location ?? profileLocation;
  const [expanded, setExpanded] = useState(true);
  const [facebookBusy, setFacebookBusy] = useState(false);
  const [keywords, setKeywords] = useState(
    initialSearch?.keywords.join("\n") ?? "apartments for rent\nizdavanje stanova",
  );
  const [submitted, setSubmitted] = useState<WebSearchInput | null>(null);
  const [results, setResults] = useState<RentalWebResult[]>([]);
  const [site, setSite] = useState("");
  const [sort, setSort] = useState("relevance");
  const [validation, setValidation] = useState(false);
  const search = useMutation({
    mutationFn: async (input: WebSearchInput) => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error("Please sign in again to search.");
      return searchWebRentals({
        data: input,
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
    },
    onSuccess: (data, input) => {
      setSubmitted(input);
      setResults((previous) =>
        mergeResults(
          input.page ||
            (submitted?.location === input.location &&
              JSON.stringify(submitted.keywords) === JSON.stringify(input.keywords))
            ? [...previous, ...data.results]
            : data.results,
        ),
      );
    },
    retry: false,
  });
  const parsed = webSearchInput.safeParse({
    location,
    keywords: keywords
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    page: 0,
  });
  const visible = results
    .filter((r) => !site || r.site === site)
    .sort((a, b) =>
      sort === "site"
        ? a.site.localeCompare(b.site)
        : sort === "title"
          ? a.title.localeCompare(b.title)
          : 0,
    );
  const inputClass = "mt-1 w-full rounded-md border bg-background p-2 text-sm";
  return (
    <section className="mt-6 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{t("Search the web for rentals")}</h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="web-search-panel"
          onClick={() => setExpanded(!expanded)}
          className="rounded border px-3 py-2 text-sm"
        >
          {t(expanded ? "Collapse search" : "Expand search")}
        </button>
      </div>
      <div id="web-search-panel" hidden={!expanded}>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Combine rental searches into one list. Results may include directory pages; availability and apartment details are not verified.",
          )}
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setValidation(!parsed.success);
            if (parsed.success && signedIn && !facebookBusy) {
              if (
                submitted?.location !== parsed.data.location ||
                JSON.stringify(submitted.keywords) !== JSON.stringify(parsed.data.keywords)
              ) {
                setResults([]);
                setSubmitted(null);
              }
              setSite("");
              search.mutate(parsed.data);
            }
          }}
        >
          <label className="block text-sm">
            {t("City, town or region")}
            <input
              className={inputClass}
              required
              minLength={2}
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t("Keywords (one search per line, up to 5)")}
            <textarea
              className={inputClass}
              rows={4}
              required
              maxLength={604}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {t(
              "Use local rental terms, features, or site:example.com to focus on a website. Your location is added to every search.",
            )}
          </p>
          {validation && (
            <p role="alert">
              {t("Enter a location and 1–5 keyword lines, each 2–120 characters.")}
            </p>
          )}
          {signedIn ? (
            <button
              type="submit"
              disabled={search.isPending || facebookBusy}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {t(search.isPending ? "Searching…" : "Find rentals")}
            </button>
          ) : (
            <Link to="/account" className="inline-block text-primary">
              {t("Sign in to aggregate results")}
            </Link>
          )}
        </form>
        {signedIn && (
          <FacebookRentalSearch
            location={location}
            keywords={keywords}
            disabled={search.isPending}
            onBusy={setFacebookBusy}
            onResults={(data, input) => {
              if (!data.configured) return;
              const same =
                submitted?.location === input.location &&
                JSON.stringify(submitted.keywords) === JSON.stringify(input.keywords);
              setResults((previous) =>
                mergeResults(same ? [...previous, ...data.results] : data.results),
              );
              if (!same) {
                search.reset();
                setSite("");
                setSubmitted(input);
              }
            }}
          />
        )}
        {signedIn && <SaveWebSearch location={location} keywords={keywords} />}
        {parsed.success && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-primary">
              {t("Open searches in Google, Bing or Brave")}
            </summary>
            <p className="my-2 text-xs text-muted-foreground">
              {t(
                "These links open external search pages. Their results are not imported automatically.",
              )}
            </p>
            <ul className="space-y-2">
              {searchQueries(parsed.data).map(({ keywords: phrase, query }) => (
                <li key={phrase} className="rounded border p-2">
                  <p className="mb-1 break-words">{query}</p>
                  <div className="flex gap-4">
                    {[
                      ["Google", "https://www.google.com/search?q="],
                      ["Bing", "https://www.bing.com/search?q="],
                      ["Brave", "https://search.brave.com/search?q="],
                    ].map(([name, base]) => (
                      <a
                        className="text-primary underline"
                        key={name}
                        href={base + encodeURIComponent(query)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {name}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div aria-live="polite" className="mt-4 space-y-3">
          {search.isError && <p role="alert">{t(search.error.message)}</p>}
          {!search.isPending &&
            search.data?.warnings.map((message) => (
              <p key={message} role="status" className="text-sm">
                {t(message)}
              </p>
            ))}
          {submitted && (
            <p className="font-medium">
              {submitted.location} · {results.length} {t("unique results")}
            </p>
          )}
          {!!results.length && (
            <div className="flex flex-wrap gap-3">
              <label className="text-sm">
                {t("Website")}
                <select
                  className={inputClass}
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                >
                  <option value="">{t("All websites")}</option>
                  {[...new Set(results.map((r) => r.site))].sort().map((domain) => (
                    <option key={domain}>{domain}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {t("Sort by")}
                <select
                  className={inputClass}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="relevance">{t("Search order")}</option>
                  <option value="site">{t("Website")}</option>
                  <option value="title">{t("Title")}</option>
                </select>
              </label>
            </div>
          )}
          {search.isSuccess &&
            search.data.configured &&
            !results.length &&
            !search.data.warnings.length && (
              <p>{t("No results found. Try broader keywords or another location.")}</p>
            )}
          {visible.map((result) => (
            <article key={result.url} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{result.site}</p>
              <h3 className="mt-1 font-medium">
                <a
                  className="text-primary hover:underline"
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {result.title}
                </a>
              </h3>
              <p className="mt-2 break-words text-sm">{result.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {result.apifySnapshot
                  ? t("Source: Apify Facebook Search")
                  : `${t("Matched keywords")}: ${result.keywords.join(" · ")}`}
              </p>
              {signedIn && (
                <ExtractRentalButton
                  item={{
                    url: result.url,
                    title: result.title,
                    description: result.description,
                    ...(result.apifySnapshot ? { apifySnapshot: result.apifySnapshot } : {}),
                  }}
                />
              )}
            </article>
          ))}
          {search.data?.more && submitted && (
            <button
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              disabled={search.isPending || facebookBusy}
              onClick={() => search.mutate({ ...submitted, page: submitted.page + 1 })}
            >
              {t(search.isPending ? "Searching…" : "Load more results")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
