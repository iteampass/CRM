import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Blocks, Braces, Check, Code2, Database, Github, Globe, Linkedin, LockKeyhole, Mail, MapPin, Menu, Moon, Server, ShieldCheck, Sun, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/portfolio/ContactForm";
import { HeroSlideshow } from "@/components/portfolio/HeroSlideshow";
import workspaceImage from "@/assets/ivan-workspace.jpg";
import { getSiteContent } from "@/lib/site-content.functions";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => ({ meta: [
    { title: "Ivan — Full Stack Developer | TeamPass.me" },
    { name: "description", content: "Ivan, freelance full stack developer in Belgrade. Fast, scalable web apps from database to UI. Explore TeamPass, HandyFlow, and get in touch." },
    { property: "og:title", content: "Ivan — Full Stack Developer" },
    { property: "og:description", content: "From database to UI. Explore Ivan's projects and discuss your next web application." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(loaderData?.heroSlides[0]?.url?.startsWith("https://") ? [
      { property: "og:image", content: loaderData.heroSlides[0].url },
      { name: "twitter:image", content: loaderData.heroSlides[0].url },
    ] : []),
  ] }),
  loader: () => getSiteContent(),
  component: Portfolio,
});

const navigation = ["About", "Skills", "Projects", "Process", "Contact"];
const skillIcons = [Code2, Server, Database, Blocks];
const serviceIcons = [Globe, Braces, Code2, Wrench];

