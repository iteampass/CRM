import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { LandingHeader, LandingFooter } from "@/components/landing/LandingChrome";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — HandyFlow Home Repair Platform" },
      {
        name: "description",
        content:
          "Simple HandyFlow pricing: free for homeowners posting repair jobs, and a free Handyman Beginner plan that lets pros take up to 5 jobs per month.",
      },
      { property: "og:title", content: "Pricing — HandyFlow" },
      {
        property: "og:description",
        content: "Free for clients. Free to start as a handyman. No hidden fees.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

type Billing = "monthly" | "yearly";

type Plan = {
  name: string;
  price: { monthly: string; yearly: string };
  note: string | { monthly: string; yearly: string };
  blurb: string;
  features: string[];
  cta: string;
  search: { mode: "signup"; role?: "client" | "handyman" };
  featured: boolean;
  hidden?: boolean;
};

const plans: Plan[] = [
  {
    name: "Homeowner",
    price: { monthly: "Free", yearly: "Free" },
    note: "forever",
    blurb: "Post repair requests, compare offers and track every job.",
    features: [
      "Unlimited repair requests",
      "Offers from vetted local handymen",
      "Messaging and negotiation log",
      "Job status tracking and archive",
      "Ratings and feedback",
    ],
    cta: "Find a Handyman",
    search: { mode: "signup" as const },
    featured: false,
  },
  {
    name: "Handyman Beginner",
    price: { monthly: "Free", yearly: "Free" },
    note: "forever",
    blurb: "Get started on HandyFlow and take your first local jobs — free.",
    features: [
      "Take up to 5 jobs per month",
      "See open jobs in your country",
      "Unlimited offers and counter-offers",
      "Client messaging",
      "Public profile with reviews",
    ],
    cta: "Join as a Handyman",
    search: { mode: "signup" as const, role: "handyman" as const },
    featured: false,
  },
  {
    name: "Handyman Pro",
    price: { monthly: "$9", yearly: "$4" },
    note: { monthly: "per month, monthly", yearly: "per month, billed yearly" },
    blurb: "For professionals who want a steady flow of local work.",
    features: [
      "See every open job in your country",
      "Unlimited offers and counter-offers",
      "Client messaging and scheduling",
      "Public profile with reviews",
      "Earnings and completed-work history",
    ],
    cta: "Join as a Handyman",
    search: { mode: "signup", role: "handyman" },
    featured: false,
    hidden: true,
  },
  {
    name: "Team",
    price: { monthly: "$29", yearly: "$19" },
    note: { monthly: "per month, monthly", yearly: "per month, billed yearly" },
    blurb: "For small repair crews managing several handymen.",
    features: [
      "Everything in Handyman Pro",
      "Up to 10 crew members",
      "Shared schedule and workload view",
      "Invite handymen by email",
      "Priority support",
    ],
    cta: "Talk to Us",
    search: { mode: "signup" },
    featured: false,
    hidden: true,
  },
];

function PricingPage() {
  const { t: tr, locale } = useI18n();
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{tr("Pricing")}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{tr("Fair pricing for both sides of the job")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{tr("Homeowners never pay to use HandyFlow. Handymen start free with the Beginner plan — take up to 5 jobs per month, no commission on the work you win.")}</p>

          {/* Billing toggle — hidden while only free plans are shown. Re-enable when Handyman Pro / Team return.
          <div className="mt-8 inline-flex items-center rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                billing === "yearly"
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly <span className="ml-1 text-xs opacity-80">(save ~50%)</span>
            </button>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>
          */}

          <div className="mx-auto mt-14 grid w-fit max-w-4xl gap-6 text-left sm:w-full md:grid-cols-2 lg:grid-cols-2">
            {plans.filter((p) => !p.hidden).map((p) => {
              const priceVal = p.price[billing];
              const noteVal = typeof p.note === "string" ? p.note : p.note[billing];
              return (
                <Link
                  key={p.name}
                  to="/auth"
                  search={p.search}
                  className={`surface-card hover-lift group flex cursor-pointer flex-col p-7 outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand ${
                    p.featured ? "border-brand ring-1 ring-brand" : ""
                  }`}
                >
                  {p.featured && (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{tr("Most popular")}</span>
                  )}
                  <h2 className="text-lg font-semibold text-foreground">{tr(p.name)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{tr(p.blurb)}</p>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-foreground transition-colors group-hover:text-brand">
                      {tr(priceVal)}
                    </span>
                    <span className="text-sm text-muted-foreground">{tr(noteVal)}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {tr(f)}
                      </li>
                    ))}
                  </ul>
                  <span
                    className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all group-hover:brightness-110 ${
                      p.featured
                        ? "bg-brand text-brand-foreground"
                        : "border border-border text-foreground group-hover:bg-accent"
                    }`}
                  >
                    {tr(p.cta)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
