import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { boundedJson } from "./rental-import.server";
import {
  canonicalUrl,
  mergeResults,
  webSearchInput,
  type RentalWebResult,
  type WebSearchInput,
  type WebSearchResult,
} from "./web-search";

export type ApifySnapshot = { payload: string; signature: string };
function sign(payload: string, userId: string, token: string) {
  return createHmac("sha256", token)
    .update(`rental-facebook-v1:${userId}:${payload}`)
    .digest("hex");
}
export function verifyFacebookSnapshot(snapshot: ApifySnapshot, userId: string, url: string) {
  const token = process.env["APIFY_API_TOKEN"];
  const expected = token ? sign(snapshot.payload, userId, token) : "";
  if (
    !expected ||
    !/^[a-f0-9]{64}$/.test(snapshot.signature) ||
    !timingSafeEqual(Buffer.from(snapshot.signature), Buffer.from(expected))
  )
    throw new Error("Facebook result could not be verified. Search Facebook again.");
  const value = z
    .object({ url: z.string(), expiresAt: z.number(), content: z.string().max(60000) })
    .parse(JSON.parse(snapshot.payload));
  if (value.expiresAt < Date.now() || canonicalUrl(value.url) !== canonicalUrl(url))
    throw new Error("Facebook result has expired. Search Facebook again.");
  return value.content;
}
export function normalizeFacebookItems(
  items: unknown[],
  input: WebSearchInput,
  userId: string,
  token: string,
): RentalWebResult[] {
  const results: RentalWebResult[] = [];
  for (const item of items.slice(0, 50)) {
    const parsed = z
      .object({
        url: z.string(),
        text: z.string().nullish(),
        caption: z.string().nullish(),
        title: z.string().nullish(),
        authorName: z.string().nullish(),
      })
      .passthrough()
      .safeParse(item);
    if (!parsed.success) continue;
    const row = parsed.data;
    const url = canonicalUrl(row.url);
    if (
      !url ||
      !["facebook.com", "www.facebook.com", "m.facebook.com"].includes(new URL(url).hostname) ||
      new URL(url).pathname.startsWith("/search")
    )
      continue;
    const description = row.text || row.caption || "";
    if (!description.trim()) continue;
    const content = JSON.stringify(item);
    // Keep whole JSON records rather than truncating in the middle of image URLs.
    if (content.length > 60000) continue;
    const payload = JSON.stringify({ url, expiresAt: Date.now() + 3600000, content });
    results.push({
      url,
      title: (row.title || row.authorName || description).slice(0, 200),
      description: description.slice(0, 10000),
      site: "facebook.com",
      keywords: [],
      apifySnapshot: { payload, signature: sign(payload, userId, token) },
    });
  }
  return mergeResults(results);
}
const activeSearches = new Map<string, number>();
export async function searchFacebook(
  raw: WebSearchInput,
  userId: string,
): Promise<WebSearchResult> {
  const input = webSearchInput.parse(raw);
  const token = process.env["APIFY_API_TOKEN"];
  if (!token)
    return {
      results: [],
      more: false,
      configured: false,
      warnings: ["Facebook search is not connected. Configure APIFY_API_TOKEN on the server."],
    };
  if (input.page !== 0)
    throw new Error("Facebook searches do not support pagination. Start a new search.");
  const now = Date.now();
  for (const [id, until] of activeSearches) if (until <= now) activeSearches.delete(id);
  if (activeSearches.has(userId) || activeSearches.size >= 10000)
    throw new Error("Please wait two minutes between Facebook searches.");
  activeSearches.set(userId, now + 120000);
  try {
    const url = new URL(
      "https://api.apify.com/v2/acts/apify~facebook-search-scraper/run-sync-get-dataset-items",
    );
    url.search = new URLSearchParams({
      timeout: "90",
      maxTotalChargeUsd: "1",
      limit: "50",
      clean: "true",
      format: "json",
    }).toString();
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(105000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: [...new Set(input.keywords)],
        locations: [input.location],
        searchType: "posts",
        resultsLimit: 50,
      }),
    });
    if (!response.ok)
      return {
        results: [],
        more: false,
        configured: true,
        warnings: [
          response.status === 429
            ? "Apify is rate limited. Please try again later."
            : [401, 402, 403].includes(response.status)
              ? "Apify access is unavailable. Check the API token, Actor access and account balance."
              : "Facebook scraping did not finish successfully. Check the run in Apify before retrying.",
        ],
      };
    const items = z.array(z.unknown()).parse(await boundedJson(response, 4_000_000));
    const results = normalizeFacebookItems(items, input, userId, token);
    return {
      results,
      more: false,
      configured: true,
      warnings:
        items.length && !results.length
          ? ["Apify returned no usable public posts. Try different keywords."]
          : [],
    };
  } catch {
    return {
      results: [],
      more: false,
      configured: true,
      warnings: [
        "Facebook scraping did not finish successfully. Check the run in Apify before retrying.",
      ],
    };
  }
}