function Portfolio() {
  const c = Route.useLoaderData();
  const socials: { label: string; href: string; Icon: LucideIcon }[] = [
    { label: "GitHub", href: c.socials.github, Icon: Github },
    { label: "LinkedIn", href: c.socials.linkedin, Icon: Linkedin },
  ].filter((x) => x.href);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    try { setDark(localStorage.getItem("ivan-portfolio-theme") === "dark"); } catch { /* Storage is optional. */ }
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("ivan-portfolio-theme", next ? "dark" : "light"); } catch { /* Storage is optional. */ }
  }
  return <div className={`portfolio ${dark ? "portfolio-dark" : ""}`} id="top">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-3">Skip to content</a>
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="portfolio-container flex h-20 items-center justify-between gap-4">
        <a href="#top" aria-label="Ivan, back to top" className="flex items-baseline gap-1 text-xl font-bold">ivan<span className="text-highlight">.</span><span className="ml-3 hidden text-xs font-normal text-muted-foreground sm:inline">FULL STACK DEVELOPER</span></a>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">{navigation.map(name => <a key={name} href={`#${name.toLowerCase()}`} className="text-sm font-medium text-muted-foreground transition-colors hover:text-highlight">{name}</a>)}</nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun /> : <Moon />}</Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="portfolio-container flex flex-col gap-4 border-t py-5 md:hidden">{navigation.map(name => <a key={name} onClick={() => setMenuOpen(false)} href={`#${name.toLowerCase()}`} className="text-sm font-medium">{name}</a>)}</nav>}
    </header>
    <main id="main">
      <section className="portfolio-hero relative isolate overflow-hidden bg-sidebar text-sidebar-accent-foreground">
        <HeroSlideshow slides={c.heroSlides} />
        <div className="portfolio-hero-shade absolute inset-0 -z-10" />
        <div className="portfolio-container flex min-h-[660px] items-center py-20">
          <div className="portfolio-intro max-w-[610px]">
            <p className="mb-7 flex items-center gap-2 text-xs font-medium uppercase tracking-widest"><span className="h-2 w-2 rounded-full bg-highlight" />{c.hero.availability}</p>
            <h1 className="text-6xl font-bold leading-[1.06] sm:text-7xl">Hi, I’m {c.hero.name}<span className="text-highlight">.</span><br /><span className="mt-3 block text-4xl font-medium sm:text-5xl">{c.hero.title}</span></h1>
            <p className="mt-7 max-w-[460px] text-xl leading-relaxed text-sidebar-foreground">{c.hero.tagline}</p>
            <p className="mt-4 max-w-[450px] text-sm leading-relaxed text-sidebar-foreground/80">{c.hero.subtext}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 bg-highlight text-highlight-foreground hover:bg-highlight/90"><a href="#projects">View my work <ArrowUpRight /></a></Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-sidebar-foreground/40 bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><a href="#contact">Contact me <Mail /></a></Button>
            </div>
            <div className="mt-9 flex items-center gap-5 text-sidebar-foreground/80"><span className="flex items-center gap-2 text-xs"><MapPin className="size-3.5" />{c.hero.location}</span><span className="h-4 border-l border-sidebar-foreground/30" />{socials.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="transition-colors hover:text-highlight"><Icon className="size-4" /></a>)}</div>
          </div>
        </div>
        <a href="#about" aria-label="Scroll to about" className="absolute bottom-6 right-8 text-sidebar-foreground"><ArrowDown className="size-5" /></a>
      </section>
      <div className="border-b bg-card"><div className="portfolio-container flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-6"><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">From idea to production</p><div className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-muted-foreground">{c.techStrip.map(t => <span key={t}>{t}</span>)}</div></div></div>
      <section id="about" className="portfolio-section portfolio-container grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative"><div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-lg border bg-secondary"><img src={workspaceImage} alt="Developer workspace illustration; professional portrait to be added" width={1920} height={1024} loading="lazy" className="h-full w-full object-cover object-right" /></div><span className="absolute bottom-4 left-4 rounded bg-background/95 px-3 py-2 text-xs text-muted-foreground">Workspace illustration · portrait coming soon</span></div>
        <div><Eyebrow number="01" text="A little about me" /><h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{c.about.heading}</h2>{c.about.paragraphs.map((t, i) => <p key={i} className={`${i ? "mt-4" : "mt-6"} leading-relaxed text-muted-foreground`}>{t}</p>)}<div className="mt-7 flex flex-wrap gap-6 border-t pt-6"><div><p className="text-2xl font-semibold">{c.about.years}<span className="text-highlight"> years</span></p><p className="mt-1 text-xs text-muted-foreground">Development experience</p></div><div><p className="text-2xl font-semibold">End to end<span className="text-highlight">.</span></p><p className="mt-1 text-xs text-muted-foreground">From database to interface</p></div></div></div>
      </section>
      <section id="skills" className="portfolio-section border-y bg-secondary/40"><div className="portfolio-container"><Eyebrow number="02" text="My toolkit" /><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-semibold sm:text-4xl">The right tools for the job.</h2><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">A connected skill set, not just a list of technologies.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{c.skills.map(({ title, tools }, i) => { const Icon = skillIcons[i % skillIcons.length] ?? Code2; return <article key={i} className="rounded-lg border bg-card p-6"><Icon className="mb-6 size-7 text-highlight" /><h3 className="font-semibold">{title}</h3><ul className="mt-5 space-y-3">{tools.map(t => <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-3 text-primary" />{t}</li>)}</ul></article>; })}</div></div></section>
      <section className="portfolio-section portfolio-container"><Eyebrow number="03" text="How I can help" /><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Built around your next step.</h2><div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">{c.services.map(({ title, text }, i) => { const Icon = serviceIcons[i % serviceIcons.length] ?? Code2; return <article key={i} className="border-t-2 pt-6"><Icon className="mb-5 size-6 text-highlight" /><h3 className="font-semibold leading-snug">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>; })}</div></section>
      <section id="projects" className="portfolio-section border-y bg-secondary/40"><div className="portfolio-container"><Eyebrow number="04" text="Selected projects" /><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-semibold sm:text-4xl">Ideas, turned into products.</h2><a href={c.socials.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium hover:text-highlight">More on GitHub <ArrowUpRight className="size-4" /></a></div><div className="mt-10 grid gap-7 md:grid-cols-2">
        {c.projects.map((p) => <article key={p.name} className="overflow-hidden rounded-lg border bg-card"><ProjectPreview type={p.preview} name={p.name} /><div className="p-7"><div className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><h3 className="text-2xl font-semibold">{p.name}</h3>{p.badge && <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-highlight">{p.badge}</span>}</div>{p.preview === "password" ? <ShieldCheck className="size-5 text-highlight" /> : <Wrench className="size-5 text-highlight" />}</div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>{p.tags && <p className="mt-4 font-mono text-xs text-muted-foreground">{p.tags}</p>}<div className="mt-6 flex flex-wrap gap-3">{p.liveUrl && <Button asChild variant="outline"><a href={p.liveUrl} target="_blank" rel="noopener noreferrer">{p.liveLabel || "Visit"} <ArrowUpRight /></a></Button>}{p.sourceUrl && <Button asChild variant="ghost"><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer"><Github />Source code</a></Button>}</div></div></article>)}
      </div></div></section>
      <section id="process" className="portfolio-section portfolio-container"><Eyebrow number="05" text="Working together" /><h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Clear process. No surprises.</h2><div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{c.steps.map(({ title, text }, i) => <article key={title} className="border-t pt-6"><span className="font-mono text-sm text-highlight">{String(i + 1).padStart(2, "0")}</span><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></section>
      <section aria-labelledby="testimonials-title" className="border-y bg-secondary/40 py-14"><div className="portfolio-container"><p className="text-xs font-medium uppercase tracking-widest text-highlight">Client perspectives</p><h2 id="testimonials-title" className="mt-3 text-2xl font-semibold">Good work speaks for itself.</h2><div className="mt-7 grid gap-5 md:grid-cols-2">{[1, 2].map(i => <article key={i} className="rounded-lg border border-dashed bg-card p-6"><p className="text-sm text-muted-foreground">Client testimonial coming soon.</p><p className="mt-4 text-xs text-muted-foreground">Reserved for a verified quote · name, role & company</p></article>)}</div></div></section>
      <section id="contact" className="portfolio-section portfolio-container grid gap-12 lg:grid-cols-2"><div><Eyebrow number="06" text="Let’s talk" /><h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{c.contact.heading}</h2><p className="mt-6 max-w-sm leading-relaxed text-muted-foreground">{c.contact.text}</p><a href={`mailto:${c.contact.email}`} className="mt-7 inline-flex items-center gap-3 text-lg font-semibold hover:text-highlight"><Mail className="size-5 text-highlight" />{c.contact.email}</a><p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{c.hero.location} · {c.contact.availability}</p><div className="mt-7 flex gap-5">{socials.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-highlight"><Icon className="size-4" />{label}<ArrowUpRight className="size-3" /></a>)}</div></div><ContactForm /></section>
    </main>
    <footer className="border-t"><div className="portfolio-container flex flex-wrap items-center justify-between gap-5 py-7 text-xs text-muted-foreground"><p>© {new Date().getFullYear()} {c.hero.name}. Built with care.</p><div className="flex items-center gap-5">{socials.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="hover:text-highlight"><Icon className="size-4" /></a>)}<a href="#top" className="flex items-center gap-2 hover:text-highlight">Back to top <ArrowUp className="size-4" /></a></div></div></footer>
  </div>;
}

function Eyebrow({ number, text }: { number: string; text: string }) {
  return <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest"><span className="font-mono text-highlight">{number}</span><span className="h-px w-7 bg-highlight/50" /><span className="text-muted-foreground">{text}</span></p>;
}

function ProjectPreview({ type, name }: { type: "password" | "handyman"; name: string }) {
  return <div className="relative flex h-64 items-center justify-center overflow-hidden border-b bg-accent p-6 sm:h-72" role="img" aria-label={`${name} concept preview, not a product screenshot`}>
    <div className="w-full max-w-[380px] overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3"><span className="flex items-center gap-2 text-xs font-bold">{type === "password" ? <LockKeyhole className="size-4 text-highlight" /> : <Wrench className="size-4 text-highlight" />}{name}</span><span className="text-[10px] text-muted-foreground">{type === "password" ? "Team workspace" : "Local services"}</span></div>
      <div className="flex"><div className="flex w-12 shrink-0 flex-col items-center gap-5 border-r bg-secondary py-5"><Blocks className="size-4 text-highlight" /><Database className="size-4 text-muted-foreground" /><ShieldCheck className="size-4 text-muted-foreground" /></div><div className="flex-1 p-4"><p className="mb-4 text-sm font-semibold">{type === "password" ? "Shared vault" : "Find a helping hand"}</p>{(type === "password" ? ["Development", "Design tools", "Team accounts"] : ["Repairs & maintenance", "Plumbing", "Electrical work"]).map((t, i) => <div key={t} className="flex items-center justify-between border-t py-3"><span className="flex items-center gap-2 text-[11px]">{type === "password" ? <LockKeyhole className="size-3 text-primary" /> : <Wrench className="size-3 text-primary" />}{t}</span><span className="font-mono text-[10px] text-muted-foreground">{type === "password" ? "••••••••" : `0${i + 1}`}</span></div>)}</div></div>
    </div><span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">Concept preview</span>
  </div>;
}