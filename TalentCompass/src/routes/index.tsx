import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, FileText, Gauge, MessagesSquare } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Talent Compass - Candidate & Interview Evaluation Workspace" },
      {
        name: "description",
        content:
          "Talent Compass gives recruiters one calm workspace for resumes, parsed candidate data, interview scores and internal hiring notes.",
      },
      { property: "og:title", content: "Talent Compass - Candidate & Interview Evaluation Workspace" },
      {
        property: "og:description",
        content: "One workspace for resumes, parsed candidate data, interview scores and internal hiring notes.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Resume, preserved",
    body: "The original document stays untouched next to the structured data parsed from it.",
  },
  {
    icon: ClipboardList,
    title: "Structured evaluations",
    body: "Every interviewer scores independently; the candidate average recalculates instantly.",
  },
  {
    icon: MessagesSquare,
    title: "One feedback thread",
    body: "Recruiter, HR, technical and final-round notes in a single chronological record.",
  },
  {
    icon: Gauge,
    title: "Pipeline at a glance",
    body: "Know who is new, interviewing, awaiting feedback or progressing - without a report.",
  },
];

const footerInfo = [
  {
    id: "privacy",
    title: "Privacy Policy",
    body: "Talent Compass uses candidate and hiring-team information only to power the workspace. Demo data is stored solely for the purposes of this preview. In production, workspace data is separated between organizations and access is managed by your hiring team.",
  },
  {
    id: "terms",
    title: "Terms of Service",
    body: "Talent Compass is a collaborative recruitment workspace for internal hiring activities. Teams are responsible for ensuring candidate information is accurate, appropriate, and handled in accordance with their own hiring policies.",
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    body: "We use essential preferences such as theme and authentication session settings to make the workspace work. This demo does not use advertising cookies or sell personal information.",
  },
  {
    id: "security",
    title: "Security",
    body: "Workspace data is protected with authenticated access and workspace-level data separation. Sensitive server actions, including resume parsing, are authorized before they access candidate records. Contact us to request security documentation for your team.",
  },
];

function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const result = await sendContactMessage({ data: { name, email, message } });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Thanks — your message has been sent.");
      setName("");
      setEmail("");
      setMessage("");
      setOpen(false);
    } catch {
      setError("Your message could not be sent. Please check your details and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!sending) setOpen(value); }}>
      <DialogTrigger asChild>
        <button type="button" className="hover:text-foreground transition-colors">Contact</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="label-caps">Contact</p>
          <DialogTitle>Talk to the Talent Compass team.</DialogTitle>
          <DialogDescription>
            Ask about the workspace, security, or bringing your hiring team on board.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium">Name</label>
            <Input id="contact-name" maxLength={120} disabled={sending} value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
            <Input id="contact-email" maxLength={254} disabled={sending} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
            <Textarea id="contact-message" maxLength={10000} disabled={sending} value={message} onChange={(event) => setMessage(event.target.value)} rows={5} required />
          </div>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Landing() {
  return (
    <div id="home" className="app-enter min-h-screen">
      <header className="bg-surface text-foreground border-border border-b">
        <div className="mx-auto max-w-6xl px-5 py-4">
          {/* Mobile: icon + actions on one row, name on the next */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 place-items-center rounded-full text-[11px] font-bold">
                TC
              </span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground"
                  asChild
                >
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-brand-accent"
                  asChild
                >
                  <Link to="/app">Open workspace</Link>
                </Button>
              </div>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Talent Compass</span>
          </div>

          {/* Desktop: icon + name on the left, actions on the right */}
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 place-items-center rounded-full text-[11px] font-bold">
                TC
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Talent Compass</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
                asChild
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-brand-accent"
                asChild
              >
                <Link to="/app">Open workspace</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="label-caps">For recruitment and hiring teams</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-balance sm:text-5xl">
              The candidate record your hiring team actually reads.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-base leading-relaxed">
              Talent Compass keeps resumes, parsed candidate data, interview scores and internal notes in one precise
              workspace so decisions are made on evidence, not memory.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/app">
                  Open the workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/auth" search={{ tab: "signup" }}>
                  Create an account
                </Link>
              </Button>
            </div>
          </div>
          <div className="panel overflow-hidden">
            <div className="bg-primary flex items-center justify-between border-b border-primary-dark px-5 py-4 text-primary-foreground">
              <span className="text-sm font-semibold">Active pipeline</span>
              <span className="text-xs text-primary-foreground/70">Live overview</span>
            </div>
            <div className="divide-border divide-y">
              {["Technical Interview", "Final Interview", "Offer"].map((stage, index) => (
                <div key={stage} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
                  <span className="bg-accent text-accent-foreground grid size-8 place-items-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{stage}</span>
                    <span className="text-muted-foreground block text-xs">Candidate review stage</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{[8, 4, 2][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 pb-20 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="text-primary size-5" />
              <h2 className="mt-3 text-lg font-black">{f.title}</h2>
              <p className="text-foreground/80 mt-1.5 text-base font-medium leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 pb-10 sm:grid-cols-2">
          {footerInfo.map((item) => (
            <article key={item.id} id={item.id} className="scroll-mt-24 panel p-5">
              <p className="label-caps">Talent Compass</p>
              <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.body}</p>
            </article>
          ))}
        </section>

      </main>

      <footer className="border-border text-muted-foreground border-t px-5 py-8 text-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-foreground">Talent Compass</p>
              <p className="mt-1">Candidate & interview evaluation workspace for hiring teams.</p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a href="#home" className="hover:text-foreground transition-colors">
                Home
              </a>
              <Link to="/auth" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
              <a href="#privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#cookies" className="hover:text-foreground transition-colors">
                Cookie Policy
              </a>
              <a href="#security" className="hover:text-foreground transition-colors">
                Security
              </a>
              <ContactDialog />
            </nav>
          </div>
          <div className="border-border mt-6 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Talent Compass. All rights reserved.</p>
            <p>Built for modern recruitment teams.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
