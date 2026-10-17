import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companies } from "@/lib/mock-data";
import {
  createSignal,
  label,
  SIGNAL_STRENGTHS,
  SIGNAL_TYPES,
  updateSignal,
  type SignalInput,
  type SignalRow,
} from "@/lib/signals";
const today = () => new Date().toISOString().slice(0, 10);
const blank = (companyId = ""): SignalInput => ({
  company_id: companyId,
  lead_id: null,
  type: "hiring",
  title: "",
  description: "",
  source_url: "",
  strength: "medium",
  detected_at: today(),
});
export function SignalFormDialog({
  open,
  onOpenChange,
  editing,
  companyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: SignalRow | null;
  companyId?: string;
  onSaved: () => void;
}) {
  const { t: ui } = useI18n();
  const [v, setV] = useState<SignalInput>(blank(companyId));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setV(
      editing
        ? {
            company_id: editing.company_id,
            lead_id: editing.lead_id,
            type: editing.type,
            title: editing.title,
            description: editing.description ?? "",
            source_url: editing.source_url ?? "",
            strength: editing.strength,
            detected_at: editing.detected_at.slice(0, 10),
          }
        : blank(companyId),
    );
  }, [open, editing, companyId]);
  const companyOpts = useMemo(() => {
    const m = new Map<string, string>();
    companies.forEach((c) => m.set(c.companyId, c.name));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, []);
  const leadOpts = companies.filter((l) => l.companyId === v.company_id);
  const set = <K extends keyof SignalInput>(k: K, val: SignalInput[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const submit = async () => {
    const e: Partial<Record<"company_id" | "title" | "source_url" | "description", string>> = {};
    if (!v.company_id) e.company_id = "Choose a company";
    if (!v.title.trim()) e.title = "Add a short title";
    else if (v.title.length > 120) e.title = "Keep it under 120 characters";
    if (v.source_url && !/^https?:\/\/\S+$/i.test(v.source_url))
      e.source_url = "Enter a full link starting with http(s)://";
    if ((v.description ?? "").length > 2000) e.description = "Keep it under 2000 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      ...v,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      source_url: v.source_url?.trim() || null,
      detected_at: new Date(v.detected_at).toISOString(),
    };
    setBusy(true);
    try {
      if (editing) await updateSignal(editing.id, payload);
      else await createSignal(payload);
      toast.success(editing ? "Signal updated" : "Signal added");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not save signal");
    } finally {
      setBusy(false);
    }
  };
  const Err = ({ k }: { k: string }) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? ui("Edit signal") : ui("Add signal")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{ui("Company *")}</Label>
            <Select
              value={v.company_id}
              onValueChange={(x) => setV((p) => ({ ...p, company_id: x, lead_id: null }))}
              disabled={!!companyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={ui("Select company")} />
              </SelectTrigger>
              <SelectContent>
                {companyOpts.map(([id, n]) => (
                  <SelectItem key={id} value={id}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Err k="company_id" />
          </div>
          {v.company_id && leadOpts.length > 0 && (
            <div className="grid gap-1.5">
              <Label>{ui("Linked lead (optional)")}</Label>
              <Select
                value={v.lead_id ?? "none"}
                onValueChange={(x) => set("lead_id", x === "none" ? null : x)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{ui("No lead")}</SelectItem>
                  {leadOpts.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {ui(l.stage)}
                      {ui(" \u00B7 score ")}
                      {l.leadScore}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{ui("Type")}</Label>
              <Select value={v.type} onValueChange={(x) => set("type", x as SignalInput["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ui(label(t))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{ui("Strength")}</Label>
              <Select
                value={v.strength}
                onValueChange={(x) => set("strength", x as SignalInput["strength"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_STRENGTHS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ui(label(t))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{ui("Title *")}</Label>
            <Input
              value={v.title}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder={ui("e.g. Raised $5M seed round")}
            />
            <Err k="title" />
          </div>
          <div className="grid gap-1.5">
            <Label>{ui("Description")}</Label>
            <Textarea
              value={v.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
            <Err k="description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{ui("Source link")}</Label>
              <Input
                value={v.source_url ?? ""}
                onChange={(e) => set("source_url", e.target.value)}
                placeholder={ui("https://")}
              />
              <Err k="source_url" />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui("Detected")}</Label>
              <Input
                type="date"
                value={v.detected_at}
                onChange={(e) => set("detected_at", e.target.value || today())}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ui("Cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? ui("Saving…") : editing ? ui("Save changes") : ui("Add signal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
