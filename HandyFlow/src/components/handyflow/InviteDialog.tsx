import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { inviteHandyman } from "@/lib/handyflow.functions";

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t: tr, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit() {
    setSaving(true);
    try {
      await inviteHandyman({ data: { email, name, message } });
      toast.success(`Invitation recorded for ${email.trim()}`);
      setEmail("");
      setName("");
      setMessage("");
      onClose();
    } catch (e) {
      toast.error(tr(e instanceof Error ? e.message : "Could not send invitation."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>{tr("Invite a handyman")}</h3>
          <button type="button" onClick={onClose} aria-label={tr("Close")}>
            <X />
          </button>
        </div>
        <p className="dialog-sub">{tr("Invite a handyman you know to join HandyFlow. They'll receive an invite at this email address.")}</p>
        <form
          className="dialog-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            <span>{tr("Email address *")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tr("handyman@example.com")}
              autoFocus
            />
          </label>
          <label>
            <span>{tr("Name (optional)")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Who are you inviting?")} />
          </label>
          <label>
            <span>{tr("Personal message (optional)")}</span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={tr("Hi! I'd love to work with you on HandyFlow…")}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="outline-button" onClick={onClose}>{tr("Cancel")}</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? tr("Sending…") : tr("Send invitation")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
