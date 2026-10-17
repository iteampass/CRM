import { z } from "zod";
import { socialSearchInput, type SocialSearchInput, type SourceResult } from "./social-search";

class ProviderError extends Error {}
async function request(url: string | URL, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new ProviderError(
      response.status === 429
        ? "Search rate limit reached. Please try again later."
        : [401, 402, 403].includes(response.status)
          ? "API access is unavailable. Ask the administrator to check credentials and API access."
          : "The source is temporarily unavailable. Please try again later.",
    );
  }
  return response.json();
}
const redditResponse = z.object({
  data: z.object({
    children: z.array(
      z.object({
        data: z.object({
          id: z.string().regex(/^[a-z0-9]+$/i),
          title: z.string(),
          selftext: z.string().default(""),
          author: z.string(),
          created_utc: z.number().finite(),
        }),
      }),
    ),
  }),
});
const xResponse = z.object({
  data: z
    .array(
      z.object({
        id: z.string().regex(/^\d+$/),
        text: z.string(),
        author_id: z.string().optional(),
        created_at: z.string().datetime(),
      }),
    )
    .optional(),
  includes: z
    .object({ users: z.array(z.object({ id: z.string(), username: z.string() })).optional() })
    .optional(),
  errors: z.array(z.unknown()).optional(),
});

async function searchReddit(input: SocialSearchInput): Promise<SourceResult> {
  const clientId = process.env["REDDIT_CLIENT_ID"];
  const secret = process.env["REDDIT_CLIENT_SECRET"];
  const userAgent = process.env["REDDIT_USER_AGENT"];
  if (!clientId || !secret || !userAgent)
    return {
      source: "reddit",
      status: "unconfigured",
      posts: [],
      message: "Reddit search is not connected. Ask the administrator to configure it.",
    };
  const token = z.object({ access_token: z.string().min(1) }).parse(
    await request("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }),
  );
  const url = new URL(
    input.subreddit
      ? `https://oauth.reddit.com/r/${input.subreddit}/search`
      : "https://oauth.reddit.com/search",
  );
  url.search = new URLSearchParams({
    q: `${locationQuery(input.location)} (rent OR rental OR izdavanje OR izdajem OR издавање OR издајем) (apartment OR flat OR stan OR стан)`,
    sort: "new",
    t: "month",
    limit: "25",
    type: "link",
    restrict_sr: input.subreddit ? "true" : "false",
    raw_json: "1",
  }).toString();
  const body = redditResponse.parse(
    await request(url, {
      headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": userAgent },
    }),
  );
  return {
    source: "reddit",
    status: "ok",
    posts: body.data.children.map(({ data: post }) => ({
      id: `reddit:${post.id}`,
      source: "reddit",
      title: post.title,
      text: post.selftext.slice(0, 3000),
      author: post.author,
      url: `https://www.reddit.com/comments/${post.id}`,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
    })),
  };
}
export function locationQuery(location: string) {
  return /^(belgrade|beograd|београд)$/i.test(location)
    ? "(Belgrade OR Beograd OR Београд)"
    : `"${location}"`;
}
async function searchX(input: SocialSearchInput): Promise<SourceResult> {
  const token = process.env["X_BEARER_TOKEN"];
  if (!token)
    return {
      source: "x",
      status: "unconfigured",
      posts: [],
      message: "X search is not connected. Ask the administrator to configure it.",
    };
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.search = new URLSearchParams({
    query: `${locationQuery(input.location)} (rent OR rental OR izdavanje OR izdajem OR издавање OR издајем) (apartment OR flat OR stan OR стан) -is:retweet`,
    max_results: "25",
    "tweet.fields": "created_at,author_id",
    expansions: "author_id",
    "user.fields": "username",
    sort_order: "recency",
  }).toString();
  const body = xResponse.parse(
    await request(url, { headers: { Authorization: `Bearer ${token}` } }),
  );
  if (body.errors?.length)
    throw new ProviderError("X returned incomplete results. Please try again later.");
  return {
    source: "x",
    status: "ok",
    posts: (body.data ?? []).map((post) => ({
      id: `x:${post.id}`,
      source: "x",
      title: "",
      text: post.text,
      author: body.includes?.users?.find((u) => u.id === post.author_id)?.username ?? "X user",
      url: `https://x.com/i/status/${post.id}`,
      publishedAt: post.created_at,
    })),
  };
}

// Bounded, process-local throttle; configure a shared gateway limit for multiple replicas.
const searches = new Map<string, number>();
export function checkSearchLimit(userId: string) {
  const now = Date.now();
  for (const [key, until] of searches) if (until <= now) searches.delete(key);
  if (searches.has(userId) || searches.size >= 10000)
    throw new Error("Please wait 15 seconds between searches.");
  searches.set(userId, now + 15000);
}
export async function searchSocialSources(raw: SocialSearchInput): Promise<SourceResult[]> {
  const input = socialSearchInput.parse(raw);
  const sources = input.source === "all" ? (["reddit", "x"] as const) : [input.source];
  return Promise.all(
    sources.map(async (source): Promise<SourceResult> => {
      try {
        return await (source === "reddit" ? searchReddit(input) : searchX(input));
      } catch (error) {
        return {
          source,
          status: "error",
          posts: [],
          message:
            error instanceof ProviderError
              ? error.message
              : "The source could not be searched. Please try again later.",
        };
      }
    }),
  );
}
