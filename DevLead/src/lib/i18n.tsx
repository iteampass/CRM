import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import serbian from "./locales/sr.json";

export type Language = "en" | "sr";
export const LANGUAGE_STORAGE_KEY = "crm-language";
const catalog: Record<string, string> = serbian;
export const localeFor = (language: Language) => (language === "sr" ? "sr-Cyrl-RS" : "en-GB");

/** Translate interface copy only; callers must keep user content and stored values untouched. */
export function translate<T>(value: T, language: Language): T {
  if (language !== "sr" || typeof value !== "string") return value;
  const key = value.trim();
  const translated = Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
  return (translated === undefined ? value : value.replace(key, () => translated)) as T;
}

const defaultContext = {
  language: "en" as Language,
  locale: localeFor("en"),
  setLanguage: (_language: Language) => {},
  t: <T,>(value: T): T => value,
};
const LanguageContext = createContext(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The first render matches SSR. Read browser preferences only after hydration.
  const [language, setCurrentLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      setCurrentLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) === "sr" ? "sr" : "en");
    } catch {
      /* Storage may be disabled. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === null)
        setCurrentLanguage(event.newValue === "sr" ? "sr" : "en");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "sr" ? "sr-Cyrl" : "en";
  }, [language]);
  const context = useMemo(
    () => ({
      language,
      locale: localeFor(language),
      setLanguage(next: Language) {
        setCurrentLanguage(next);
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
          /* Selection still works for this visit. */
        }
      },
      t: <T,>(value: T): T => translate(value, language),
    }),
    [language],
  );
  return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  return (
    <label className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-md md:bottom-4">
      <span aria-hidden="true">◎</span>
      <span className="sr-only">Language / Језик</span>
      <select
        aria-label="Language / Језик"
        value={language}
        onChange={(event) => setLanguage(event.target.value === "sr" ? "sr" : "en")}
        className="cursor-pointer bg-background text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <option value="en">English</option>
        <option value="sr">Српски</option>
      </select>
    </label>
  );
}
