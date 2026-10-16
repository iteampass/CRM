import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { draftEmailWithAi } from "@/lib/email-ai.functions";
import { recordEmailSent, type Contact } from "@/lib/mock-data";

export function EmailContactDialog({ contact, onClose, onSent }: { contact: Contact | null; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const draftFn = useServerFn(draftEmailWithAi);
  const draft = async () => {
    if (!contact) return;
    if (!subject.trim()) { toast.error("Enter a subject first — AI writes the message from it"); return; }
    setDrafting(true);
    try { const r = await draftFn({ data: { contactId: contact.id, subject: subject.trim() } }); setBody(r.body); toast.success("Draft created — review before sending"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setDrafting(false); }
  };
  useEffect(() => { if (contact) { setSubject(""); setBody(`Hi ${contact.firstName},\n\n`); } }, [contact]);

  const send = async () => {
    if (!contact?.email) return;
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Message can't be empty"); return; }
    setBusy(true);
    try {
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
      await recordEmailSent(contact.id, subject.trim().slice(0, 150));
      toast.success(`${contact.firstName} marked as contacted`);
      onSent(); onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email {contact?.firstName} {contact?.lastName}</DialogTitle>
          <DialogDescription>{contact?.email} — opens in your email app to send.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div><Label>Subject</Label><Input autoFocus maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><div className="mb-1 flex items-center justify-between"><Label>Message</Label><Button type="button" size="sm" variant="outline" onClick={draft} disabled={drafting}><Sparkles className="mr-1 h-3.5 w-3.5" />{drafting ? "Writing…" : "Create with AI"}</Button></div><Textarea rows={8} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
