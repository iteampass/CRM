import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Hammer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — HandyFlow" },
      {
        name: "description",
        content: "Set a new password for your HandyFlow account.",
      },
      { property: "og:title", content: "Reset password — HandyFlow" },
      {
        property: "og:description",
        content: "Set a new password for your HandyFlow account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // A recovery link from Supabase lands here with #...type=recovery...
  // and an active session. Wait for that session before allowing a reset.
  useEffect(() => {
    let cancelled = false;

    // Strip the hash so it doesn't linger in the URL.
    if (window.location.hash.includes("type=recovery")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (data.session) {
          setReady(true);
        } else {
          // No recovery session — the link may be expired. Redirect to auth.
          toast.error("This reset link has expired. Please request a new one.");
          navigate({ to: "/auth", replace: true });
        }
      }
    }
    check();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — sign in with your new password.");
      await supabase.auth.signOut({ scope: "local" });
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-8">
      <Link to="/" className="mb-8 flex w-fit items-center gap-2 text-lg font-semibold">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Hammer className="size-4.5" />
        </span>
        Handy<span className="-ml-2 text-primary">Flow</span>
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password for your HandyFlow account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="New password"
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Update password
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => navigate({ to: "/auth", replace: true })}
          >
            Back to sign in
          </button>
        </p>
      </div>
    </main>
  );
}
