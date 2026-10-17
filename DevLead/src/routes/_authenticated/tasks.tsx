import { useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, workspace, leadForCompany } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — DevLead CRM" },
      {
        name: "description",
        content: "Manage follow-ups with priorities, due dates and links to companies and deals.",
      },
      { property: "og:title", content: "Tasks — DevLead CRM" },
      {
        property: "og:description",
        content: "Manage follow-ups with priorities, due dates and links to companies and deals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});
interface Row {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  done: boolean;
  company_id: string | null;
  companies?: {
    name: string;
  } | null;
}
function TasksPage() {
  const { t: ui } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [confirmDone, setConfirmDone] = useState<Row | null>(null);
  const load = async () => {
    const { data, error } = await db()
      .from("tasks")
      .select("*, companies(name)")
      .eq("workspace_id", workspace.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows(data);
  };
  useEffect(() => {
    load();
  }, []);
  const toggle = async (r: Row) => {
    const { error } = await db().from("tasks").update({ done: !r.done }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => p?.map((x) => (x.id === r.id ? { ...x, done: !r.done } : x)) ?? null);
    toast.success(r.done ? "Task reopened" : "Task completed");
  };
  const remove = async (r: Row) => {
    if (!confirm(`Delete task "${r.title}"?`)) return;
    const { error } = await db().from("tasks").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => p?.filter((x) => x.id !== r.id) ?? null);
    toast.success(ui("Task deleted"));
  };
  const today = new Date().toISOString().slice(0, 10);
  const list = (rows ?? []).filter((r) => showDone || !r.done);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{ui("Tasks")}</h1>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showDone} onCheckedChange={(v) => setShowDone(!!v)} />
          {ui("Show completed")}
        </label>
      </div>
      <div className="rounded-xl border bg-card">
        {error ? (
          <p className="p-6 text-sm text-destructive">
            {ui("Couldn't load tasks: ")}
            {error}
          </p>
        ) : !rows ? (
          <p className="p-6 text-sm text-muted-foreground">{ui("Loading tasks\u2026")}</p>
        ) : !list.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {ui("No open tasks. Create one from a lead or signal.")}
          </p>
        ) : (
          <ul className="divide-y">
            {list.map((r) => {
              const lead = leadForCompany(r.company_id);
              const overdue = !r.done && r.due_date && r.due_date < today;
              return (
                <li key={r.id} className="flex items-center gap-3 p-4">
                  <Checkbox
                    checked={r.done}
                    onCheckedChange={() => (r.done ? toggle(r) : setConfirmDone(r))}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${r.done ? "line-through text-muted-foreground" : ""}`}
                    >
                      {r.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead ? (
                        <Link to="/leads/$id" params={{ id: lead.id }} className="hover:underline">
                          {r.companies?.name}
                        </Link>
                      ) : (
                        (r.companies?.name ?? "No company")
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {ui(r.priority)}
                  </span>
                  <span
                    className={`w-28 text-right font-mono text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {r.due_date ?? "No due date"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => remove(r)}>
                    {ui("Delete")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AlertDialog open={!!confirmDone} onOpenChange={(o) => !o && setConfirmDone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui("Mark this task as completed?")}</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDone?.title}"
              {confirmDone?.companies?.name ? <> — {confirmDone.companies.name}</> : null}
              {ui("will be ticked off and hidden from your open tasks.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDone) toggle(confirmDone);
                setConfirmDone(null);
              }}
            >
              {ui("Mark completed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
