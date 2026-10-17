import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { searchSocialRentals } from "@/lib/social-search-function";
import { socialSearchInput, type SocialSearchInput } from "@/lib/social-search";

export function SocialRentalSearch() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <section className="mt-6 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">{t("Search Reddit and X")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "Find rental posts. Availability and apartment details are not verified. Reddit: past month. X: past 7 days.",
        )}
      </p>
      {user ? (
        <SearchForm key={user.id} />
      ) : (
        <Link to="/account" className="mt-3 inline-block text-primary">
          {t("Sign in to search social sources")}
        </Link>
      )}
    </section>
  );
}
function SearchForm() {
  const { t, locale } = useI18n();
  const [location, setLocation] = useState("Belgrade");
  const [source, setSource] = useState<SocialSearchInput["source"]>("all");
  const [subreddit, setSubreddit] = useState("");
  const [validation, setValidation] = useState(false);
  const search = useMutation({
    mutationFn: async (input: SocialSearchInput) => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error("Please sign in again to search.");
      return searchSocialRentals({
        data: input,
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
    },
    retry: false,
  });
  const posts = (search.data ?? [])
    .flatMap((result) => result.posts)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const inputClass = "mt-1 w-full rounded-md border bg-background p-2 text-sm";
  return (
    <>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const input = socialSearchInput.safeParse({ location, source, subreddit });
          setValidation(!input.success);
          if (input.success) search.mutate(input.data);
        }}
      >
        <label className="block text-sm">
          {t("City or neighborhood")}
          <input
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            minLength={2}
            maxLength={80}
          />
        </label>
        <label className="block text-sm">
          {t("Source")}
          <select
            className={inputClass}
            value={source}
            onChange={(e) => setSource(e.target.value as SocialSearchInput["source"])}
          >
            <option value="all">{t("Reddit and X")}</option>
            <option value="reddit">Reddit</option>
            <option value="x">X.com</option>
          </select>
        </label>
        {source !== "x" && (
          <label className="block text-sm">
            {t("Subreddit (optional, without r/)")}
            <input
              className={inputClass}
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              maxLength={21}
              pattern="[A-Za-z0-9_]*"
              placeholder="serbia"
            />
          </label>
        )}
        {validation && <p role="alert">{t("Enter a valid location and subreddit name.")}</p>}
        <button
          type="submit"
          disabled={search.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t(search.isPending ? "Searching…" : "Search rental posts")}
        </button>
      </form>
      <div aria-live="polite" className="mt-4 space-y-3">
        {search.isError && <p role="alert">{t(search.error.message)}</p>}
        {search.data?.map(
          (result) =>
            result.message && (
              <p key={result.source} className="text-sm" role="status">
                {result.source === "x" ? "X.com" : "Reddit"}: {t(result.message)}
              </p>
            ),
        )}
        {search.isSuccess && !posts.length && search.data.some((r) => r.status === "ok") && (
          <p>
            {t(
              "No rental posts found in the connected sources. Try another location or subreddit.",
            )}
          </p>
        )}
        {posts.map((post) => (
          <article key={post.id} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              {post.source === "x" ? "X.com" : "Reddit"} · {post.author} ·{" "}
              {new Date(post.publishedAt).toLocaleDateString(locale)}
            </div>
            {post.title && <h3 className="mt-2 font-medium">{post.title}</h3>}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{post.text}</p>
            <a
              className="mt-2 inline-block text-sm font-medium text-primary"
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("View original post")}
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
