import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  selectSignInTestimonial,
  deleteTestimonial,
  getMyTestimonials,
  getTestimonialAdmin,
  setTestimonialsEnabled,
  submitTestimonial,
  updateTestimonial,
  type AdminTestimonial,
} from "@/lib/testimonials.functions";

const STATUS_COPY: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Published",
  rejected: "Not published",
};

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          style={{ background: "none", border: "none", padding: 0, cursor: onChange ? "pointer" : "default" }}
        >
          <Star
            className="size-4"
            style={{
              fill: n <= value ? "var(--warning, #E59B3A)" : "transparent",
              color: "var(--warning, #E59B3A)",
            }}
          />
        </button>
      ))}
    </span>
  );
}

/** Form + history for the signed-in user's own testimonial. */
export function ShareTestimonialPanel() {
  const { t: tr, locale } = useI18n();
  const [quote, setQuote] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<AdminTestimonial[]>([]);

  async function load() {
    try {
      setMine(await getMyTestimonials());
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    setSaving(true);
    try {
      await submitTestimonial({ data: { quote, role, rating } });
      toast.success(tr("Thanks! Your testimonial was sent for review."));
      setQuote("");
      setRole("");
      await load();
    } catch (e) {
      toast.error(tr(e instanceof Error ? e.message : "Could not send your testimonial."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <div>
          <h2>{tr("Share your experience")}</h2>
          <p>{tr("Tell others how HandyFlow worked for you. We review every story before it goes public.")}</p>
        </div>
      </div>
      <form
        className="dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          <span>{tr("Your story *")}</span>
          <textarea
            rows={4}
            required
            maxLength={600}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder={tr("What did you need done, and how did it go?")}
          />
        </label>
        <label>
          <span>{tr("How should we describe you? (optional)")}</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={80}
            placeholder={tr("Homeowner, Culver City")}
          />
        </label>
        <label>
          <span>{tr("Rating")}</span>
          <Stars value={rating} onChange={setRating} />
        </label>
        <div className="dialog-actions">
          <button type="submit" className="primary-button" disabled={saving || quote.trim().length < 20}>
            {saving ? tr("Sending…") : tr("Submit testimonial")}
          </button>
        </div>
      </form>
      {mine.length > 0 && (
        <div style={{ marginTop: "1rem", display: "grid", gap: ".5rem" }}>
          {mine.map((t) => (
            <div key={t.id} className="feedback-row" style={{ display: "grid", gap: ".25rem" }}>
              <strong style={{ fontSize: ".8rem" }}>{STATUS_COPY[t.status] ?? t.status}</strong>
              <span style={{ fontSize: ".85rem", opacity: 0.8 }}>“{t.quote}”</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Admin-only moderation: switch the public section on and pick which stories show. */
export function TestimonialAdminPanel() {
  const { t: tr, locale } = useI18n();
  const queryClient = useQueryClient();
  const [signInTestimonialId, setSignInTestimonialId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await getTestimonialAdmin();
      setSignInTestimonialId(res.signInTestimonialId);
      setEnabled(res.enabled);
      setItems(res.items);
    } catch (e) {
      toast.error(tr(e instanceof Error ? e.message : "Could not load testimonials."));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["public-testimonials"] });
      toast.success(tr(ok));
      await load();
    } catch (e) {
      toast.error(tr(e instanceof Error ? e.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  const approvedCount = items.filter((t) => t.status === "approved").length;

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <div>
          <h2>{tr("Manage testimonials")}</h2>
          <p>
            {enabled
              ? `Showing ${approvedCount} published ${approvedCount === 1 ? "story" : "stories"} to visitors.`
              : tr("The testimonials section is hidden from visitors.")}
          </p>
        </div>
        <button
          type="button"
          className={enabled ? "outline-button" : "primary-button"}
          disabled={busy}
          onClick={() => void run(() => setTestimonialsEnabled({ data: { enabled: !enabled } }), enabled ? "Testimonials hidden." : "Testimonials are now live.")}
        >
          {enabled ? tr("Turn off") : tr("Turn on")}
        </button>
      </div>

      <p className="mb-4 text-sm">{tr("Choose one approved story to show on the sign-in page. No quote is shown until you choose one. Unpublishing or deleting it also hides it from sign-in. The switch above controls the landing page only.")}</p>
      {signInTestimonialId && (
        <button type="button" className="outline-button mb-4" disabled={busy}
          onClick={() => void run(() => selectSignInTestimonial({ data: { id: null } }), "Sign-in testimonial hidden.")}>{tr("Hide sign-in testimonial")}</button>
      )}
      {items.length === 0 ? (
        <p style={{ fontSize: ".9rem", opacity: 0.75 }}>{tr("No testimonials submitted yet.")}</p>
      ) : (
        <div style={{ display: "grid", gap: ".75rem" }}>
          {items.map((t) => (
            <div key={t.id} className="feedback-row" style={{ display: "grid", gap: ".4rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".5rem" }}>
                <strong style={{ fontSize: ".9rem" }}>{t.name}</strong>
                {t.role && <span style={{ fontSize: ".8rem", opacity: 0.7 }}>{t.role}</span>}
                <Stars value={t.rating} />
                <span style={{ fontSize: ".75rem", opacity: 0.7 }}>{STATUS_COPY[t.status] ?? t.status}</span>
                {t.featured && <span style={{ fontSize: ".75rem", opacity: 0.7 }}>{tr("· Featured")}</span>}
              </div>
              <p style={{ fontSize: ".88rem", margin: 0 }}>“{t.quote}”</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                {t.status === "approved" && (
                  <button type="button" className="outline-button"
                    disabled={busy || signInTestimonialId === t.id}
                    onClick={() => void run(() => selectSignInTestimonial({ data: { id: t.id } }), "Sign-in testimonial selected.")}>
                    {signInTestimonialId === t.id ? tr("Selected for sign-in") : tr("Show on sign-in")}
                  </button>
                )}
                {t.status !== "approved" && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={busy}
                    onClick={() => void run(() => updateTestimonial({ data: { id: t.id, status: "approved" } }), "Testimonial published.")}
                  >{tr("Publish")}</button>
                )}
                {t.status === "approved" && (
                  <button
                    type="button"
                    className="outline-button"
                    disabled={busy}
                    onClick={() => void run(() => updateTestimonial({ data: { id: t.id, status: "pending" } }), "Testimonial unpublished.")}
                  >{tr("Unpublish")}</button>
                )}
                <button
                  type="button"
                  className="outline-button"
                  disabled={busy}
                  onClick={() => void run(() => updateTestimonial({ data: { id: t.id, featured: !t.featured } }), t.featured ? "Removed from featured." : "Marked as featured.")}
                >
                  {t.featured ? tr("Unfeature") : tr("Feature")}
                </button>
                {t.status !== "rejected" && (
                  <button
                    type="button"
                    className="outline-button"
                    disabled={busy}
                    onClick={() => void run(() => updateTestimonial({ data: { id: t.id, status: "rejected" } }), "Testimonial rejected.")}
                  >{tr("Reject")}</button>
                )}
                <button
                  type="button"
                  className="outline-button"
                  disabled={busy}
                  onClick={() => void run(() => deleteTestimonial({ data: { id: t.id } }), "Testimonial deleted.")}
                >{tr("Delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
