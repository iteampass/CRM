import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicTestimonials } from "@/lib/testimonials.functions";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { CalendarCheck, Eye, EyeOff, Hammer, Loader2, MapPin, ShieldCheck, Wrench } from "lucide-react";
import { HeroSlideshow } from "@/components/landing/HeroSlideshow";
import { toast } from "sonner";
import { validateSession } from "@/lib/validate-session";
import { clearConfirmationSession } from "@/lib/email-confirmation";
import { supabase, isEmailConfirmation } from "@/integrations/supabase/client";

import { COUNTRIES, dialFor } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";
import { detectCountryCode } from "@/lib/detect-country";
import { geocodeAddress, mapEmbedUrl, type GeoResult } from "@/lib/geocode";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    confirmation: z.literal("signup").optional(),
    mode: z.enum(["signin", "signup"]).optional(),
    role: z.enum(["client", "handyman"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — HandyFlow" },
      {
        name: "description",
        content:
          "Sign in or create a HandyFlow account to manage repair requests, your handyman crew and the weekly schedule.",
      },
      { property: "og:title", content: "Sign in — HandyFlow" },
      {
        property: "og:description",
        content: "Access your HandyFlow home services workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const brandPoints = [
  { icon: Wrench, label: "Skilled, vetted local handymen" },
  { icon: CalendarCheck, label: "Clear scheduling and job tracking" },
  { icon: ShieldCheck, label: "Agreed pricing before work begins" },
];

function AuthPage() {
  const { t: tr, locale } = useI18n();
  const navigate = useNavigate();
  const fetchTestimonials = useServerFn(getPublicTestimonials);
  const { data: testimonials } = useQuery({
    queryKey: ["public-testimonials"],
    queryFn: () => fetchTestimonials(),
  });
  const signInTestimonial = testimonials?.signInTestimonial;
  const search = useSearch({ strict: false }) as { mode?: "signin" | "signup"; role?: "client" | "handyman" };
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    () => (search.mode === "signup" ? "signup" : "signin"),
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "handyman">(
    () => (search.role === "handyman" ? "handyman" : "client"),
  );
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [locating, setLocating] = useState(false);

  const dial = dialFor(countryCode);
  const countryName = COUNTRIES.find((c) => c.code === countryCode)?.name ?? "";

  function changeCountry(code: string) {
    const prev = dialFor(countryCode);
    const next = dialFor(code);
    setCountryCode(code);
    setPhone((p) => {
      const rest = prev && p.startsWith(prev) ? p.slice(prev.length).trim() : p.trim();
      return next ? `${next} ${rest}`.trim() : rest;
    });
  }

  // Default the country from the visitor's IP / locale (only if untouched).
  const detectedRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    detectCountryCode().then((code) => {
      if (cancelled || !code) return;
      detectedRef.current = code;
      setCountryCode((cur) => {
        if (cur) return cur;
        setPhone((p) => (p.trim() ? p : dialFor(code)));
        return code;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);



  const geoQuery =
    mode === "signup"
      ? [[street, streetNumber].filter(Boolean).join(" "), zipCode, city, countryName]
          .filter(Boolean)
          .join(", ")
      : "";

  useEffect(() => {
    if (!geoQuery || !city) {
      setGeo(null);
      return;
    }
    let cancelled = false;
    setLocating(true);
    const t = setTimeout(async () => {
      const res = await geocodeAddress(geoQuery);
      if (!cancelled) {
        setGeo(res);
        setLocating(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setLocating(false);
    };
  }, [geoQuery, city]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setNickname("");
    setEmail("");
    setPassword("");
    setRole("client");
    setStreet("");
    setStreetNumber("");
    setFloor("");
    setZipCode("");
    setCity("");
    setCountryCode(detectedRef.current ?? "");
    setPhone(detectedRef.current ? dialFor(detectedRef.current) : "");
    setIsPublic(true);
    setGeo(null);
  }

  useEffect(() => {
    let cancelled = false;

    // Email confirmation links land here with a session in the URL hash.
    // Requirement: do NOT auto-log-in — sign out the fresh session and ask
    // the user to sign in with credentials.
    if (isEmailConfirmation) {
      setBusy(true);
      setMode("signin");
      void clearConfirmationSession(supabase.auth).then(() => {
        if (cancelled) return;
        window.history.replaceState(window.history.state, "", window.location.pathname);
        toast.success(tr("Email confirmed — sign in with your password to continue."));
      }).catch((error) => {
        if (!cancelled) toast.error(tr(error instanceof Error ? error.message : "Unable to finish confirmation. Please try again."));
      }).finally(() => {
        if (!cancelled) setBusy(false);
      });
      return () => { cancelled = true; };
    }

    // Defer auth callbacks and coalesce events to avoid overlapping validation.
    let validating = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function validate() {
      if (cancelled || validating) return;
      validating = true;
      try {
        const user = await validateSession(supabase);
        if (user && !cancelled) await navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        if (!cancelled) toast.error(tr(error instanceof Error ? error.message : "Unable to verify your account. Please try again."));
      } finally {
        validating = false;
      }
    }
    void validate();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION" && event !== "USER_UPDATED") return;
      clearTimeout(timer);
      timer = setTimeout(() => void validate(), 0);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              app: "handyflow",
              first_name: firstName,
              last_name: lastName,
              nickname,
              name: `${firstName} ${lastName}`.trim(),
              role,
              address: [
                [street, streetNumber].filter(Boolean).join(" "),
                floor ? `Floor ${floor}` : "",
                [zipCode, city].filter(Boolean).join(" "),
                COUNTRIES.find((c) => c.code === countryCode)?.name ?? "",
              ]
                .filter(Boolean)
                .join(", "),
              street,
              street_number: streetNumber,
              floor,
              zip_code: zipCode,
              city,
              country: COUNTRIES.find((c) => c.code === countryCode)?.name ?? "",
              country_code: countryCode,
              phone,
              latitude: geo ? String(geo.latitude) : "",
              longitude: geo ? String(geo.longitude) : "",
              formatted_address: geo?.formattedAddress ?? "",
              is_public: role === "handyman" ? isPublic : true,
            },
          },
        });
        if (error) throw error;
        toast.success(
          tr(data.session
            ? "Account created — you're signed in."
            : "Account created — check your email to confirm it."),
        );
        resetForm();
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Confirmation links intentionally skip the session listener above.
        // Complete explicit sign-in here instead of relying on an auth event.
        const user = await validateSession(supabase);
        if (!user) throw new Error("Sign-in could not be completed. Please try again.");
        await navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(tr("Check your email for a password reset link."));
      setMode("signin");
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : "Google sign-in failed"));
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden lg:block">
        <HeroSlideshow background />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.24_0.045_170)] via-[oklch(0.436_0.072_170/0.82)] to-[oklch(0.436_0.072_170/0.45)]" />
        <div className="relative flex h-full flex-col justify-between gap-12 p-12 pb-28 text-brand-foreground">
          <Link to="/" className="flex w-fit items-center gap-2.5">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-foreground/15 backdrop-blur-sm">
              <Hammer className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{tr("Handy")}<span className="text-highlight">{tr("Flow")}</span>
            </span>
          </Link>

          <div className="space-y-8">
            <h2 className="font-display max-w-md text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">{tr("Home repairs,")}<br />
              <span className="text-highlight">{tr("done right.")}</span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-brand-foreground/85">{tr("HandyFlow connects you with trusted local professionals — request work, agree on details, and track the job from start to finish.")}</p>
            <ul className="space-y-3.5">
              {brandPoints.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-medium">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-foreground/15 backdrop-blur-sm">
                    <Icon className="size-4" />
                  </span>
                  {tr(label)}
                </li>
              ))}
            </ul>
            {signInTestimonial && (
              <figure className="max-w-md rounded-xl border border-brand-foreground/20 bg-brand-foreground/10 p-5 backdrop-blur-sm">
                <blockquote className="text-sm leading-relaxed text-brand-foreground/90">
                  “{signInTestimonial.quote}”
                </blockquote>
                <figcaption className="mt-3 text-xs font-medium text-brand-foreground/75">
                  {signInTestimonial.name}{signInTestimonial.role && ` · ${signInTestimonial.role}`}
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="mb-4 flex justify-end md:hidden"><LanguageSwitcher mobile /></div>
        <Link to="/" className="flex w-fit items-center gap-2 text-lg font-semibold lg:hidden">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hammer className="size-4.5" />
          </span>{tr("Handy")}<span className="-ml-2 text-primary">{tr("Flow")}</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="w-full">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {mode === "signin"
            ? tr("Welcome back")
            : mode === "signup"
              ? tr("Create your account")
              : tr("Reset your password")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? tr("Sign in to your HandyFlow workspace.")
            : mode === "signup"
              ? tr("Join HandyFlow as a client or a handyman.")
              : tr("Enter your email and we'll send you a reset link.")}
        </p>

        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-[#747775] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-5 shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-7.95Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.83 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.15a11 11 0 0 0 0 9.88l3.68-2.84Z" />
                <path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.07 14.97 1 12 1a11 11 0 0 0-9.85 6.06L5.83 9.9C6.7 7.3 9.13 5.36 12 5.36Z" />
              </svg>{tr("Continue with Google")}</button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />{tr("or")}<span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {mode === "forgot" ? (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={tr("you@example.com")}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}{" "}{tr("Send reset link")}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder={tr("First name")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder={tr("Last name")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={tr("Nickname (optional)")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="grid grid-cols-12 gap-2">
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={tr("Street")}
                    className="col-span-6 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={streetNumber}
                    onChange={(e) => setStreetNumber(e.target.value)}
                    placeholder={tr("Number")}
                    className="col-span-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={tr("Floor")}
                    className="col-span-3 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder={tr("ZIP code")}
                    className="col-span-4 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={tr("City")}
                    className="col-span-8 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <CountrySelect
                    value={countryCode}
                    onChange={changeCountry}
                    className="col-span-12"
                  />
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={dial ? `${dial} 555 000 0000` : tr("Phone number")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(["client", "handyman"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                        role === r
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {role === "handyman" && (
                  <label className="flex items-start gap-3 rounded-md border border-input p-3 text-left text-sm">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="block font-medium">{tr("Publicly visible")}</strong>
                      <span className="text-muted-foreground">{tr("Show my profile in the handyman directory.")}</span>
                    </span>
                  </label>
                )}
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={tr("you@example.com")}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={tr("Password")}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? tr("Hide password") : tr("Show password")}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs font-medium text-primary hover:underline"
                >{tr("Forgot password?")}</button>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? tr("Sign in") : tr("Create account")}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <>{tr("Remember your password?")}{" "}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode("signin")}
              >{tr("Sign in")}</button>
            </>
          ) : (
            <>
              {mode === "signin" ? tr("New to HandyFlow?") : tr("Already have an account?")}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? tr("Create an account") : tr("Sign in")}
              </button>
            </>
          )}
        </p>

        {mode === "signup" && (geo || locating) && (
          <div className="mt-6 overflow-hidden rounded-xl border border-input bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-input px-4 py-3 text-sm font-medium">
              <MapPin className="size-4 text-primary" />
              {locating ? tr("Locating address…") : tr("Your location")}
            </div>
            {geo ? (
              <>
                <iframe
                  title={tr("Map of your address")}
                  src={mapEmbedUrl(geo.latitude, geo.longitude)}
                  className="h-56 w-full border-0"
                  loading="lazy"
                />
                <div className="space-y-1 px-4 py-3 text-xs text-muted-foreground">
                  <p>{geo.formattedAddress}</p>
                  <p>
                    {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />{tr("Finding your address…")}</div>
            )}
          </div>
        )}
        </div>
        </div>
      </div>
    </main>
  );
}
