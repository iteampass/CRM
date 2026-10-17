import { formatListingAge, useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Globe,
  Rss,
  MessageCircle,
  Users,
  Bell,
  ShieldCheck,
  Copy,
  Search,
  Check,
} from "lucide-react";
import hero from "@/assets/apt1.jpg";
import { formatPrice } from "@/lib/listings";
import { QueryStatus } from "@/components/QueryStatus";
import { useListings } from "@/lib/data";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/")({
  head: pageHead(
    "Every apartment rental. One search.",
    "Nestly searches portals, social groups and classifieds so you see new rentals before everyone else.",
  ),
  component: Landing,
});
const sources = [
  { icon: Globe, name: "Rental portals", status: "Setup required" },
  { icon: Users, name: "Facebook groups", status: "Setup required" },
  { icon: MessageCircle, name: "Reddit & X", status: "Setup required" },
  { icon: Rss, name: "RSS & partner feeds", status: "Setup required" },
];
const plans = [
  { name: "Free", price: "€0", features: ["Basic search", "10 favorites", "Saved searches"] },
  {
    name: "Premium",
    price: "€9",
    features: [
      "Unlimited saved searches",
      "Instant alerts",
      "Price history",
      "Scam & duplicate warnings",
      "Export",
    ],
    featured: true,
  },
];
const faqs = [
  [
    "Where do listings come from?",
    "Public portals, authorized social groups, official APIs, feeds and user submissions.",
  ],
  [
    "How do you detect scams?",
    "We flag suspicious prices, reused photos and risky wording, and group duplicates across sources.",
  ],
  ["Can I cancel anytime?", "Premium subscriptions are not available yet."],
];
function Landing() {
  const { t: ui, locale: uiLocale } = useI18n();
  const query = useListings();
  const listings = query.isError ? [] : (query.data ?? []);
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </span>
          {ui("Nestly")}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/discover" className="px-3 py-2 text-muted-foreground hover:text-foreground">
            {ui("Browse")}
          </Link>
          <Link to="/account" className="px-3 py-2 text-muted-foreground hover:text-foreground">
            {ui("Sign in")}
          </Link>
          <Link
            to="/discover"
            className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            {ui("Get started")}
          </Link>
        </nav>
      </header>

      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {ui("Multi-source rental discovery")}
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              {ui("Every apartment rental opportunity.")}
              <span className="text-primary">{ui("One search.")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {ui(
                "Find apartments for rent across the internet in one place \u2014 before everyone else does.",
              )}
            </p>
          </div>
          <div className="relative">
            <img
              src={hero}
              alt={ui("Bright apartment living room")}
              width={1024}
              height={768}
              className="h-96 w-full rounded-3xl object-cover shadow-soft"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{ui("Illustrative apartment")}</p>
              <p className="font-semibold">
                {ui("2BR in Vra\u010Dar \u00B7")}
                <span className="text-primary">€950</span>
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <form
            className="grid gap-2 rounded-3xl border bg-card p-3 shadow-soft md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            onSubmit={(e) => e.preventDefault()}
          >
            {[
              [
                "City",
                <input
                  key="c"
                  defaultValue="Belgrade"
                  className="w-full bg-transparent outline-none"
                />,
              ],
              [
                "Budget",
                <select key="b" className="w-full bg-transparent outline-none">
                  <option>€500 – €1,000</option>
                  <option>€1,000 – €2,000</option>
                  <option>€2,000+</option>
                </select>,
              ],
              [
                "Move-in",
                <input key="m" type="date" className="w-full bg-transparent outline-none" />,
              ],
              [
                "Type",
                <select key="t" className="w-full bg-transparent outline-none">
                  <option value="Any apartment">{ui("Any apartment")}</option>
                  <option value="Studio">{ui("Studio")}</option>
                  <option value="1 bedroom">{ui("1 bedroom")}</option>
                  <option value="2+ bedrooms">{ui("2+ bedrooms")}</option>
                </select>,
              ],
            ].map(([label, el]) => (
              <label key={label as string} className="rounded-2xl px-4 py-2 hover:bg-muted">
                <span className="block text-xs text-muted-foreground">{ui(label)}</span>
                <span className="text-sm font-medium">{el}</span>
              </label>
            ))}
            <Link
              to="/discover"
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground"
            >
              <Search className="h-4 w-4" />
              {ui("Search")}
            </Link>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">
          {ui("One search across the whole internet")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {ui("Sources go live once each integration is connected and verified.")}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s) => (
            <div key={ui(s.name)} className="rounded-2xl border bg-card p-5">
              <s.icon className="h-6 w-6 text-primary" />
              <p className="mt-4 font-semibold">{ui(s.name)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ui(s.status)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold tracking-tight">{ui("Latest discovered")}</h2>
          <Link to="/discover" className="text-sm font-medium text-primary">
            {ui("See all \u2192")}
          </Link>
        </div>
        <QueryStatus
          pending={query.isPending}
          error={query.error}
          empty={!listings.length}
          emptyText={ui(
            "No active listings are available yet. Check back when rental sources are connected.",
          )}
          retry={query.refetch}
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 3).map((l) => (
            <div key={l.id} className="overflow-hidden rounded-2xl border bg-card">
              <img
                src={l.image}
                alt={l.title}
                loading="lazy"
                width={1024}
                height={768}
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <p className="text-xs text-muted-foreground">
                  {l.area} · {formatListingAge(l.foundAgo, uiLocale)}
                </p>
                <p className="mt-1 font-semibold">{l.title}</p>
                <p className="mt-2 font-bold text-primary">
                  {formatPrice(l.price, uiLocale)}
                  <span className="text-xs font-normal text-muted-foreground">{ui(" /month")}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
        {[
          [Bell, "Instant alerts", "Coming soon: notifications when matching apartments appear."],
          [Copy, "Duplicate detection", "The same flat posted five times? You see it once."],
          [ShieldCheck, "Fraud-risk signals", "Suspicious listings are flagged before you reply."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Bell;
          return (
            <div key={ui(t as string)} className="rounded-2xl bg-card p-6 border">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <I className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold">{ui(t as string)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ui(d as string)}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">{ui("Plans")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={ui(p.name)}
              className={`rounded-3xl border p-7 ${p.featured ? "border-primary bg-card shadow-soft" : "bg-card"}`}
            >
              <p className="font-semibold">{ui(p.name)}</p>
              <p className="mt-2 text-4xl font-extrabold">
                {p.price}
                <span className="text-sm font-normal text-muted-foreground">{ui("/month")}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {ui(f)}
                  </li>
                ))}
              </ul>
              <Link
                to="/account"
                aria-disabled={p.featured || undefined}
                onClick={(e) => {
                  if (p.featured) e.preventDefault();
                }}
                className={`mt-6 block rounded-full py-2.5 text-center text-sm font-medium ${p.featured ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {p.featured ? ui("Premium — coming soon") : ui("Get started")}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">{ui("FAQ")}</h2>
        <div className="mt-6 divide-y rounded-2xl border bg-card">
          {faqs.map(([q, a]) => (
            <details key={ui(q)} className="p-5">
              <summary className="cursor-pointer font-medium">{ui(q)}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{ui(a)}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span>{ui("\u00A9 2026 Nestly")}</span>
          <div className="flex gap-5">
            <span>{ui("Privacy")}</span>
            <span>{ui("Terms")}</span>
            <span>{ui("hello@nestly.app")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
