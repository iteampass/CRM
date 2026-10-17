import { z } from "zod";

export const webSearchInput = z.object({
  location: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[\p{L}\p{N}\s,.'’-]+$/u),
  keywords: z.array(z.string().trim().min(2).max(120)).min(1).max(5),
  page: z.number().int().min(0).max(9).default(0),
});
export type WebSearchInput = z.infer<typeof webSearchInput>;
export type RentalWebResult = {
  url: string;
  title: string;
  description: string;
  site: string;
  keywords: string[];
  apifySnapshot?: { payload: string; signature: string };
};
export type WebSearchResult = {
  results: RentalWebResult[];
  warnings: string[];
  more: boolean;
  configured: boolean;
};
export function searchQueries(input: WebSearchInput) {
  return [...new Set(input.keywords)].map((keywords) => ({
    keywords,
    query: `"${input.location}" ${keywords}`,
  }));
}
export function canonicalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.*|fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}
export function mergeResults(results: RentalWebResult[]) {
  const unique = new Map<string, RentalWebResult>();
  for (const result of results) {
    const url = canonicalUrl(result.url);
    if (!url) continue;
    const previous = unique.get(url);
    unique.set(
      url,
      previous
        ? {
            ...(result.apifySnapshot ? result : previous),
            keywords: [...new Set([...previous.keywords, ...result.keywords])],
          }
        : { ...result, url },
    );
  }
  return [...unique.values()];
}
