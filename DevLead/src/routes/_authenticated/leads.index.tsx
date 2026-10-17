import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpDown, Download, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CompanyAvatar,
  DemoNotice,
  EmptyState,
  IntentBadge,
  PageHeader,
  ScorePill,
  TechTags,
} from "@/components/crm/bits";
import { archiveCompanies, companies as seed, contactFor, intentFor } from "@/lib/mock-data";
const hasHot = (c: {
  signals: {
    status: string;
    level: string;
  }[];
}) => c.signals.some((s) => s.status === "new" && s.level === "high");
export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — DevLead CRM" },
      { name: "description", content: "Search, filter and qualify software-development leads." },
      { property: "og:title", content: "Leads — DevLead CRM" },
      {
        property: "og:description",
        content: "Search, filter and qualify software-development leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});
type SortKey = "leadScore" | "detected" | "lastActivity" | "employees";
const PAGE = 10;
const uniq = (a: string[]) => [...new Set(a)].sort();
// simple fuzzy: every query char appears in order
const fuzzy = (hay: string, q: string) => {
  let i = 0;
  for (const ch of hay) if (ch === q[i]) i++;
  return i === q.length;
};
function LeadsPage() {
  const { t: ui } = useI18n();
  const [rows, setRows] = useState(seed);
  const [q, setQ] = useState("");
  const [f, setF] = useState({
    intent: "all",
    industry: "all",
    tech: "all",
    size: "all",
    source: "all",
    status: "all",
    owner: "all",
    signal: "all",
    minScore: "0",
    hot: "all",
  });
  const [sort, setSort] = useState<{
    key: SortKey;
    dir: 1 | -1;
  }>({ key: "leadScore", dir: -1 });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((c) => {
        if (t) {
          const hay = [
            c.name,
            c.domain,
            c.industry,
            c.location,
            ...c.technologies,
            ...c.signals.map((s) => s.description),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(t) && !fuzzy(c.name.toLowerCase(), t)) return false;
        }
        if (f.intent !== "all" && intentFor(c.leadScore) !== f.intent) return false;
        if (f.industry !== "all" && c.industry !== f.industry) return false;
        if (f.tech !== "all" && !c.technologies.includes(f.tech)) return false;
        if (f.source !== "all" && c.source !== f.source) return false;
        if (f.status !== "all" && c.stage !== f.status) return false;
        if (f.owner !== "all" && c.owner !== f.owner) return false;
        if (f.hot === "yes" && !hasHot(c)) return false;
        if (f.signal !== "all" && !c.signals.some((s) => s.type === f.signal)) return false;
        if (f.size !== "all") {
          const [a = 0, b = 1e9] = f.size.split("-").map(Number);
          if (c.employees < a || c.employees > b) return false;
        }
        return c.leadScore >= Number(f.minScore);
      })
      .sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1) * sort.dir);
  }, [rows, q, f, sort]);
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF({ ...f, [k]: v });
    setPage(0);
  };
  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id));
  const FilterSel = ({ k, label, opts }: { k: keyof typeof f; label: string; opts: string[] }) => {
    const { t: ui } = useI18n();
    return (
      <Select value={f[k]} onValueChange={setFilter(k)}>
        <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
          <SelectValue placeholder={ui(label)} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {ui("All ")}
            {label.toLowerCase()}
          </SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {ui(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
  const Th = ({ k, children }: { k?: SortKey; children: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
      {k ? (
        <button
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => toggleSort(k)}
        >
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ) : (
        children
      )}
    </th>
  );
  const bulk = (label: string) => {
    toast.success(`${label} applied to ${sel.size} lead${sel.size > 1 ? "s" : ""}`);
    setSel(new Set());
  };
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title={ui("Leads")}
        description={ui(`${filtered.length} leads match your filters`)}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(ui("Export started (demo)"))}
            >
              <Download className="h-4 w-4" />
              {ui("Export")}
            </Button>
            <Button size="sm" onClick={() => toast.info(ui("Lead form arrives with the database"))}>
              <Plus className="h-4 w-4" />
              {ui("New lead")}
            </Button>
          </>
        }
      />
      <DemoNotice />
      <div className="card-surface">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={ui("Search name, domain, tech, signal")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <FilterSel
            k="intent"
            label={ui("Intent")}
            opts={["Very High", "High", "Medium", "Low"]}
          />
          <FilterSel k="industry" label={ui("Industry")} opts={uniq(seed.map((c) => c.industry))} />
          <FilterSel
            k="tech"
            label={ui("Technology")}
            opts={uniq(seed.flatMap((c) => c.technologies))}
          />
          <FilterSel k="size" label={ui("Size")} opts={["1-50", "51-200", "201-1000"]} />
          <FilterSel
            k="signal"
            label={ui("Signal")}
            opts={uniq(seed.flatMap((c) => c.signals.map((s) => s.type)))}
          />
          <FilterSel k="source" label={ui("Source")} opts={uniq(seed.map((c) => c.source))} />
          <FilterSel k="status" label={ui("Stage")} opts={uniq(seed.map((c) => c.stage))} />
          <FilterSel k="owner" label={ui("Owner")} opts={uniq(seed.map((c) => c.owner))} />
          <Select
            value={f.hot}
            onValueChange={(v) => {
              setF({ ...f, hot: v });
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-auto text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ui("Any signals")}</SelectItem>
              <SelectItem value="yes">{ui("Has new signals")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={f.minScore} onValueChange={setFilter("minScore")}>
            <SelectTrigger className="h-8 w-auto text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["0", "40", "70", "85"].map((v) => (
                <SelectItem key={v} value={v}>
                  {ui("Score \u2265 ")}
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-accent px-3 py-2 text-sm">
            <span className="font-semibold text-accent-foreground">
              {sel.size}
              {ui(" selected")}
            </span>
            {["Assign", "Change status", "Add tag", "Create task", "Export"].map((a) => (
              <Button key={a} size="sm" variant="outline" className="h-7" onClick={() => bulk(a)}>
                {a}
              </Button>
            ))}
            <Button
              size="sm"
              variant="destructive"
              className="h-7"
              onClick={() => setConfirm(true)}
            >
              {ui("Archive")}
            </Button>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={ui("No leads match")}
              text={ui("Try loosening your filters or search.")}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setF({
                      intent: "all",
                      industry: "all",
                      tech: "all",
                      size: "all",
                      source: "all",
                      status: "all",
                      owner: "all",
                      signal: "all",
                      minScore: "0",
                      hot: "all",
                    });
                  }}
                >
                  {ui("Clear filters")}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="w-10 px-3">
                    <Checkbox
                      checked={allOnPage}
                      onCheckedChange={() => {
                        const n = new Set(sel);
                        pageRows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
                        setSel(n);
                      }}
                    />
                  </th>
                  <Th>{ui("Company")}</Th>
                  <Th k="leadScore">{ui("Score")}</Th>
                  <Th>{ui("Intent")}</Th>
                  <Th>{ui("Lead type")}</Th>
                  <Th>{ui("Primary signal")}</Th>
                  <Th>{ui("Technology")}</Th>
                  <Th k="employees">{ui("Size")}</Th>
                  <Th>{ui("Location")}</Th>
                  <Th>{ui("Contact")}</Th>
                  <Th k="lastActivity">{ui("Last activity")}</Th>
                  <Th>{ui("Stage")}</Th>
                  <Th>{ui("Owner")}</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((c) => {
                  const p = contactFor(c.id)[0];
                  return (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-3">
                        <Checkbox
                          checked={sel.has(c.id)}
                          onCheckedChange={() => {
                            const n = new Set(sel);
                            if (n.has(c.id)) n.delete(c.id);
                            else n.add(c.id);
                            setSel(n);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          to="/leads/$id"
                          params={{ id: c.id }}
                          className="flex items-center gap-2"
                        >
                          <CompanyAvatar name={c.name} className="h-7 w-7 text-xs" />
                          <div>
                            <p className="flex items-center gap-1.5 font-semibold hover:text-primary">
                              {c.name}
                              {hasHot(c) && (
                                <span
                                  title={ui("New high-strength signal")}
                                  className="rounded bg-highlight px-1.5 py-px text-[10px] font-bold uppercase text-highlight-foreground"
                                >
                                  {ui("New signal")}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{c.domain}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3">
                        <ScorePill score={c.leadScore} />
                      </td>
                      <td className="px-3">
                        <IntentBadge score={c.leadScore} />
                      </td>
                      <td className="px-3 whitespace-nowrap">{c.leadType}</td>
                      <td className="max-w-[220px] truncate px-3">{c.signals[0]?.description}</td>
                      <td className="px-3">
                        <TechTags tech={c.technologies} max={2} />
                      </td>
                      <td className="px-3">{c.employees}</td>
                      <td className="px-3 whitespace-nowrap">{c.location}</td>
                      <td className="px-3 whitespace-nowrap">
                        {p ? (
                          <>
                            <p>
                              {p.firstName} {p.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.title}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 whitespace-nowrap text-muted-foreground">
                        {c.lastActivity}
                      </td>
                      <td className="px-3">
                        <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
                          {ui(c.stage)}
                        </span>
                      </td>
                      <td className="px-3 whitespace-nowrap">{c.owner}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>
            {ui("Page ")}
            {page + 1}
            {ui(" of ")}
            {pages}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              {ui("Previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
            >
              {ui("Next")}
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ui("Archive ")}
              {sel.size}
              {ui(" leads?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ui("Archived leads are hidden from lists and pipeline.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = [...sel];
                archiveCompanies(ids)
                  .then(() => {
                    setRows(rows.filter((r) => !ids.includes(r.id)));
                    toast.success(`Archived ${ids.length} leads`);
                    setSel(new Set());
                  })
                  .catch((e) => toast.error(e.message));
              }}
            >
              {ui("Archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
