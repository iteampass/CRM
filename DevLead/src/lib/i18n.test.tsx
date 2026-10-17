import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LanguageProvider,
  LanguageSwitcher,
  LANGUAGE_STORAGE_KEY,
  translate,
  useI18n,
} from "./i18n";

function Form() {
  const { t, locale } = useI18n();
  return (
    <>
      <p>{t("Save changes")}</p>
      <output>{new Intl.NumberFormat(locale).format(1234.5)}</output>
      <form data-testid="form">
        <input aria-label="User content" name="name" defaultValue="New" />
        <select name="type" aria-label="Property type">
          <option value="Apartment">{t("Apartment")}</option>
        </select>
      </form>
    </>
  );
}
function App() {
  return (
    <LanguageProvider>
      <LanguageSwitcher />
      <Form />
    </LanguageProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("language preference", () => {
  it("switches UI and number formatting without changing form state or submitted enum values", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("User content"), {
      target: { value: "My custom name" },
    });
    fireEvent.change(screen.getByLabelText("Language / Језик"), { target: { value: "sr" } });
    expect(screen.getByText("Сачувај измене")).toBeInTheDocument();
    expect(screen.getByText("1.234,5")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("sr-Cyrl");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("sr");
    const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
    expect(data.get("name")).toBe("My custom name");
    expect(data.get("type")).toBe("Apartment");
    fireEvent.change(screen.getByLabelText("Language / Језик"), { target: { value: "en" } });
    expect(screen.getByText("Save changes")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });
  it("restores Serbian on a subsequent visit", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "sr");
    render(<App />);
    expect(screen.getByText("Сачувај измене")).toBeInTheDocument();
  });
  it("falls back to English for an unknown saved locale", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "invalid");
    render(<App />);
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });
  it("works when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText("Language / Језик"), { target: { value: "sr" } });
    expect(screen.getByText("Сачувај измене")).toBeInTheDocument();
  });
  it("preserves unknown text, non-string content, and intentional spaces", () => {
    expect(translate("Customer supplied title", "sr")).toBe("Customer supplied title");
    expect(translate(123, "sr")).toBe(123);
    expect(translate(" Save ", "sr")).toBe(" Сачувај ");
    expect(translate("constructor", "sr")).toBe("constructor");
  });
});
