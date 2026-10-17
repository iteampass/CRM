import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { pageHead } from "@/lib/head";
export const Route = createFileRoute("/admin")({
  head: pageHead("Administration", "Manage sources, jobs, users and platform settings."),
  component: Admin,
});
const sources = [
  { name: "Rental portals (scraper)", status: "Not configured", jobs: "—", quota: "—" },
  { name: "Facebook Graph API", status: "Credentials needed", jobs: "—", quota: "—" },
  { name: "Reddit API", status: "Credentials needed", jobs: "—", quota: "—" },
  { name: "X API", status: "Credentials needed", jobs: "—", quota: "—" },
  { name: "RSS feeds", status: "Not configured", jobs: "—", quota: "—" },
];
function Admin() {
  const { t: ui } = useI18n();
  return (
    <AppShell>
      <PageHeader
        title={ui("Administration")}
        sub={ui("Market: Belgrade, Serbia \u00B7 EUR \u00B7 Europe/Belgrade")}
      />
      <div className="grid gap-4 px-6 sm:grid-cols-4">
        {[
          ["Users", "0"],
          ["Listings indexed", "0"],
          ["Active sources", "0"],
          ["Failed jobs (24h)", "0"],
        ].map(([k, v]) => (
          <div key={ui(k)} className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{ui(k)}</p>
            <p className="mt-1 text-3xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="px-6 py-6 pb-10">
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                {["Source", "Status", "Last job", "Quota", ""].map((h) => (
                  <th key={ui(h)} className="p-4 font-medium">
                    {ui(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={ui(s.name)} className="border-b last:border-0">
                  <td className="p-4 font-medium">{ui(s.name)}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs">
                      {ui(s.status)}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{s.jobs}</td>
                  <td className="p-4 text-muted-foreground">{s.quota}</td>
                  <td className="p-4 text-right">
                    <button className="rounded-full border px-3 py-1 text-xs">
                      {ui("Configure")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
