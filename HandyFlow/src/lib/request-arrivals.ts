import type { OpenRequest } from "./handyflow.functions";

export function arrivalDay(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function scheduledArrivals(requests: OpenRequest[]) {
  return requests
    .filter(
      (request) =>
        request.assigned &&
        (request.mineAsClient || request.takenByMe) &&
        (request.status === "agreed" || request.status === "in_progress") &&
        arrivalDay(request.arrivalDate),
    )
    .sort((a, b) =>
      `${a.arrivalDate} ${a.arrivalTime ?? "99:99"}`.localeCompare(
        `${b.arrivalDate} ${b.arrivalTime ?? "99:99"}`,
      ),
    );
}
