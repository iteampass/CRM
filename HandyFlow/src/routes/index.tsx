import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  Droplets,
  Grid2x2,
  Hammer,
  LayoutPanelTop,
  MessageSquare,
  PaintRoller,
  Quote,
  Ruler,
  ShieldCheck,
  Sofa,
  Star,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { YourRequests } from "@/components/landing/YourRequests";
import { getPublicTestimonials } from "@/lib/testimonials.functions";
import { LandingHeader, LandingFooter } from "@/components/landing/LandingChrome";
import { HeroSlideshow } from "@/components/landing/HeroSlideshow";
import painterImage from "@/assets/painter-home.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HandyFlow — Get Home Repairs Done Without the Hassle" },
      {
        name: "description",
        content:
          "HandyFlow connects you with trusted local handymen for repairs, maintenance and small renovations. Post a job, compare offers and track it to completion.",
      },
      { property: "og:title", content: "HandyFlow — Get Home Repairs Done Without the Hassle" },
      {
        property: "og:description",
        content:
          "Find skilled local handymen, request work, agree on price and timing, and track the job from start to finish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="landing-shell min-h-screen bg-background">
      <LandingHeader />
      <main>
        <Hero />
        <TrustSection />
        <HowItWorks />
        <Services />
        <ForClients />
        <ForHandymen />
        <Testimonials />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

/* ---------------------------------- hero --------------------------------- */

function Hero() {
  const { t: tr, locale } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-brand-soft opacity-60 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="animate-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-3.5 text-brand" />{tr("Vetted local professionals in your area")}</span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">{tr("Get Home Repairs Done.")}<br />
            <span className="text-brand">{tr("Without the Hassle.")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{tr("HandyFlow helps you find skilled local handymen, request the work you need, agree on price and timing, and track the job from first message to final handshake all in one place.")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-card transition-all hover:brightness-110 hover:shadow-card-hover"
            >{tr("Find a Handyman")}<ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup", role: "handyman" }}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >{tr("Become a Handyman")}</Link>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              ["4.8/5", "Average job rating"],
              ["2,400+", "Repairs completed"],
              ["9", "Service categories"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-bold tracking-tight text-foreground">{v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{tr(l)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0 animate-enter">
          <HeroSlideshow />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- trust --------------------------------- */

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Trusted Handymen",
    copy: "Every professional has a verified profile, real ratings and a visible work history.",
  },
  {
    icon: ClipboardList,
    title: "Easy Requests",
    copy: "Describe the job in a minute. Add photos, your address and a preferred date.",
  },
  {
    icon: MessageSquare,
    title: "Clear Communication",
    copy: "Offers, counter-offers and decisions are all logged so nothing gets lost.",
  },
  {
    icon: CalendarCheck,
    title: "Track Every Job",
    copy: "Follow each request from pending to completed, with a schedule you can rely on.",
  },
];

function TrustSection() {
 const { t: tr } = useI18n();
  return (
    <section className="border-y border-border bg-card/60">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="p-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{tr(title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(copy)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ how it works ------------------------------ */

const steps = [
  {
    title: "Describe Your Job",
    copy: "Tell us what needs fixing, where you are and when suits you. Takes about a minute.",
  },
  {
    title: "Connect With a Handyman",
    copy: "Local professionals in your area pick up your request and introduce themselves.",
  },
  {
    title: "Agree on Price & Timing",
    copy: "Compare offers, counter if you need to, then accept the one that works for you.",
  },
  {
    title: "Get the Job Done",
    copy: "Track progress, mark the work complete and leave feedback for your handyman.",
  },
];

function HowItWorks() {
  const { t: tr, locale } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % steps.length);
    }, 2800);
    return () => clearInterval(id);
  }, [paused]);

  const rotate = (dir: 1 | -1) => setActive((a) => (a + dir + steps.length) % steps.length);

  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="How It Works"
          title={tr("Four steps from broken to fixed")}
          copy="No phone tag, no vague quotes, no chasing anyone down. HandyFlow keeps the whole job in one clear flow."
        />
        <ol
          className="how-tiles mt-14 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            setPaused(true);
            dragRef.current = { startX: e.clientX, moved: false };
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current;
            if (!drag) return;
            const dx = e.clientX - drag.startX;
            if (Math.abs(dx) > 40) {
              rotate(dx < 0 ? 1 : -1);
              drag.startX = e.clientX;
              drag.moved = true;
            }
          }}
          onPointerUp={(e) => {
            const drag = dragRef.current;
            dragRef.current = null;
            if (!drag || drag.moved) return;
            // Plain click inside the focused tile: toggle pause/resume
            const tile = (e.target as HTMLElement).closest?.("[data-slot]");
            if (tile && tile.getAttribute("data-slot") === "0") {
              setPaused((p) => !p);
              return;
            }
            // Plain click elsewhere: step once toward the clicked area and resume
            const rect = e.currentTarget.getBoundingClientRect();
            const dir: 1 | -1 = e.clientX < rect.left + rect.width / 2 ? -1 : 1;
            rotate(dir);
            setPaused(false);
          }}
          onPointerLeave={() => {
            dragRef.current = null;
          }}
        >
          {steps.map((s, i) => (
            <li key={s.title} data-slot={(i - active + steps.length) % steps.length}>
              <span className="how-num inline-flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{tr(s.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tr(s.copy)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------- services -------------------------------- */

const services = [
  { icon: Droplets, name: "Plumbing", copy: "Leaks, taps, pipes and boilers." },
  { icon: Zap, name: "Electrical", copy: "Sockets, lighting and wiring." },
  { icon: PaintRoller, name: "Painting", copy: "Walls, ceilings and touch-ups." },
  { icon: Sofa, name: "Furniture Assembly", copy: "Flat-pack builds and fitting." },
  { icon: Hammer, name: "Carpentry", copy: "Doors, shelving and woodwork." },
  { icon: Grid2x2, name: "Tiling", copy: "Bathroom and kitchen tiling." },
  { icon: LayoutPanelTop, name: "Drywall", copy: "Patching, boarding and plaster." },
  { icon: Wrench, name: "General Repairs", copy: "Odd jobs around the home." },
  { icon: Ruler, name: "Minor Renovations", copy: "Small remodels and upgrades." },
];

function Services() {
  const { t: tr, locale } = useI18n();
  return (
    <section id="services" className="scroll-mt-20 border-y border-border bg-card/60">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Services"
          title={tr("Whatever the house throws at you")}
          copy="From a dripping tap to a fitted bookshelf, HandyFlow covers the everyday work that keeps a home running."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, name, copy }) => (
            <Link
              key={name}
              to="/auth"
              search={{ mode: "signup" }}
              className="group flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-accent/50"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{tr(name)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{tr(copy)}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ for clients ------------------------------- */

function ForClients() {
  const { t: tr, locale } = useI18n();
  return (
    <section id="for-clients" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-14 px-5 py-24 lg:grid-cols-2 lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{tr("For clients")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{tr("Finding a good handyman shouldn’t take three phone calls")}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{tr("Post one request and let qualified professionals near you come to it. You stay in control of price, timing and who does the work.")}</p>
          <ul className="mt-8 space-y-4">
            {[
              ["One request, several offers", "Compare price and availability side by side."],
              ["Everything in writing", "Every offer, decline and change is recorded for you."],
              ["Know where the job stands", "Pending, agreed, in progress or done — always clear."],
              ["Rate the work", "Feedback keeps quality high for the next homeowner."],
            ].map(([t, c]) => (
              <li key={t} className="flex gap-3">
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{tr(t)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{tr(c)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-all hover:brightness-110"
          >{tr("Post Your First Request")}<ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="surface-card min-w-0 p-6">
          <img
            src={painterImage}
            alt={tr("Professional painter refreshing a living room wall with a paint roller")}
            width={1448}
            height={1086}
            loading="lazy"
            decoding="async"
            className="mb-6 aspect-[4/3] w-full rounded-xl object-cover"
          />
          <YourRequests />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- for handymen ------------------------------- */

function ForHandymen() {
  const { t: tr, locale } = useI18n();
  return (
    <section id="for-handymen" className="scroll-mt-20 border-y border-border bg-card/60">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-14 px-5 py-24 lg:grid-cols-2 lg:items-center">
        <div className="order-2 grid min-w-0 gap-4 sm:grid-cols-2 lg:order-1">
          {[
            [ClipboardList, "New jobs daily", "Open requests from homeowners in your country."],
            [Wallet, "Win work your way", "Send offers, counter-offers and set your own rate."],
            [MessageSquare, "Talk to clients", "Agree on the details before you pick up a tool."],
            [CalendarCheck, "Stay organised", "A schedule and earnings history that keeps up."],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof ClipboardList;
            return (
              <div key={title as string} className="p-2">
                <I className="size-5 text-brand" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{title as string}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{copy as string}</p>
              </div>
            );
          })}
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{tr("For handymen")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{tr("Spend less time chasing work, more time doing it")}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{tr("HandyFlow puts local jobs in front of you the moment they’re posted. Take a request, agree the terms with the client, and build a public profile that earns you the next one.")}</p>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "handyman" }}
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-all hover:brightness-110"
          >{tr("Join as a Handyman")}<ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ testimonials ------------------------------ */

function Testimonials() {
  const { t: tr, locale } = useI18n();
  const fetchTestimonials = useServerFn(getPublicTestimonials);
  const { data } = useQuery({
    queryKey: ["public-testimonials"],
    queryFn: () => fetchTestimonials(),
  });

  if (!data?.enabled || data.items.length === 0) return null;

  return (
    <section id="testimonials" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Testimonials"
          title={tr("Homeowners and pros who stopped guessing")}
          copy="Real work, tracked end to end. Here’s what people say after their first job on HandyFlow."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {data.items.map((t) => (
            <figure key={t.id} className="flex flex-col p-2">
              <Quote className="size-6 text-brand" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">“{t.quote}”</blockquote>
              <div className="mt-5 flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-warning text-warning" />
                ))}
              </div>
              <figcaption className="mt-3 text-sm">
                <span className="font-semibold text-foreground">{t.name}</span>
                {t.role && <span className="mt-0.5 block text-xs text-muted-foreground">{t.role}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- final CTA ------------------------------- */

function FinalCta() {
  const { t: tr, locale } = useI18n();
  return (
    <section className="px-5 pb-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center sm:px-12">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-background sm:text-4xl">{tr("Start your first repair request today")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-background/70">{tr("It takes a minute to post a job — and you’ll hear from local handymen who are ready to help.")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-all hover:brightness-110"
          >{tr("Find a Handyman")}<ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "handyman" }}
            className="inline-flex items-center justify-center rounded-xl border border-background/25 px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-background/10"
          >{tr("Become a Handyman")}</Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- shared --------------------------------- */

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
 const { t: tr } = useI18n();
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">{tr(eyebrow)}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{tr(title)}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{tr(copy)}</p>
    </div>
  );
}
