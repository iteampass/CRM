import { afterEach, expect, it, vi } from "vitest";
import {
  normalizeFacebookItems,
  searchFacebook,
  verifyFacebookSnapshot,
} from "@/lib/apify-facebook.server";
import { emptyApartment } from "@/lib/rental-import";
import { extractRental } from "@/lib/rental-import.server";
import { mergeResults } from "@/lib/web-search";
const input = { location: "Valjevo", keywords: ["izdavanje stanova"], page: 0 };
const post = {
  url: "https://www.facebook.com/test/posts/123",
  text: "Izdajem stan Valjevo 400 EUR",
  time: "2026-10-17T10:00:00Z",
  media: [{ url: "https://scontent.fbcdn.net/room.jpg" }],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("does not call Apify without server credentials", async () => {
  vi.stubEnv("APIFY_API_TOKEN", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await searchFacebook(input, "missing-key")).configured).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
it("sends the documented post-search input with server auth, result and spending limits", async () => {
  vi.stubEnv("APIFY_API_TOKEN", "apify-secret");
  const fetcher = vi.fn().mockResolvedValue(Response.json([post]));
  vi.stubGlobal("fetch", fetcher);
  const result = await searchFacebook(input, "search-owner");
  expect(result.results).toHaveLength(1);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).not.toContain("apify-secret");
  expect(url.searchParams.get("maxTotalChargeUsd")).toBe("1");
  expect(url.searchParams.get("timeout")).toBe("90");
  expect(JSON.parse(init.body)).toEqual({
    categories: ["izdavanje stanova"],
    locations: ["Valjevo"],
    searchType: "posts",
    resultsLimit: 50,
  });
  expect(init.headers.Authorization).toBe("Bearer apify-secret");
  await expect(searchFacebook(input, "search-owner")).rejects.toThrow("two minutes");
});
it("filters unsafe or unrelated links, deduplicates posts and preserves raw media", () => {
  vi.stubEnv("APIFY_API_TOKEN", "secret");
  const rows = normalizeFacebookItems(
    [
      post,
      post,
      { ...post, url: "javascript:alert(1)" },
      { ...post, url: "https://facebook.com.evil.org/post" },
      { ...post, url: "https://www.facebook.com/search/posts?q=rent" },
    ],
    input,
    "owner",
    "secret",
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]!.apifySnapshot!.payload).toContain("room.jpg");
  const { apifySnapshot: _snapshot, ...webResult } = rows[0]!;
  const merged = mergeResults([webResult, rows[0]!]);
  expect(merged[0]!.apifySnapshot).toBeDefined();
});
it("rejects tampered, cross-user, cross-post and expired snapshots", () => {
  vi.stubEnv("APIFY_API_TOKEN", "secret");
  const snapshot = normalizeFacebookItems([post], input, "owner", "secret")[0]!.apifySnapshot!;
  expect(verifyFacebookSnapshot(snapshot, "owner", post.url)).toContain("400 EUR");
  expect(() => verifyFacebookSnapshot(snapshot, "other", post.url)).toThrow("verified");
  expect(() =>
    verifyFacebookSnapshot({ ...snapshot, payload: snapshot.payload + " " }, "owner", post.url),
  ).toThrow("verified");
  expect(() =>
    verifyFacebookSnapshot(snapshot, "owner", "https://www.facebook.com/other/posts/2"),
  ).toThrow();
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 3600001);
  expect(() => verifyFacebookSnapshot(snapshot, "owner", post.url)).toThrow("expired");
});
it("reports provider access failures without exposing provider responses", async () => {
  vi.stubEnv("APIFY_API_TOKEN", "secret");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("secret provider data", { status: 403 })),
  );
  const result = await searchFacebook(input, "denied");
  expect(result.warnings[0]).toMatch(/account balance/);
  expect(JSON.stringify(result)).not.toContain("secret provider data");
});
it("imports scraped data through AI without reopening Facebook", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                ...emptyApartment,
                page_kind: "listing",
                price: 400,
                currency: "EUR",
              }),
            },
          ],
        },
      ],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = await extractRental(
    { url: post.url, title: "Rental", description: post.text },
    JSON.stringify(post),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe("https://api.openai.com/v1/responses");
  expect(result.status).toBe("extracted");
  expect(result.raw_data["apify_response"]).toEqual(post);
});
