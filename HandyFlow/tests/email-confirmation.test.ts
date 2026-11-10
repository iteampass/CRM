import { expect, test } from "bun:test";
import { clearConfirmationSession, isSignupConfirmation } from "../src/lib/email-confirmation";

test("recognizes signup callbacks without affecting OAuth or recovery", () => {
  expect(isSignupConfirmation("https://app.test/auth#access_token=test&type=signup")).toBe(true);
  expect(isSignupConfirmation("https://app.test/auth?confirmation=signup&code=test")).toBe(true);
  expect(isSignupConfirmation("https://app.test/auth#type=recovery")).toBe(false);
  expect(isSignupConfirmation("https://app.test/auth?code=test")).toBe(false);
});

test("waits for callback initialization before clearing the local session", async () => {
  const calls: string[] = [];
  await clearConfirmationSession({
    getSession: async () => { await Promise.resolve(); calls.push("initialized"); return { error: null }; },
    signOut: async ({ scope }) => { calls.push(scope); return { error: null }; },
  });
  expect(calls).toEqual(["initialized", "local"]);
});

test("reports signout failures", async () => {
  await expect(clearConfirmationSession({
    getSession: async () => ({ error: null }),
    signOut: async () => ({ error: new Error("Signout failed") }),
  })).rejects.toThrow("Signout failed");
});
