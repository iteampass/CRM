import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { QueryStatus } from "@/components/QueryStatus";
import { useAuth } from "@/lib/auth";
import { useProfile, type Profile } from "@/lib/personal-data";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/account")({
  head: pageHead("Account", "Sign in and manage your rental preferences."),
  component: Account,
});
const field = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
const button =
  "rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";

function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const address = email.trim().toLowerCase();
      const result = sent
        ? await supabase.auth.verifyOtp({ email: address, token: code.trim(), type: "email" })
        : await supabase.auth.signInWithOtp({
            email: address,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${window.location.origin}/account`,
            },
          });
      if (result.error) throw result.error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mx-6 max-w-md space-y-4 rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-semibold">Sign in or create an account</h2>
      <p className="text-sm text-muted-foreground">
        Use your email to save apartments and searches.
      </p>
      <label className="block">
        Email
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          disabled={sent || busy}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {sent && (
        <>
          <p role="status" className="text-sm">
            Check your email for a sign-in link or code. If your email contains a code, enter it
            below.
          </p>
          <label className="block">
            One-time code
            <input
              className={field}
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              minLength={6}
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button className={button} disabled={busy}>
        {busy ? "Please wait…" : sent ? "Verify code" : "Send sign-in email"}
      </button>
      {sent && (
        <button
          type="button"
          className="ml-3 text-sm text-primary"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
            setError("");
          }}
        >
          Change email or resend
        </button>
      )}
    </form>
  );
}

function ProfileForm({ initial }: { initial: Profile }) {
  const { user } = useAuth();
  const { save } = useProfile();
  const [name, setName] = useState(initial.full_name);
  const [city, setCity] = useState(initial.preferred_city);
  const [budget, setBudget] = useState(initial.max_budget?.toString() ?? "");
  return (
    <form
      className="rounded-2xl border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          full_name: name,
          preferred_city: city,
          max_budget: budget === "" ? null : Number(budget),
        });
      }}
    >
      <h2 className="font-semibold">Profile</h2>
      <label className="mt-4 block text-sm">
        Name
        <input
          className={field}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        Sign-in email
        <input className={field} type="email" readOnly value={user?.email ?? ""} />
      </label>
      <label className="mt-3 block text-sm">
        Preferred city
        <input
          className={field}
          required
          maxLength={120}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        Max monthly budget (€)
        <input
          className={field}
          type="number"
          min="0"
          max="99999999"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </label>
      <button className={`${button} mt-5`} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save profile"}
      </button>
      {save.isError && (
        <p role="alert" className="mt-3 text-destructive">
          {save.error.message}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="mt-3">
          Profile saved.
        </p>
      )}
    </form>
  );
}
function ProfilePanel() {
  const profile = useProfile();
  return (
    <div className="px-6 pb-10">
      <QueryStatus
        pending={profile.isPending}
        error={profile.error}
        empty={false}
        emptyText=""
        retry={profile.refetch}
      />
      {profile.data && !profile.isError && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileForm initial={profile.data} />
          <div className="h-fit rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Subscription</h2>
            <p className="mt-3">Free</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Premium subscriptions and billing are not available yet.
            </p>
            <button className={`${button} mt-4`} disabled>
              Premium — coming soon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Account() {
  const { user, loading } = useAuth();
  const [error, setError] = useState("");
  return (
    <AppShell>
      <PageHeader title="Account" sub="Profile and rental preferences">
        {user && (
          <button
            className={button}
            onClick={async () => {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              setError(error?.message ?? "");
            }}
          >
            Sign out
          </button>
        )}
      </PageHeader>
      {error && (
        <p role="alert" className="px-6 text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <p className="px-6" role="status">
          Checking your session…
        </p>
      ) : user ? (
        <ProfilePanel key={user.id} />
      ) : (
        <SignIn />
      )}
    </AppShell>
  );
}
