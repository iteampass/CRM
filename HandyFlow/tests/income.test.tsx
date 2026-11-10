import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IncomeView } from "../src/components/handyflow/IncomeView";
import type { PaymentEntry } from "../src/lib/handyflow.functions";

test("income includes handyman earnings and excludes client spending", () => {
  const base = { category: "Repairs", date: "Sep 22, 2026", counterparty: "Client" };
  const payments: PaymentEntry[] = [
    { ...base, id: "1", title: "Shelf job", direction: "charged", amount: 20.1 },
    { ...base, id: "2", title: "Pipe job", direction: "charged", amount: 30.2 },
    { ...base, id: "3", title: "Personal expense", direction: "paid", amount: 900 },
  ];
  const html = renderToStaticMarkup(<IncomeView payments={payments} />);
  expect(html).toContain("$50.30");
  expect(html).toContain("$25.15");
  expect(html).toContain("Shelf job");
  expect(html).not.toContain("Personal expense");
});
test("empty income renders zero totals and guidance", () => {
  const html = renderToStaticMarkup(<IncomeView payments={[]} />);
  expect(html).toContain("$0.00");
  expect(html).toContain("No earnings yet");
});
