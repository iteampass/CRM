import { useI18n } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function ContactForm() {
  const { t: ui } = useI18n();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter your name, a valid email, and a message.");
      return;
    }
    setError("");
    const body = `Hi Ivan,\n\n${message}\n\n${name}\n${email}`;
    window.location.href = `mailto:ivan@teampass.me?subject=${encodeURIComponent(`Project enquiry from ${name}`)}&body=${encodeURIComponent(body)}`;
    setReady(true);
  }
  return (
    <form onSubmit={submit} className="space-y-6" onChange={() => setReady(false)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">{ui("Your name")}</Label>
          <Input
            id="contact-name"
            name="name"
            placeholder={ui("Jane Smith")}
            required
            maxLength={100}
            autoComplete="name"
            className="h-12 bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">{ui("Email address")}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            placeholder={ui("jane@company.com")}
            required
            maxLength={254}
            autoComplete="email"
            className="h-12 bg-background"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">{ui("What do you have in mind?")}</Label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder={ui("A little about your project, goals, and timeline\u2026")}
          required
          maxLength={4000}
          rows={5}
          className="resize-y bg-background"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {ready && (
        <p role="status" className="flex items-start gap-2 text-sm text-success">
          <Check className="mt-0.5 size-4 shrink-0" />
          {ui(
            "Your email draft is ready. Send it in your email app, or email ivan@teampass.me directly.",
          )}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="h-12 bg-highlight text-highlight-foreground hover:bg-highlight/90"
      >
        {ui("Prepare email ")}
        <ArrowUpRight />
      </Button>
    </form>
  );
}
