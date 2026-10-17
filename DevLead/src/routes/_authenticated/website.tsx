import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { workspace } from "@/lib/mock-data";
import { defaultContent, mergeContent, type SiteContent } from "@/lib/site-content";
import { SlideEditor } from "@/components/portfolio/SlideEditor";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabase as any).schema("software");
export const Route = createFileRoute("/_authenticated/website")({
  head: () => ({
    meta: [
      { title: "Website admin — DevLead" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Manage Ivan's public website content and background slideshow.",
      },
      { property: "og:title", content: "Website admin — DevLead" },
      { property: "og:description", content: "Manage website text and slideshow images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WebsiteAdmin,
});
function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  const { t: ui } = useI18n();
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold">{ui(title)}</h2>
          {text && <p className="text-xs text-muted-foreground">{ui(text)}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="min-w-0 space-y-3 border-t px-5 py-4">{children}</div>}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  long,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  long?: boolean;
}) {
  const { t: ui } = useI18n();
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{ui(label)}</span>
      {long ? (
        <Textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
function WebsiteAdmin() {
  const { t: ui } = useI18n();
  const isAdmin = workspace.role === "owner" || workspace.role === "admin";
  const [c, setC] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    db()
      .from("site_content")
      .select("content")
      .eq("id", "landing")
      .maybeSingle()
      .then(
        ({
          data,
          error,
        }: {
          data: {
            content: unknown;
          } | null;
          error: {
            message: string;
          } | null;
        }) => {
          if (error) toast.error(`Couldn't load website content: ${error.message}`);
          setC(mergeContent(data?.content));
        },
      );
  }, []);
  if (!c) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  const up = (fn: (d: SiteContent) => void) =>
    setC((prev) => {
      if (!prev) return prev;
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  const save = async () => {
    if (!isAdmin || uploading || saving) return;
    if (!c.hero.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact.email)) {
      toast.error(ui("Name and a valid contact email are required."));
      return;
    }
    setSaving(true);
    const { error } = await db().from("site_content").upsert({ id: "landing", content: c });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(ui("Website updated"));
  };
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ui("Website")}</h1>
          <p className="text-sm text-muted-foreground">
            {ui("Edit the text shown on your public website.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {ui("View website")}
            </a>
          </Button>
          <Button
            variant="ghost"
            disabled={!isAdmin || uploading || saving}
            onClick={() => {
              setC(structuredClone(defaultContent));
              toast.info(ui("Original content restored — press Save to keep it."));
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {ui("Reset")}
          </Button>
          <Button onClick={save} disabled={!isAdmin || saving || uploading}>
            {saving ? ui("Saving…") : ui("Save changes")}
          </Button>
        </div>
      </div>
      {!isAdmin && (
        <p className="rounded-md border bg-muted p-3 text-sm">
          {ui("Only workspace owners and admins can change the website.")}
        </p>
      )}

      <fieldset disabled={!isAdmin || saving || uploading} className="space-y-5">
        <Section title={ui("Background slideshow")}>
          <SlideEditor
            slides={c.heroSlides}
            disabled={!isAdmin || saving}
            onBusyChange={setUploading}
            onChange={(slides) =>
              up((d) => {
                d.heroSlides = slides;
              })
            }
          />
        </Section>
        <Section title={ui("Intro")} text={ui("Top of the page.")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={ui("Name")}
              value={c.hero.name}
              onChange={(v) =>
                up((d) => {
                  d.hero.name = v;
                })
              }
            />
            <Field
              label={ui("Title")}
              value={c.hero.title}
              onChange={(v) =>
                up((d) => {
                  d.hero.title = v;
                })
              }
            />
            <Field
              label={ui("Availability line")}
              value={c.hero.availability}
              onChange={(v) =>
                up((d) => {
                  d.hero.availability = v;
                })
              }
            />
            <Field
              label={ui("Location")}
              value={c.hero.location}
              onChange={(v) =>
                up((d) => {
                  d.hero.location = v;
                })
              }
            />
          </div>
          <Field
            label={ui("Tagline")}
            value={c.hero.tagline}
            onChange={(v) =>
              up((d) => {
                d.hero.tagline = v;
              })
            }
          />
          <Field
            label={ui("Short text")}
            long
            value={c.hero.subtext}
            onChange={(v) =>
              up((d) => {
                d.hero.subtext = v;
              })
            }
          />
          <Field
            label={ui("Technology strip (comma separated)")}
            value={c.techStrip.join(", ")}
            onChange={(v) =>
              up((d) => {
                d.techStrip = list(v);
              })
            }
          />
        </Section>

        <Section title={ui("About")}>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field
              label={ui("Heading")}
              value={c.about.heading}
              onChange={(v) =>
                up((d) => {
                  d.about.heading = v;
                })
              }
            />
            <Field
              label={ui("Years of experience")}
              value={c.about.years}
              onChange={(v) =>
                up((d) => {
                  d.about.years = v;
                })
              }
            />
          </div>
          {c.about.paragraphs.map((p, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1">
                <Field
                  long
                  label={ui(`Paragraph ${i + 1}`)}
                  value={p}
                  onChange={(v) =>
                    up((d) => {
                      d.about.paragraphs[i] = v;
                    })
                  }
                />
              </div>
              <Del
                onClick={() =>
                  up((d) => {
                    d.about.paragraphs.splice(i, 1);
                  })
                }
              />
            </div>
          ))}
          <Add
            onClick={() =>
              up((d) => {
                d.about.paragraphs.push("");
              })
            }
          >
            {ui("Add paragraph")}
          </Add>
        </Section>

        <Section title={ui("Skills")} text={ui("Tools are comma separated.")}>
          {c.skills.map((s, i) => (
            <div key={i} className="flex gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-[180px_1fr]">
                <Field
                  label={ui("Group")}
                  value={s.title}
                  onChange={(v) =>
                    up((d) => {
                      d.skills[i]!.title = v;
                    })
                  }
                />
                <Field
                  label={ui("Tools")}
                  value={s.tools.join(", ")}
                  onChange={(v) =>
                    up((d) => {
                      d.skills[i]!.tools = list(v);
                    })
                  }
                />
              </div>
              <Del
                onClick={() =>
                  up((d) => {
                    d.skills.splice(i, 1);
                  })
                }
              />
            </div>
          ))}
          <Add
            onClick={() =>
              up((d) => {
                d.skills.push({ title: "", tools: [] });
              })
            }
          >
            {ui("Add skill group")}
          </Add>
        </Section>

        <Section title={ui("Services")}>
          {c.services.map((s, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Field
                  label={ui("Title")}
                  value={s.title}
                  onChange={(v) =>
                    up((d) => {
                      d.services[i]!.title = v;
                    })
                  }
                />
                <Field
                  long
                  label={ui("Text")}
                  value={s.text}
                  onChange={(v) =>
                    up((d) => {
                      d.services[i]!.text = v;
                    })
                  }
                />
              </div>
              <Del
                onClick={() =>
                  up((d) => {
                    d.services.splice(i, 1);
                  })
                }
              />
            </div>
          ))}
          <Add
            onClick={() =>
              up((d) => {
                d.services.push({ title: "", text: "" });
              })
            }
          >
            {ui("Add service")}
          </Add>
        </Section>

        <Section title={ui("Projects")} text={ui("Leave a link empty to hide its button.")}>
          {c.projects.map((p, i) => (
            <div key={i} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{p.name || "New project"}</p>
                <Del
                  onClick={() =>
                    up((d) => {
                      d.projects.splice(i, 1);
                    })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={ui("Name")}
                  value={p.name}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.name = v;
                    })
                  }
                />
                <Field
                  label={ui("Badge (e.g. Live application)")}
                  value={p.badge}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.badge = v;
                    })
                  }
                />
                <Field
                  label={ui("Website link")}
                  value={p.liveUrl}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.liveUrl = v;
                    })
                  }
                />
                <Field
                  label={ui("Website button text")}
                  value={p.liveLabel}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.liveLabel = v;
                    })
                  }
                />
                <Field
                  label={ui("Source code link")}
                  value={p.sourceUrl}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.sourceUrl = v;
                    })
                  }
                />
                <Field
                  label={ui("Tags")}
                  value={p.tags}
                  onChange={(v) =>
                    up((d) => {
                      d.projects[i]!.tags = v;
                    })
                  }
                />
              </div>
              <Field
                long
                label={ui("Description")}
                value={p.description}
                onChange={(v) =>
                  up((d) => {
                    d.projects[i]!.description = v;
                  })
                }
              />
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {ui("Picture style")}
                </span>
                <Select
                  value={p.preview}
                  onValueChange={(v) =>
                    up((d) => {
                      d.projects[i]!.preview = v as "password" | "handyman";
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">{ui("Security / vault")}</SelectItem>
                    <SelectItem value="handyman">{ui("Services / tools")}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          ))}
          <Add
            onClick={() =>
              up((d) => {
                d.projects.push({
                  name: "",
                  badge: "",
                  description: "",
                  tags: "",
                  liveUrl: "",
                  liveLabel: "Live site",
                  sourceUrl: "",
                  preview: "password",
                });
              })
            }
          >
            {ui("Add project")}
          </Add>
        </Section>

        <Section title={ui("Process")}>
          {c.steps.map((s, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Field
                  label={ui(`Step ${i + 1}`)}
                  value={s.title}
                  onChange={(v) =>
                    up((d) => {
                      d.steps[i]!.title = v;
                    })
                  }
                />
                <Field
                  long
                  label={ui("Text")}
                  value={s.text}
                  onChange={(v) =>
                    up((d) => {
                      d.steps[i]!.text = v;
                    })
                  }
                />
              </div>
              <Del
                onClick={() =>
                  up((d) => {
                    d.steps.splice(i, 1);
                  })
                }
              />
            </div>
          ))}
          <Add
            onClick={() =>
              up((d) => {
                d.steps.push({ title: "", text: "" });
              })
            }
          >
            {ui("Add step")}
          </Add>
        </Section>

        <Section title={ui("Contact & links")}>
          <Field
            label={ui("Heading")}
            value={c.contact.heading}
            onChange={(v) =>
              up((d) => {
                d.contact.heading = v;
              })
            }
          />
          <Field
            long
            label={ui("Text")}
            value={c.contact.text}
            onChange={(v) =>
              up((d) => {
                d.contact.text = v;
              })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={ui("Email")}
              value={c.contact.email}
              onChange={(v) =>
                up((d) => {
                  d.contact.email = v;
                })
              }
            />
            <Field
              label={ui("Work type")}
              value={c.contact.availability}
              onChange={(v) =>
                up((d) => {
                  d.contact.availability = v;
                })
              }
            />
            <Field
              label={ui("GitHub link")}
              value={c.socials.github}
              onChange={(v) =>
                up((d) => {
                  d.socials.github = v;
                })
              }
            />
            <Field
              label={ui("LinkedIn link")}
              value={c.socials.linkedin}
              onChange={(v) =>
                up((d) => {
                  d.socials.linkedin = v;
                })
              }
            />
          </div>
        </Section>
      </fieldset>
    </div>
  );
}
function Del({ onClick }: { onClick: () => void }) {
  const { t: ui } = useI18n();
  return (
    <Button type="button" size="icon" variant="ghost" aria-label={ui("Remove")} onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
function Add({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <Plus className="mr-1 h-4 w-4" />
      {children}
    </Button>
  );
}
