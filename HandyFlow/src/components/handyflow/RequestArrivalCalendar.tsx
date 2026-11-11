import { useI18n } from "@/lib/i18n";
import { sr, enGB } from "date-fns/locale";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { arrivalDay, scheduledArrivals } from "@/lib/request-arrivals";
import type { OpenRequest } from "@/lib/handyflow.functions";

export function RequestArrivalCalendar({
  requests,
  onOpen,
}: {
  requests: OpenRequest[];
  onOpen: (request: OpenRequest) => void;
}) {
  const { t: tr, locale } = useI18n();
  const arrivals = scheduledArrivals(requests);
  const [selected, setSelected] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      arrivals.map((request) => arrivalDay(request.arrivalDate)!).find((day) => day >= today) ??
      today
    );
  });
  const [month, setMonth] = useState(selected);
  const dayRequests = arrivals.filter(
    (request) => arrivalDay(request.arrivalDate)?.getTime() === selected.getTime(),
  );
  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div>
        <Calendar
          locale={locale === "sr-Cyrl-RS" ? sr : enGB}
          mode="single"
          required
          selected={selected}
          onSelect={setSelected}
          month={month}
          onMonthChange={setMonth}
          weekStartsOn={1}
          modifiers={{ arrival: arrivals.map((request) => arrivalDay(request.arrivalDate)!) }}
          modifiersClassNames={{
            arrival:
              "relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-brand",
          }}
          className="rounded-xl border border-border"
        />
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />{tr("Scheduled handyman arrival")}</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-brand"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setSelected(today);
            setMonth(today);
          }}
        >{tr("Today")}</button>
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold">
          {selected.toLocaleDateString(locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {dayRequests.length}{" "}{tr("scheduled")}{" "}{dayRequests.length === 1 ? tr("arrival") : tr("arrivals")}
        </p>
        {dayRequests.length ? (
          <div className="mt-4 space-y-3">
            {dayRequests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => onOpen(request)}
                className="block w-full rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="text-sm font-semibold text-brand">
                  {request.arrivalTime?.slice(0, 5) || "Time to be confirmed"}
                </span>
                <span className="mt-1 block font-medium">{request.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {request.location || "Location not provided"}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {request.status === "in_progress" ? tr("In progress") : tr("Agreed")}{" "}{tr("· View request →")}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            {arrivals.length
              ? tr("No arrivals scheduled for this date. Select a marked date to view its requests.")
              : tr("No handyman arrivals scheduled yet. Agreed requests with an arrival date will appear here.")}
          </p>
        )}
      </div>
    </div>
  );
}
