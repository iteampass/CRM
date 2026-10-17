import { afterEach, expect, it, vi } from "vitest";
import { canonicalUrl, mergeResults, webSearchInput } from "@/lib/web-search";
import { searchWeb } from "@/lib/web-search.server";
const input = { location: "Novi Sad", keywords: ["izdavanje stanova"], page: 0 };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("rejects oversized searches and unsafe URLs", () => {
  expect(webSearchInput.safeParse({ ...input, keywords: Array(6).fill("rent") }).success).toBe(
    false,
  );
  expect(webSearchInput.safeParse({ ...input, page: 10 }).success).toBe(false);
  expect(canonicalUrl("javascript:alert(1)")).toBeNull();
  expect(canonicalUrl("https://user:pass@example.com")).toBeNull();
});
it("deduplicates tracking links while preserving listing IDs and matched keywords", () => {
  const item = {
    url: "https://example.com/flat?id=1&utm_source=search",
    title: "Flat",
    description: "Rent",
    site: "example.com",
    keywords: ["rent"],
  };
  const merged = mergeResults([
    item,
    { ...item, url: "https://example.com/flat?id=1#photo", keywords: ["stan"] },
    { ...item, url: "https://example.com/flat?id=2" },
  ]);
  expect(merged).toHaveLength(2);
  expect(merged[0]?.keywords).toEqual(["rent", "stan"]);
});
it("does not request a provider without credentials", async () => {
  vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await searchWeb(input)).configured).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
it("sends location, keywords and pagination and drops unsafe provider links", async () => {
  vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-secret");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      query: { more_results_available: true },
      web: {
        results: [
          { title: "Flat", url: "https://example.com/flat" },
          { title: "Bad", url: "javascript:alert(1)" },
        ],
      },
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  const result = await searchWeb({ ...input, page: 1 });
  const url = fetcher.mock.calls[0]![0] as URL;
  expect(url.searchParams.get("q")).toBe('"Novi Sad" izdavanje stanova');
  expect(url.searchParams.get("offset")).toBe("1");
  expect(result.results).toHaveLength(1);
  expect(result.more).toBe(true);
});
it("preserves partial results when a later keyword fails", async () => {
  vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-secret");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ web: { results: [{ title: "Flat", url: "https://example.com/1" }] } }),
      })
      .mockResolvedValueOnce({ ok: false, status: 429 }),
  );
  const result = await searchWeb({ ...input, keywords: ["rent", "stan"] });
  expect(result.results).toHaveLength(1);
  expect(result.warnings[0]).toMatch(/rate limit/);
  expect(result.more).toBe(false);
});
