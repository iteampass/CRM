import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchSocialSources, checkSearchLimit } from "@/lib/social-search.server";
import { socialSearchInput } from "@/lib/social-search";
const input = { location: "Belgrade", source: "all" as const, subreddit: "" };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
beforeEach(() => {
  vi.stubEnv("REDDIT_CLIENT_ID", "id");
  vi.stubEnv("REDDIT_CLIENT_SECRET", "secret");
  vi.stubEnv("REDDIT_USER_AGENT", "realestate-test/1.0");
  vi.stubEnv("X_BEARER_TOKEN", "private-token");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("social rental search", () => {
  it("does not call providers without credentials", async () => {
    vi.stubEnv("REDDIT_CLIENT_ID", "");
    vi.stubEnv("X_BEARER_TOKEN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await searchSocialSources(input)).map((r) => r.status)).toEqual([
      "unconfigured",
      "unconfigured",
    ]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps Reddit results when X is rate limited and builds rental/location filters", async () => {
    const fetch = vi.fn(async (url: string | URL) => {
      if (String(url).includes("access_token")) return json({ access_token: "reddit-token" });
      if (String(url).includes("api.x.com")) return json({}, 429);
      return json({
        data: {
          children: [
            {
              data: {
                id: "abc",
                title: "Stan",
                selftext: "For rent",
                author: "owner",
                created_utc: 1700000000,
              },
            },
          ],
        },
      });
    });
    vi.stubGlobal("fetch", fetch);
    const result = await searchSocialSources({ ...input, subreddit: "serbia" });
    expect(result[0]!.posts[0]!.url).toBe("https://www.reddit.com/comments/abc");
    expect(result[1]).toMatchObject({
      status: "error",
      posts: [],
      message: expect.stringContaining("rate limit"),
    });
    const url = new URL(
      String(fetch.mock.calls.find(([url]) => String(url).includes("oauth.reddit"))![0]),
    );
    expect(url.pathname).toBe("/r/serbia/search");
    expect(url.searchParams.get("q")).toContain("Beograd");
    expect(url.searchParams.get("q")).toContain("rent");
    expect(url.searchParams.get("restrict_sr")).toBe("true");
  });
  it("maps X posts with attribution and uses server bearer authentication", async () => {
    const fetch = vi.fn().mockResolvedValue(
      json({
        data: [
          {
            id: "123",
            text: "Apartment for rent",
            author_id: "7",
            created_at: "2026-10-17T10:00:00Z",
          },
        ],
        includes: { users: [{ id: "7", username: "owner" }] },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const [result] = await searchSocialSources({ ...input, source: "x" });
    expect(result!.posts[0]).toMatchObject({ author: "owner", url: "https://x.com/i/status/123" });
    expect(fetch.mock.calls[0]![1].headers.Authorization).toBe("Bearer private-token");
    expect(JSON.stringify(result)).not.toContain("private-token");
  });
  it("handles empty responses, malformed payloads, and network failures safely", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ meta: { result_count: 0 } }))
      .mockResolvedValueOnce(json({ data: [{ id: "bad" }] }))
      .mockRejectedValueOnce(new Error("secret token"));
    vi.stubGlobal("fetch", fetch);
    expect((await searchSocialSources({ ...input, source: "x" }))[0]!).toMatchObject({
      status: "ok",
      posts: [],
    });
    expect((await searchSocialSources({ ...input, source: "x" }))[0]!.status).toBe("error");
    expect(JSON.stringify(await searchSocialSources({ ...input, source: "x" }))).not.toContain(
      "secret token",
    );
  });
  it("rejects injected operators and invalid subreddit paths", () => {
    expect(socialSearchInput.safeParse({ ...input, location: 'Belgrade" OR cats' }).success).toBe(
      false,
    );
    expect(socialSearchInput.safeParse({ ...input, subreddit: "../all" }).success).toBe(false);
    expect(socialSearchInput.safeParse({ ...input, location: "Београд" }).success).toBe(true);
  });
  it("throttles repeat searches while allowing other users and later retries", () => {
    vi.useFakeTimers();
    checkSearchLimit("one");
    expect(() => checkSearchLimit("one")).toThrow("15 seconds");
    expect(() => checkSearchLimit("two")).not.toThrow();
    vi.advanceTimersByTime(15001);
    expect(() => checkSearchLimit("one")).not.toThrow();
  });
});
