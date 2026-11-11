import { LandingFooter, LandingHeader } from "@/components/landing/LandingChrome";
import { useI18n } from "@/lib/i18n";
import { legalPages } from "@/lib/legal-content";

export function LegalPage({ page }: { page: keyof typeof legalPages }) {
  const { t } = useI18n();
  const content = legalPages[page];
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        <nav aria-label={t("Legal")} className="mb-10 flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {Object.entries(legalPages).map(([slug, document]) => (
            <a key={slug} href={`/${slug}`} aria-current={slug === page ? "page" : undefined}
              className="text-brand underline underline-offset-4 aria-[current=page]:font-semibold">
              {t(document.title)}
            </a>
          ))}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t(content.title)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("Last updated: 11 November 2026")}</p>
        <div className="mt-10 space-y-9">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{t(section.title)}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{t(section.body)}</p>
            </section>
          ))}
        </div>
        <a className="mt-10 inline-block text-brand underline underline-offset-4" href="mailto:admin@handyflow.me">admin@handyflow.me</a>
      </main>
      <LandingFooter />
    </>
  );
}
