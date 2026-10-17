import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Search, Bookmark, MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { pageHead } from "@/lib/head";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: pageHead(
    "About Nestly",
    "Get to know Nestly, a place to discover apartments and explore rental posts in Belgrade.",
  ),
  component: About,
});

const features = [
  {
    icon: Search,
    title: "Discover apartments",
    description: "Browse rental listings and explore their locations on the map.",
  },
  {
    icon: Bookmark,
    title: "Keep your shortlist",
    description: "Sign in to save favorite apartments and keep your searches together.",
  },
  {
    icon: MessagesSquare,
    title: "Explore social sources",
    description:
      "Search Reddit and X for rental posts by location, then open the original post to learn more.",
  },
];

function About() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10 sm:py-14">
        <section className="rounded-3xl border bg-card p-6 sm:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {t("About Nestly")}
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("A simpler way to find your next home.")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t(
              "Nestly brings apartment discovery and social rental searches into one place, starting with Belgrade. Explore listings, keep a shortlist, and follow up on the homes that interest you.",
            )}
          </p>
          <Link
            to="/discover"
            className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            {t("Explore apartments")}
          </Link>
        </section>
        <section aria-labelledby="about-features">
          <h2 id="about-features" className="mb-4 text-2xl font-semibold">
            {t("Make room for your next move")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border bg-card p-6">
                <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(description)}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6 sm:p-8" aria-labelledby="about-sources">
          <h2 id="about-sources" className="text-2xl font-semibold">
            {t("Know what you’re looking at")}
          </h2>
          <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
            <p>
              {t(
                "Social search results are leads from Reddit and X, not verified apartment listings. Check availability, price, and details with the original poster.",
              )}
            </p>
            <p>
              {t(
                "Social searches require sign-in and connected sources. Reddit searches cover the past month; X searches cover the past seven days.",
              )}
            </p>
            <p>
              {t(
                "When demo mode is enabled, apartments are sample data rather than live rental inventory. Price insights currently show sample data too.",
              )}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
