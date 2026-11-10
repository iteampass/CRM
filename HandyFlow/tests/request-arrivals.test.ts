import { test, expect } from "bun:test";
import { arrivalDay, scheduledArrivals } from "../src/lib/request-arrivals";
import type { OpenRequest } from "../src/lib/handyflow.functions";

test("arrival dates preserve local calendar dates and reject invalid dates", () => {
  expect(arrivalDay("2026-09-22")?.getDate()).toBe(22);
  expect(arrivalDay("2026-02-30")).toBeNull();
  expect(arrivalDay(null)).toBeNull();
  expect(arrivalDay("2026-09-22T10:00:00Z")).toBeNull();
});
test("calendar includes only scheduled participant jobs and sorts times", () => {
  const request = { id: "base", assigned: true, mineAsClient: false, takenByMe: true, status: "agreed", arrivalDate: "2026-09-22", arrivalTime: "10:00" } as OpenRequest;
  const rows = [request, {...request, id: "early", arrivalTime: "08:00"},
    {...request, id: "pending", status: "pending"}, {...request, id: "closed", status: "completed"},
    {...request, id: "other", takenByMe: false}, {...request, id: "undated", arrivalDate: null},
    {...request, id: "client", takenByMe: false, mineAsClient: true, arrivalDate: "2026-09-23"}];
  expect(scheduledArrivals(rows).map(r => r.id)).toEqual(["early", "base", "client"]);
});
