import { defaultContent, type SiteContent } from "./site-content";
import { translate, type Language } from "./i18n";

/** Only built-in copy is localized. Edited content, URLs, names and tools are preserved. */
export function localizeSiteContent(content: SiteContent, language: Language): SiteContent {
  const copy = (value: string, original: string | undefined) =>
    value === original ? translate(value, language) : value;
  return {
    ...content,
    hero: {
      ...content.hero,
      ...Object.fromEntries(
        (["availability", "title", "tagline", "subtext", "location"] as const).map((key) => [
          key,
          copy(content.hero[key], defaultContent.hero[key]),
        ]),
      ),
    },
    about: {
      ...content.about,
      heading: copy(content.about.heading, defaultContent.about.heading),
      paragraphs: content.about.paragraphs.map((p, i) =>
        copy(p, defaultContent.about.paragraphs[i]),
      ),
    },
    skills: content.skills.map((s, i) => ({
      ...s,
      title: copy(s.title, defaultContent.skills[i]?.title),
    })),
    services: content.services.map((s, i) => ({
      ...s,
      title: copy(s.title, defaultContent.services[i]?.title),
      text: copy(s.text, defaultContent.services[i]?.text),
    })),
    steps: content.steps.map((s, i) => ({
      ...s,
      title: copy(s.title, defaultContent.steps[i]?.title),
      text: copy(s.text, defaultContent.steps[i]?.text),
    })),
    projects: content.projects.map((p, i) => ({
      ...p,
      ...Object.fromEntries(
        (["badge", "description", "tags", "liveLabel"] as const).map((key) => [
          key,
          copy(p[key], defaultContent.projects[i]?.[key]),
        ]),
      ),
    })),
    contact: {
      ...content.contact,
      heading: copy(content.contact.heading, defaultContent.contact.heading),
      text: copy(content.contact.text, defaultContent.contact.text),
      availability: copy(content.contact.availability, defaultContent.contact.availability),
    },
    heroSlides: content.heroSlides.map((s) => ({
      ...s,
      alt: copy(s.alt, defaultContent.heroSlides.find((d) => d.id === s.id)?.alt),
    })),
  };
}
