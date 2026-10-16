import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DevLead CRM" },
      { name: "description", content: "Sign in to your DevLead CRM workspace." },
      { property: "og:title", content: "Sign in — DevLead CRM" },
      { property: "og:description", content: "Sign in to your DevLead CRM workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/dashboard", replace: true });
    });
  }, [nav]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(addr);
      setStep("code");
      toast.success("We emailed you a sign-in code.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
      if (error) throw error;
      nav({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            D
          </div>
          <span className="text-lg font-bold text-sidebar-accent-foreground">DevLead</span>
        </div>
        <div>
          <p className="text-3xl font-bold leading-tight text-sidebar-accent-foreground">
            Which companies need software built right now — and why?
          </p>
          <p className="mt-3 text-sm">
            Buying signals, lead scoring and a pipeline built for dev agencies.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">© 2026 DevLead CRM</p>
      </div>
      <div className="flex items-center justify-center p-6">
        {step === "email" ? (
          <form onSubmit={sendCode} className="w-full max-w-sm space-y-4">
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we'll send you a one-time code. Workspace access requires an
              invitation.
            </p>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="w-full max-w-sm space-y-4">
            <h1 className="text-2xl font-bold">Enter your code</h1>
            <p className="text-sm text-muted-foreground">We sent a code to {email}.</p>
            <div className="space-y-1">
              <Label htmlFor="code">One-time code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-primary"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
              >
                Change email
              </button>
              <button
                type="button"
                className="text-primary"
                disabled={busy}
                onClick={() => sendCode()}
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
