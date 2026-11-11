import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider, LanguageSwitcher, useI18n, translate, localeFor } from "../src/lib/i18n";
function Fixture() {
  const { t, locale } = useI18n();
  return (
    <>
      <LanguageSwitcher />
      <p>{t("Create request")}</p>
      <input defaultValue="My repair" />
      <select defaultValue="pending">
        <option value="pending">{t("Pending")}</option>
      </select>
      <output>{new Intl.NumberFormat(locale).format(1234.5)}</output>
    </>
  );
}
test("Serbian translates interface text and formats numbers while preserving submitted values", () => {
  const html = renderToStaticMarkup(
    <LanguageProvider initialLanguage="sr">
      <Fixture />
    </LanguageProvider>,
  );
  expect(html).toContain("Објави захтев");
  expect(html).toContain("На чекању");
  expect(html).toContain('value="pending"');
  expect(html).toContain('value="My repair"');
  expect(html).toContain("1.234,5");
  expect(html).toContain("Српски");
});
test("English remains the hydration-safe default", () => {
  const html = renderToStaticMarkup(
    <LanguageProvider>
      <Fixture />
    </LanguageProvider>,
  );
  expect(html).toContain("Create request");
  expect(html).toContain("1,234.5");
});
test("untranslated user content and non-string values are preserved", () => {
  expect(translate("My repair", "sr")).toBe("My repair");
  expect(translate(24, "sr")).toBe(24);
  expect(translate("constructor", "sr")).toBe("constructor");
  expect(translate(" Save ", "sr")).toBe(" Сачувај ");
  expect(localeFor("sr")).toBe("sr-Cyrl-RS");
});
