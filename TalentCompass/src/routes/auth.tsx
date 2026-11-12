import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordRecovery } from "@/components/app/password-recovery";
import { ThemeToggle } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { INVITE_STORAGE_KEY } from "@/lib/workspace";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    tab: z.enum(["login", "signup", "forgot", "reset"]).optional(),
    invite: z.string().trim().optional(),
    email: z.string().trim().email().max(254).optional().catch(undefined),
  }).transform((search) => ({
    ...search,
    tab: search.tab ?? (search.invite ? "signup" : "login"),
  })),
  head: () => ({
    meta: [
      { title: "Sign in - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Sign in or create a Talent Compass account to manage candidates and interviews.",
      },
      { property: "og:title", content: "Sign in - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Sign in or create a Talent Compass account to manage candidates and interviews.",
      },
    ],
  }),
  component: AuthPage,
});

function Field({
  label,
  suffix,
  ...props
}: { label: string; suffix?: React.ReactNode } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input {...props} className={suffix ? "pr-10" : props.className} />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-md transition-colors"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { tab, invite, email: invitationEmail } = useSearch({ from: "/auth" });
  const [busy, setBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [login, setLogin] = useState({ email: "", password: "", remember: true });
  const [signup, setSignup] = useState({
    firstName: "",
    lastName: "",
    companyPosition: "",
    email: invite ? invitationEmail ?? "" : "",
    phone: "",
    password: "",
    inviteCode: invite ?? "",
  });

  // An invitation link (/auth?invite=CODE) pre-fills the code and is kept until
  // the account is confirmed and signed in for the first time.
  useEffect(() => {
    const fromUrl = invite;
    const stored = window.localStorage.getItem(INVITE_STORAGE_KEY);
    if (fromUrl) {
      window.localStorage.setItem(INVITE_STORAGE_KEY, fromUrl);
      setSignup((s) => ({ ...s, inviteCode: fromUrl }));
    } else if (stored) {
      setSignup((s) => ({ ...s, inviteCode: stored }));
    }
  }, [invite]);

  useEffect(() => {
    if (invite && invitationEmail) {
      setSignup((current) => ({ ...current, email: invitationEmail }));
    }
  }, [invite, invitationEmail]);

  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") {
      void navigate({ to: "/auth", search: { tab: "reset" }, hash: window.location.hash.slice(1), replace: true });
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        void navigate({ to: "/auth", search: { tab: "reset" }, replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  // After the email confirmation link, do NOT sign the user in automatically:
  // drop any session Supabase created from the link and ask them to log in.
  const handledConfirm = useRef(false);
  useEffect(() => {
    if (handledConfirm.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === "reset" || url.hash.includes("type=recovery")) return;
    const isConfirm =
      url.searchParams.has("confirmed") ||
      url.hash.includes("type=signup");
    if (!isConfirm) return;
    handledConfirm.current = true;
    void (async () => {
      await supabase.auth.signOut();
      window.history.replaceState(null, "", "/auth");
      toast.success("Email confirmed - please log in to continue");
    })();
  }, []);



  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(login.email, login.password);
      toast.success("Welcome back");
      navigate({ to: "/app" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { inviteCode, ...profile } = signup;
      if (inviteCode.trim()) window.localStorage.setItem(INVITE_STORAGE_KEY, inviteCode.trim());
      await signUp({ ...profile });
      toast.success("Account created");
      navigate({ to: "/app" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-enter grid min-h-screen lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <div className="bg-brand-panel text-brand-panel-foreground hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
           <span className="bg-brand-accent text-foreground grid size-8 place-items-center rounded-lg text-[11px] font-bold">
            TC
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Talent Compass</span>
        </Link>
        <div className="max-w-md">
           <p className="font-display text-3xl leading-snug font-semibold text-balance">
            Every resume, score and note about a candidate - in one place your team trusts.
          </p>
           <p className="mt-4 text-sm leading-relaxed text-brand-panel-foreground/70">
            Structured evaluations from multiple interviewers, automatic average scores, and a
            single feedback thread per candidate.
          </p>
        </div>
         <p className="text-xs text-brand-panel-foreground/60">Built for recruitment and hiring teams.</p>
      </div>

      <div className="bg-surface flex flex-col p-6 sm:p-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          {tab === "forgot" || tab === "reset" ? (
            <PasswordRecovery
              key={tab}
              reset={tab === "reset"}
              initialEmail={login.email}
              onBack={() => { void navigate({ to: "/auth", search: { tab: "login" }, hash: "", replace: true }); }}
            />
          ) : <Tabs key={`${tab}:${invite ?? ""}`} defaultValue={tab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 duration-200 animate-in fade-in">
              <h1 className="text-xl font-semibold tracking-tight">Sign in to Talent Compass</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Use your business email to access the workspace.
              </p>
              <form className="mt-6 space-y-4" onSubmit={doLogin}>
                <Field
                  label="Business email"
                  type="email"
                  placeholder="you@company.com"
                  value={login.email}
                  onChange={(e) => setLogin({ ...login, email: e.target.value })}
                />
                <Field
                  label="Password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  suffix={
                    <PasswordToggle
                      visible={showLoginPassword}
                      onToggle={() => setShowLoginPassword((v) => !v)}
                    />
                  }
                />
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={login.remember}
                      onCheckedChange={(v) => setLogin({ ...login, remember: Boolean(v) })}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-primary text-xs font-medium hover:underline"
                    onClick={() => { void navigate({ to: "/auth", search: { tab: "forgot" } }); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Log in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 duration-200 animate-in fade-in">
              <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Set up your recruiter profile in under a minute.
              </p>
              <form className="mt-6 space-y-4" onSubmit={doSignup}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="First name"
                    value={signup.firstName}
                    onChange={(e) => setSignup({ ...signup, firstName: e.target.value })}
                    required
                  />
                  <Field
                    label="Last name"
                    value={signup.lastName}
                    onChange={(e) => setSignup({ ...signup, lastName: e.target.value })}
                    required
                  />
                </div>
                <Field
                  label="Company position"
                  placeholder="Technical Recruiter"
                  value={signup.companyPosition}
                  onChange={(e) => setSignup({ ...signup, companyPosition: e.target.value })}
                  required
                />
                <Field
                  label="Business email"
                  type="email"
                  placeholder="you@company.com"
                  value={signup.email}
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                  required
                />
                <Field
                  label="Business phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={signup.phone}
                  onChange={(e) => setSignup({ ...signup, phone: e.target.value })}
                  required
                />
                <Field
                  label="Invitation code (optional)"
                  placeholder="Paste an invitation code to join a workspace"
                  value={signup.inviteCode}
                  onChange={(e) => setSignup({ ...signup, inviteCode: e.target.value })}
                />
                <Field
                  label="Password"
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={signup.password}
                  onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                  required
                  suffix={
                    <PasswordToggle
                      visible={showSignupPassword}
                      onToggle={() => setShowSignupPassword((v) => !v)}
                    />
                  }
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>}

          <p className="text-muted-foreground mt-8 text-center text-xs">
            <Link to="/" className="hover:text-foreground hover:underline">
              Back to homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
