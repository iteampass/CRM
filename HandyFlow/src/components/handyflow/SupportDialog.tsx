import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { sendSupportRequest } from "@/lib/handyflow.functions";

export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t: tr, locale } = useI18n();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit() {
    setSaving(true);
    try {
      await sendSupportRequest({ data: { subject, details } });
      toast.success(tr("Your message was sent to our support team."));
      setSubject("");
      setDetails("");
      onClose();
    } catch (e) {
      toast.error(tr(e instanceof Error ? e.message : "Could not send your message."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>{tr("Get support")}</h3>
          <button type="button" onClick={onClose} aria-label={tr("Close")}>
            <X />
          </button>
        </div>
        <p className="dialog-sub">{tr("Describe the problem and our support team will get back to you by email.")}</p>
        <form
          className="dialog-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            <span>{tr("Subject (optional)")}</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={tr("Short summary")}
              maxLength={140}
            />
          </label>
          <label>
            <span>{tr("Problem details *")}</span>
            <textarea
              rows={6}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={tr("Tell us what happened, what you expected, and any steps to reproduce it…")}
              maxLength={4000}
              autoFocus
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="outline-button" onClick={onClose}>{tr("Cancel")}</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? tr("Sending…") : tr("Send to support")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
