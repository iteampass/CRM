import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { sendSupportRequest } from "@/lib/handyflow.functions";

export function GetProDialog({ onClose }: { onClose: () => void }) {
  const { t: tr, locale } = useI18n();
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const message = "Please enable the Pro plan for me.";

  async function submit() {
    if (saving || sent) return;
    setSaving(true);
    try {
      await sendSupportRequest({ data: {
        subject: "Pro plan activation request",
        details: message + "\n\nI understand that Pro activation requires administrator approval.",
      } });
      setSent(true);
    } catch (error) {
      toast.error(tr(error instanceof Error ? error.message : "Could not send your Pro request. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={() => { if (!saving) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="get-pro-title" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <h3 id="get-pro-title">{tr("Get Pro")}</h3>
          <button type="button" disabled={saving} onClick={onClose} aria-label={tr("Close")}><X /></button>
        </div>
        {sent ? (
          <div className="dialog-form">
            <p role="status">{tr("Your request has been sent to the administrator. Your plan will change only after approval and manual activation.")}</p>
            <div className="dialog-actions"><button type="button" className="primary-button" onClick={onClose}>{tr("Done")}</button></div>
          </div>
        ) : (
          <form className="dialog-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <p className="dialog-sub">{tr("During our launch, Pro plans are enabled manually by the administrator. Send a request using your signed-in account.")}</p>
            <label><span>{tr("To")}</span><input readOnly value="admin@handyflow.me" /></label>
            <label><span>{tr("Message")}</span><textarea readOnly rows={3} value={message} /></label>
            <p className="text-sm text-muted-foreground">{tr("Your name and email will be included so the administrator can identify your account and reply.")}</p>
            <div className="dialog-actions">
              <button type="button" className="outline-button" disabled={saving} onClick={onClose}>{tr("Cancel")}</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? tr("Sending…") : tr("Request Pro")}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
