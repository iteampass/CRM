import { expect, test } from "bun:test";
import { sameCountry, scopeHandymanCountry } from "../src/lib/workspace-country";

const requests = [
  { id: "local-open", country: "RS", status: "pending" },
  { id: "foreign-active", country: "HR", status: "in_progress" },
  { id: "local-completed", country: " rs ", status: "completed" },
  { id: "unknown", country: null, status: "pending" },
];

test("handyman source data excludes foreign and unknown countries for every status", () => {
  expect(scopeHandymanCountry(requests, "handyman", "RS", r => r.country).map(r => r.id))
    .toEqual(["local-open", "local-completed"]);
});
test("missing handyman country never falls back to global results", () => {
  for (const country of [null, undefined, "", " "]) {
    expect(scopeHandymanCountry(requests, "handyman", country, r => r.country)).toEqual([]);
    expect(sameCountry(country, country)).toBe(false);
  }
});
test("admin and client task scoping remains unchanged", () => {
  for (const role of ["admin", "client"] as const) {
    expect(scopeHandymanCountry(requests, role, "RS", r => r.country)).toEqual(requests);
  }
});
test("directory country matching normalizes case and whitespace", () => {
  expect(sameCountry(" rs ", "RS")).toBe(true);
  expect(sameCountry("RS", "HR")).toBe(false);
  expect(sameCountry("RS", null)).toBe(false);
});
