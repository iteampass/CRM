import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { sendSupportRequest } from "@/lib/handyflow.functions";

export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit() {
    setSaving(true);
    try {
      await sendSupportRequest({ data: { subject, details } });
      toast.success("Your message was sent to our support team.");
      setSubject("");
      setDetails("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Get support</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <p className="dialog-sub">
          Describe the problem and our support team will get back to you by email.
        </p>
        <form
          className="dialog-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            <span>Subject (optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
              maxLength={140}
            />
          </label>
          <label>
            <span>Problem details *</span>
            <textarea
              rows={6}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what happened, what you expected, and any steps to reproduce it…"
              maxLength={4000}
              autoFocus
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Sending…" : "Send to support"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
