import { useI18n } from "@/lib/i18n";
import { useState, type ReactNode } from "react";
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
import {
  createContact,
  createNote,
  createTask,
  STAKEHOLDER_ROLES,
  type StakeholderRole,
} from "@/lib/mock-data";
type Kind = "task" | "note" | "contact" | null;
function Shell({
  open,
  onClose,
  title,
  busy,
  onSave,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  busy: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  const { t: ui } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ui(title)}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {ui("Cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? ui("Saving…") : ui("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function LeadDialogs({
  leadId,
  kind,
  onClose,
  onSaved,
}: {
  leadId: string;
  kind: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t: ui } = useI18n();
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState({ title: "", due: "", priority: "Medium" });
  const [note, setNote] = useState("");
  const [p, setP] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
    role: "Decision maker" as StakeholderRole,
  });
  const save = async (fn: () => Promise<void>, msg: string, reset: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      reset();
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Shell
        open={kind === "task"}
        onClose={onClose}
        title={ui("Add task")}
        busy={busy}
        onSave={() => {
          if (!task.title.trim()) {
            toast.error(ui("Task title is required"));
            return;
          }
          save(
            () => createTask(leadId, { ...task, title: task.title.trim().slice(0, 200) }),
            "Task added",
            () => setTask({ title: "", due: "", priority: "Medium" }),
          );
        }}
      >
        <div>
          <Label>{ui("Title")}</Label>
          <Input
            autoFocus
            maxLength={200}
            value={task.title}
            onChange={(e) => setTask({ ...task, title: e.target.value })}
            placeholder={ui("Follow up with CTO")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{ui("Due date")}</Label>
            <Input
              type="date"
              value={task.due}
              onChange={(e) => setTask({ ...task, due: e.target.value })}
            />
          </div>
          <div>
            <Label>{ui("Priority")}</Label>
            <Select value={task.priority} onValueChange={(v) => setTask({ ...task, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High", "Urgent"].map((x) => (
                  <SelectItem key={x} value={x}>
                    {ui(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Shell>

      <Shell
        open={kind === "note"}
        onClose={onClose}
        title={ui("Add note")}
        busy={busy}
        onSave={() => {
          if (!note.trim()) {
            toast.error(ui("Note can't be empty"));
            return;
          }
          save(
            () => createNote(leadId, note.trim().slice(0, 5000)),
            "Note added",
            () => setNote(""),
          );
        }}
      >
        <Textarea
          autoFocus
          rows={5}
          maxLength={5000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={ui("What did you learn about this lead?")}
        />
      </Shell>

      <Shell
        open={kind === "contact"}
        onClose={onClose}
        title={ui("Add contact")}
        busy={busy}
        onSave={() => {
          if (!p.firstName.trim()) {
            toast.error(ui("First name is required"));
            return;
          }
          if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
            toast.error(ui("Email looks invalid"));
            return;
          }
          if (p.linkedin && !/^https?:\/\//.test(p.linkedin)) {
            toast.error(ui("LinkedIn must be a full URL"));
            return;
          }
          save(
            () =>
              createContact(leadId, {
                ...p,
                firstName: p.firstName.trim(),
                lastName: p.lastName.trim(),
              }),
            `${p.firstName} added`,
            () =>
              setP({
                firstName: "",
                lastName: "",
                title: "",
                email: "",
                phone: "",
                linkedin: "",
                role: "Decision maker",
              }),
          );
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{ui("First name")}</Label>
            <Input
              autoFocus
              maxLength={50}
              value={p.firstName}
              onChange={(e) => setP({ ...p, firstName: e.target.value })}
            />
          </div>
          <div>
            <Label>{ui("Last name")}</Label>
            <Input
              maxLength={50}
              value={p.lastName}
              onChange={(e) => setP({ ...p, lastName: e.target.value })}
            />
          </div>
          <div>
            <Label>{ui("Job title")}</Label>
            <Input
              maxLength={100}
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
              placeholder={ui("CTO")}
            />
          </div>
          <div>
            <Label>{ui("Role on lead")}</Label>
            <Select
              value={p.role}
              onValueChange={(v) => setP({ ...p, role: v as StakeholderRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAKEHOLDER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ui(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{ui("Email")}</Label>
            <Input
              type="email"
              maxLength={255}
              value={p.email}
              onChange={(e) => setP({ ...p, email: e.target.value })}
            />
          </div>
          <div>
            <Label>{ui("Phone")}</Label>
            <Input
              maxLength={30}
              value={p.phone}
              onChange={(e) => setP({ ...p, phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>{ui("LinkedIn URL")}</Label>
          <Input
            maxLength={300}
            value={p.linkedin}
            onChange={(e) => setP({ ...p, linkedin: e.target.value })}
            placeholder={ui("https://linkedin.com/in/\u2026")}
          />
        </div>
      </Shell>
    </>
  );
}
