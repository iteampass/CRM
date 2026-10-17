import { z } from "zod";
import {
  canonicalUrl,
  mergeResults,
  searchQueries,
  webSearchInput,
  type WebSearchInput,
  type WebSearchResult,
  type RentalWebResult,
} from "./web-search";

const responseSchema = z.object({
  query: z.object({ more_results_available: z.boolean().optional() }).optional(),
  web: z
    .object({
      results: z.array(
        z.object({ title: z.string(), url: z.string(), description: z.string().optional() }),
      ),
    })
    .optional(),
});
export async function searchWeb(raw: WebSearchInput): Promise<WebSearchResult> {
  const input = webSearchInput.parse(raw);
  const key = process.env["BRAVE_SEARCH_API_KEY"];
  if (!key)
    return {
      configured: false,
      results: [],
      more: false,
      warnings: ["Web search is not connected yet. You can use the search links below."],
    };
  const results: RentalWebResult[] = [];
  const warnings: string[] = [];
  let more = false;
  // Sequential requests avoid a burst against provider per-second quotas.
  let previousRequestAt = 0;
  for (const { keywords, query } of searchQueries(input)) {
    const wait = 1100 - (Date.now() - previousRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    previousRequestAt = Date.now();
    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.search = new URLSearchParams({
        q: query,
        count: "20",
        offset: String(input.page),
        country: "ALL",
        text_decorations: "false",
      }).toString();
      const response = await fetch(url, {
        headers: { "X-Subscription-Token": key, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        warnings.push(
          response.status === 429
            ? "Search rate limit reached. Please try again later."
            : "Web search is temporarily unavailable. Please try again later.",
        );
        break;
      }
      const body = responseSchema.parse(await response.json());
      more ||= body.query?.more_results_available === true && input.page < 9;
      for (const item of body.web?.results ?? []) {
        const safeUrl = canonicalUrl(item.url);
        if (safeUrl)
          results.push({
            url: safeUrl,
            title: item.title,
            description: item.description ?? "",
            site: new URL(safeUrl).hostname.replace(/^www\./, ""),
            keywords: [keywords],
          });
      }
    } catch {
      warnings.push("Some keyword searches could not finish. Try searching again.");
    }
  }
  return {
    configured: true,
    results: mergeResults(results),
    warnings: [...new Set(warnings)],
    more: more && !warnings.length,
  };
}
