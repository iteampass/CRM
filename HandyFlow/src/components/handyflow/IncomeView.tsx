import { useI18n } from "@/lib/i18n";
import type { PaymentEntry } from "@/lib/handyflow.functions";

export function IncomeView({ payments }: { payments: PaymentEntry[] }) {
  const { t: tr, locale } = useI18n();
  const earnings = payments.filter(payment => payment.direction === "charged");
  const total = earnings.reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0) / 100;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{tr("Finance")}</p>
          <h1>{tr("Income")}</h1>
          <p className="subheading">{tr("Your earnings from completed jobs, based on their agreed prices.")}</p>
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Total earnings", money(total)],
          ["Completed jobs", String(earnings.length)],
          ["Average per job", money(earnings.length ? total / earnings.length : 0)],
        ].map(([label, value]) => (
          <section key={label} className="panel p-5">
            <p className="text-sm text-muted-foreground">{tr(label)}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </section>
        ))}
      </div>
      <section className="panel payments-column">
        <div className="panel-heading">
          <div>
            <h2>{tr("Earnings by request")}</h2>
            <p>{tr("Agreed amounts for your completed work. Payment receipt is not tracked.")}</p>
          </div>
          <strong className="payments-total">{money(total)}</strong>
        </div>
        {earnings.length ? (
          <div className="payments-list">
            {earnings.map(item => (
              <article className="payments-row" key={item.id}>
                <div><strong>{item.title}</strong><span>{item.counterparty} · {item.category}</span></div>
                <div className="payments-meta"><span>{item.date}</span><strong>{money(item.amount)}</strong></div>
              </article>
            ))}
          </div>
        ) : <p className="map-empty">{tr("No earnings yet. Complete a job with an agreed price to see it here.")}</p>}
      </section>
    </div>
  );
}
