import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CompanyAvatar, DemoNotice, PageHeader, ScorePill, TechTags } from "@/components/crm/bits";
import { companies, contacts } from "@/lib/mock-data";
export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Companies — DevLead CRM" },
      { name: "description", content: "Company intelligence: size, funding, stack and signals." },
      { property: "og:title", content: "Companies — DevLead CRM" },
      {
        property: "og:description",
        content: "Company intelligence: size, funding, stack and signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Companies,
});
function Companies() {
  const { t: ui } = useI18n();
  const [q, setQ] = useState("");
  const list = companies
    .filter((c, i, all) => all.findIndex((x) => x.companyId === c.companyId) === i)
    .filter((c) =>
      `${c.name} ${c.domain} ${c.industry} ${c.technologies.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title={ui("Companies")} description={ui(`${list.length} companies`)} />
      <DemoNotice />
      <div className="relative mb-3 w-full sm:w-72">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ui("Search companies")}
          className="h-9 pl-8"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Link
            key={c.id}
            to="/leads/$id"
            params={{ id: c.id }}
            className="card-surface block p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-center gap-3">
              <CompanyAvatar name={c.name} />
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.domain}</p>
              </div>
              <ScorePill score={c.leadScore} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">{ui("Industry")}</p>
                <p className="font-medium">{c.industry}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{ui("Employees")}</p>
                <p className="font-medium">{c.employees}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{ui("Funding")}</p>
                <p className="font-medium truncate">{c.funding ?? "—"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <TechTags tech={c.technologies} />
              <span className="text-xs text-muted-foreground">
                {contacts.filter((p) => p.companyId === c.companyId).length}
                {ui(" contacts \u00B7 ")}
                {c.signals.length}
                {ui(" signals")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
