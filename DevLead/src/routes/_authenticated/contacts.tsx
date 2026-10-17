import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Linkedin, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DemoNotice, PageHeader } from "@/components/crm/bits";
import { contacts, leadForCompany, type Contact } from "@/lib/mock-data";
import { EmailContactDialog } from "@/components/crm/EmailContactDialog";
export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — DevLead CRM" },
      { name: "description", content: "Decision makers at your target companies." },
      { property: "og:title", content: "Contacts — DevLead CRM" },
      { property: "og:description", content: "Decision makers at your target companies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contacts,
});
const STATUSES = [
  "Not contacted",
  "Contacted",
  "Replied",
  "Qualified",
  "Not interested",
  "Do not contact",
];
function Contacts() {
  const { t: ui } = useI18n();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [to, setTo] = useState<Contact | null>(null);
  const [, rerender] = useState(0);
  const list = contacts.filter(
    (p) =>
      (st === "all" || p.status === st) &&
      `${p.firstName} ${p.lastName} ${p.title} ${leadForCompany(p.companyId)?.name ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-[1300px]">
      <EmailContactDialog
        contact={to}
        onClose={() => setTo(null)}
        onSent={() => rerender((n) => n + 1)}
      />
      <PageHeader title={ui("Contacts")} description={ui(`${list.length} people`)} />
      <DemoNotice />
      <div className="card-surface">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ui("Search name, title, company")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={st} onValueChange={setSt}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ui("All statuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ui(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  "Name",
                  "Title",
                  "Department",
                  "Company",
                  "Email",
                  "Last contacted",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {ui(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((p) => {
                const c = leadForCompany(p.companyId);
                if (!c) return null;
                return (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-3 whitespace-nowrap">{p.title}</td>
                    <td className="px-3">{p.department}</td>
                    <td className="px-3">
                      <Link to="/leads/$id" params={{ id: c.id }} className="text-primary">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {p.email && (
                          <button
                            type="button"
                            onClick={() => setTo(p)}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {p.email}
                          </button>
                        )}
                        {p.linkedin && (
                          <a href={p.linkedin} target="_blank" rel="noreferrer">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 text-muted-foreground">{p.lastContacted ?? "—"}</td>
                    <td className="px-3">
                      <span className="rounded-md border px-2 py-0.5 text-xs whitespace-nowrap">
                        {ui(p.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
