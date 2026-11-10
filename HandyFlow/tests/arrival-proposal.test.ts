import { expect, test } from "bun:test";
import { arrivalProposalMode } from "../src/lib/arrival-proposal";

test("preferred dates do not enable postponement before a schedule is accepted", () => {
  expect(arrivalProposalMode("pending", null, "10:00")).toBe("initial");
  expect(arrivalProposalMode("negotiating", null, null)).toBe("initial");
  expect(arrivalProposalMode("agreed", null, null)).toBe("initial");
});
test("postponement requires both an accepted exact schedule and job agreement", () => {
  expect(arrivalProposalMode("negotiating", "2026-10-01", "10:00")).toBe("waiting");
  expect(arrivalProposalMode("agreed", "2026-10-01", null)).toBe("initial");
  expect(arrivalProposalMode("agreed", "2026-10-01", "10:00")).toBe("postpone");
  expect(arrivalProposalMode("in_progress", "2026-10-01", "10:00")).toBe("postpone");
});
test("closed requests cannot be scheduled or postponed", () => {
  expect(arrivalProposalMode("completed", null, null)).toBe("closed");
  expect(arrivalProposalMode("cancelled", "2026-10-01", "10:00")).toBe("closed");
});
