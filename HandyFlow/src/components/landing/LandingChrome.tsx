import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { Hammer, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Services", href: "/#services" },
  { label: "For Handymen", href: "/#for-handymen" },
];

export function LandingHeader() {
  const { t: tr, locale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Hammer className="size-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">{tr("Handy")}<span className="text-brand">{tr("Flow")}</span>
          </span>
        </Link>

        <div role="navigation" className="hidden shrink-0 flex-nowrap items-center gap-7 whitespace-nowrap md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {tr(l.label)}
            </a>
          ))}
          <Link
            to="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >{tr("Pricing")}</Link>
        </div>

        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap md:flex">
          <Link
            to="/auth"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >{tr("Log In")}</Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-card transition-all hover:brightness-110 hover:shadow-card-hover"
          >{tr("Get Started")}</Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
        <LanguageSwitcher mobile />
        <button
          type="button"
          aria-label={open ? tr("Close menu") : tr("Open menu")}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <div role="navigation" className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {tr(l.label)}
              </a>
            ))}
            <Link
              to="/pricing"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >{tr("Pricing")}</Link>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/auth"
                className="rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-foreground"
              >{tr("Log In")}</Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-brand-foreground"
              >{tr("Get Started")}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function LandingFooter() {
  const { t: tr, locale } = useI18n();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                <Hammer className="size-4.5" />
              </span>
              <span className="text-base font-semibold tracking-tight text-foreground">{tr("Handy")}<span className="text-brand">{tr("Flow")}</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{tr("The simple way to get home repairs, maintenance and small renovations done by trusted local professionals.")}</p>
          </div>

          <FooterCol
            title={tr("Product")}
            items={[
              ["How It Works", "/#how-it-works"],
              ["Services", "/#services"],
              ["For Handymen", "/#for-handymen"],
              ["Pricing", "/pricing"],
            ]}
          />
          <FooterCol
            title={tr("Company")}
            items={[
              ["About", "/#for-clients"],
              ["Testimonials", "/#testimonials"],
              ["Contact", "mailto:admin@handyflow.me"],
            ]}
          />
          <FooterCol
            title={tr("Legal")}
            items={[
              ["Terms of Service", "/#"],
              ["Privacy Policy", "/#"],
              ["Cookie Policy", "/#"],
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()}{tr("HandyFlow. All rights reserved.")}</p>
          <p>
            <a className="hover:text-foreground" href="mailto:admin@handyflow.me">{tr("admin@handyflow.me")}</a>
            <span className="px-2">·</span>
            <span>{tr("LinkedIn · Instagram · X")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
