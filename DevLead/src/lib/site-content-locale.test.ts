import { describe, expect, it } from "vitest";
import { defaultContent } from "./site-content";
import { localizeSiteContent } from "./site-content-locale";

describe("portfolio localization", () => {
  it("translates built-in copy without mutating content, links, names or technologies", () => {
    const localized = localizeSiteContent(defaultContent, "sr");
    expect(localized.hero.title).toBe("Програмер за све слојеве апликације");
    expect(defaultContent.hero.title).toBe("Full Stack Developer");
    expect(localized.hero.name).toBe(defaultContent.hero.name);
    expect(localized.projects[0]?.liveUrl).toBe(defaultContent.projects[0]?.liveUrl);
    expect(localized.techStrip).toEqual(defaultContent.techStrip);
  });
  it("preserves edited copy even if the text is a UI translation key", () => {
    const custom = { ...defaultContent, hero: { ...defaultContent.hero, title: "New" } };
    expect(localizeSiteContent(custom, "sr").hero.title).toBe("New");
    expect(localizeSiteContent(defaultContent, "en")).toEqual(defaultContent);
  });
});
