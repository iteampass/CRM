import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCheck,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  SquareCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { companies } from "@/lib/mock-data";
import {
  createFollowUpTask,
  deleteSignal,
  label,
  updateSignal,
  type SignalRow,
  type SignalStatus,
} from "@/lib/signals";
import { fmtDate, SignalStatusBadge, SignalTypeBadge, StrengthDots } from "./SignalBits";
export function SignalsTableSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
export function SignalsTable({
  rows,
  onChanged,
  onEdit,
  showCompany = true,
}: {
  rows: SignalRow[];
  onChanged: () => void;
  onEdit: (s: SignalRow) => void;
  showCompany?: boolean;
}) {
  const { t: ui, locale: uiLocale } = useI18n();
  const [open, setOpen] = useState<SignalRow | null>(null);
  const [del, setDel] = useState<SignalRow | null>(null);
  const run = (p: Promise<unknown>, msg: string) =>
    p
      .then(() => {
        toast.success(msg);
        onChanged();
      })
      .catch((e) => toast.error(e.message || "Something went wrong"));
  const setStatus = (s: SignalRow, status: SignalStatus) => {
    run(updateSignal(s.id, { status }), `Marked as ${status}`);
    if (open?.id === s.id) setOpen({ ...s, status });
  };
  const leadName = (s: SignalRow) => companies.find((l) => l.id === s.lead_id);
  const companyLead = (s: SignalRow) => companies.find((l) => l.companyId === s.company_id);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              {showCompany && <th className="px-3 py-2 font-medium">{ui("Company")}</th>}
              <th className="px-3 py-2 font-medium">{ui("Type")}</th>
              <th className="px-3 py-2 font-medium">{ui("Title")}</th>
              <th className="px-3 py-2 font-medium">{ui("Strength")}</th>
              <th className="px-3 py-2 font-medium">{ui("Detected")}</th>
              <th className="px-3 py-2 font-medium">{ui("Status")}</th>
              <th className="px-3 py-2 font-medium">{ui("Lead")}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((s) => {
              const l = leadName(s);
              return (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setOpen(s)}
                >
                  {showCompany && (
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {s.company?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-3">
                    <SignalTypeBadge type={s.type} />
                  </td>
                  <td className="max-w-[320px] truncate px-3">{s.title}</td>
                  <td className="px-3">
                    <StrengthDots strength={s.strength} />
                  </td>
                  <td className="px-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {fmtDate(s.detected_at, uiLocale)}
                  </td>
                  <td className="px-3">
                    <SignalStatusBadge status={s.status} />
                  </td>
                  <td className="px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {l ? (
                      <Link
                        to="/leads/$id"
                        params={{ id: l.id }}
                        className="text-primary hover:underline"
                      >
                        {ui(l.stage)} · {l.leadScore}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={ui("Signal actions")}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStatus(s, "reviewed")}>
                          <Eye className="h-4 w-4" />
                          {ui("Mark as reviewed")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(s, "actioned")}>
                          <CheckCheck className="h-4 w-4" />
                          {ui("Mark as actioned")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(s, "dismissed")}>
                          <XCircle className="h-4 w-4" />
                          {ui("Dismiss")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(s)}>
                          <Pencil className="h-4 w-4" />
                          {ui("Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDel(s)}>
                          <Trash2 className="h-4 w-4" />
                          {ui("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-6">{open.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex flex-wrap gap-2 px-4">
                <SignalTypeBadge type={open.type} />
                <SignalStatusBadge status={open.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 px-4 text-sm">
                {[
                  ["Company", open.company?.name ?? "—"],
                  ["Strength", label(open.strength)],
                  ["Detected", fmtDate(open.detected_at, uiLocale)],
                  ["Source", label(open.source)],
                  ["Added", fmtDate(open.created_at, uiLocale)],
                  [
                    "Linked lead",
                    leadName(open)
                      ? `${leadName(open)!.stage} · score ${leadName(open)!.leadScore}`
                      : "None",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{ui(k)}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 px-4">
                <p className="text-xs text-muted-foreground">{ui("Description")}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {open.description || "No description."}
                </p>
              </div>
              {open.source_url && (
                <a
                  href={open.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 px-4 text-sm text-primary"
                >
                  {ui("Open source")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="mt-6 flex flex-wrap gap-2 px-4 pb-6">
                {companyLead(open) && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/leads/$id"
                      params={{ id: (leadName(open) ?? companyLead(open))!.id }}
                    >
                      {ui("Open company")}
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => run(createFollowUpTask(open), "Follow-up task created")}
                >
                  <SquareCheck className="h-4 w-4" />
                  {ui("Create task / follow up")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(open, "reviewed")}>
                  {ui("Reviewed")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(open, "actioned")}>
                  {ui("Actioned")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(open, "dismissed")}>
                  {ui("Dismiss")}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui("Delete this signal?")}</AlertDialogTitle>
            <AlertDialogDescription>
              "{del?.title}
              {ui('" will be permanently removed.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (del) {
                  run(deleteSignal(del.id), "Signal deleted");
                  if (open?.id === del.id) setOpen(null);
                }
                setDel(null);
              }}
            >
              {ui("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
