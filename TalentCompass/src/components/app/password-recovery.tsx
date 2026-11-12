import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function PasswordRecovery({ reset, initialEmail, onBack }: { reset: boolean; initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!reset) return;
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("error") || new URLSearchParams(window.location.search).has("error")) {
      setError("This reset link is invalid or expired. Request a new password reset email.");
      return;
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setReady(Boolean(data.session) && !sessionError);
      if (!data.session || sessionError) setError("This reset link is invalid or expired. Request a new password reset email.");
    }).catch(() => { if (active) setError("Could not verify this reset link. Please request a new one."); });
    return () => { active = false; };
  }, [reset]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{reset ? "Choose a new password" : "Reset your password"}</h1>
      <p className="text-muted-foreground text-sm">{reset ? "Enter and confirm your new password." : "Enter your account email and we’ll send you a reset link."}</p>
      {success ? <p role="status" className="text-sm">{reset ? "Your password has been updated. You can now log in with your new password." : "If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder."}</p> : (
        <form className="grid gap-4" onSubmit={async (event) => {
          event.preventDefault();
          if (busy || (reset && !ready)) return;
          setError("");
          if (reset && password !== confirmation) { setError("Passwords do not match."); return; }
          setBusy(true);
          try {
            if (reset) {
              const { error: updateError } = await supabase.auth.updateUser({ password });
              if (updateError) throw updateError;
              await supabase.auth.signOut({ scope: "local" });
              setPassword(""); setConfirmation("");
            } else {
              const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth?tab=reset` });
              if (sendError) throw sendError;
            }
            setSuccess(true);
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reset your password. Please try again."); }
          finally { setBusy(false); }
        }}>
          {reset ? <>
            <label className="grid gap-1.5 text-sm">New password<Input type="password" autoComplete="new-password" minLength={8} required value={password} disabled={busy || !ready} onChange={(e) => setPassword(e.target.value)} /></label>
            <label className="grid gap-1.5 text-sm">Confirm password<Input type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={busy || !ready} onChange={(e) => setConfirmation(e.target.value)} /></label>
            <p className="text-muted-foreground text-xs">Use at least 8 characters.</p>
          </> : <label className="grid gap-1.5 text-sm">Business email<Input type="email" autoComplete="email" required value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} /></label>}
          <Button disabled={busy || (reset && !ready)}>{busy ? "Please wait…" : reset ? "Save new password" : "Send reset link"}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <Button variant="ghost" type="button" disabled={busy} onClick={onBack}>Back to log in</Button>
    </div>
  );
}
