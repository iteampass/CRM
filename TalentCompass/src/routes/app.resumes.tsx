import { useWorkspace } from "@/lib/workspace";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/states";
import { ResumeExperience } from "@/components/app/resume-experience";
import { ResumeViewer } from "@/components/app/resume-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruitment } from "@/data/store";
import { STATUS_LABEL, type Candidate, type ParsedResume } from "@/lib/types";

const NEW_CANDIDATE = "__new__";

const displayName = (c: Candidate) =>
  `${c.firstName} ${c.lastName}`.trim() || c.email || "Unnamed candidate";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="label-caps">{label}</p>
      <p className="text-sm">{value || "-"}</p>
    </div>
  );
}

function ParsedFields({ parsed }: { parsed: ParsedResume }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Location" value={parsed.location} />
        <Field
          label="Years of experience"
          value={parsed.yearsOfExperience ? String(parsed.yearsOfExperience) : ""}
        />
        <Field label="Roles found" value={String(parsed.experience.length)} />
      </div>

      <div className="grid gap-1">
        <p className="label-caps">Summary</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{parsed.summary || "-"}</p>
      </div>

      <div className="grid gap-2">
        <p className="label-caps">Experience</p>
        {parsed.experience.length ? (
          parsed.experience.map((e, i) => (
            <ResumeExperience key={`${e.role}-${e.company}-${e.period}-${i}`} experience={e} />
          ))
        ) : (
          <p className="text-muted-foreground text-sm">-</p>
        )}
      </div>

      <div className="grid gap-2">
        <p className="label-caps">Education</p>
        {parsed.education.length ? (
          parsed.education.map((e, i) => (
            <div key={i} className="border-border grid gap-1 rounded-lg border p-3">
              <p className="text-sm font-medium">{e.degree || "-"}</p>
              <p className="text-muted-foreground text-xs">
                {[e.school, e.period].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">-</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <p className="label-caps">Skills</p>
          <p className="text-muted-foreground text-sm">{parsed.skills.join(", ") || "-"}</p>
        </div>
        <div className="grid gap-1">
          <p className="label-caps">Certifications</p>
          <p className="text-muted-foreground text-sm">
            {parsed.certifications.join(", ") || "-"}
          </p>
        </div>
        <div className="grid gap-1">
          <p className="label-caps">Languages</p>
          <p className="text-muted-foreground text-sm">
            {parsed.languages.map((l) => [l.name, l.level].filter(Boolean).join(" - ")).join(", ") ||
              "-"}
          </p>
        </div>
        <div className="grid gap-1">
          <p className="label-caps">Links</p>
          {parsed.links.length ? (
            <ul className="grid gap-1">
              {parsed.links.map((l, i) => (
                <li key={i} className="truncate text-sm">
                  <a className="text-primary hover:underline" href={l.url} target="_blank" rel="noreferrer">
                    {l.label || l.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">-</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/app/resumes")({
  head: () => ({
    meta: [
      { title: "Resumes - Talent Compass Recruitment Workspace" },
      {
        name: "description",
        content: "Upload resumes and review every field extracted from each document.",
      },
      { property: "og:title", content: "Resumes - Talent Compass Recruitment Workspace" },
      {
        property: "og:description",
        content: "Upload resumes and review every field extracted from each document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResumesPage,
});

function ResumesPage() {
  const { canCreateCandidate, canUploadCandidateResume, positionRoles } = useWorkspace();
  const {
    candidates,
    uploadResume,
    parseResume,
    createCandidateFromResume,
    getPosition,
  } = useRecruitment();

  const [candidateId, setCandidateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const withResume = useMemo(
    () =>
      candidates
        .filter((c) => c.resumeUrl || c.resumeText || c.parsedResumeData)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [candidates],
  );

  const selected = withResume.find((c) => c.id === selectedId) ?? withResume[0] ?? null;

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const id = candidateId || (await createCandidateFromResume());
      await uploadResume(id, file);
      await parseResume(id);
      setSelectedId(id);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Resume uploaded and extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not process the resume");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Resumes"
      subtitle={`${withResume.length} resume${withResume.length === 1 ? "" : "s"} on file`}
    >
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          {(canCreateCandidate || Object.values(positionRoles).includes("position_admin")) && <section className="panel grid gap-4 p-4">
            <div className="grid gap-1">
              <h2 className="text-sm font-semibold">Upload a resume</h2>
              <p className="text-muted-foreground text-xs">
                The document is stored as submitted and read automatically.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="up-candidate">Candidate</Label>
              <Select
                value={candidateId || (canCreateCandidate ? NEW_CANDIDATE : "")}
                onValueChange={(v) => setCandidateId(v === NEW_CANDIDATE ? "" : v)}
              >
                <SelectTrigger id="up-candidate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canCreateCandidate && <SelectItem value={NEW_CANDIDATE}>Create new from resume</SelectItem>}
                  {candidates.filter(canUploadCandidateResume)
                    .sort((a, b) => a.lastName.localeCompare(b.lastName))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {displayName(c)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="up-file">File</Label>
              <Input
                id="up-file"
                type="file"
                ref={fileRef}
                accept=".pdf,.doc,.docx,.txt,.rtf,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-muted-foreground text-xs">PDF, Word or text file up to 10 MB.</p>
            </div>
            <Button onClick={submit} disabled={busy || !file || (!candidateId ? !canCreateCandidate : !candidates.some((c) => c.id === candidateId && canUploadCandidateResume(c)))} size="sm">
              <Upload className="size-4" />
              {busy ? "Reading resume…" : "Upload & extract"}
            </Button>
          </section>}

          <section className="panel overflow-hidden">
            <p className="label-caps border-border border-b px-4 py-3">All resumes</p>
            {withResume.length ? (
              <ul className="max-h-[420px] overflow-auto">
                {withResume.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`hover:bg-muted/60 grid w-full gap-0.5 px-4 py-3 text-left transition-colors ${
                        selected?.id === c.id ? "bg-muted" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-medium">{displayName(c)}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {c.resumeMeta?.fileName ?? "Resume"} · {STATUS_LABEL[c.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <p className="text-muted-foreground text-sm">No resumes uploaded yet.</p>
              </div>
            )}
          </section>
        </div>

        <div className="grid content-start gap-5">
          {selected ? (
            <>
              <section className="panel grid gap-1 p-4">
                <h2 className="text-base font-semibold">{displayName(selected)}</h2>
                <p className="text-muted-foreground text-xs">
                  {[
                    selected.email,
                    selected.phone,
                    getPosition(selected.positionId)?.name,
                    STATUS_LABEL[selected.status],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </section>

              <section className="panel grid gap-4 p-4">
                <p className="label-caps">Extracted fields</p>
                {selected.parsedResumeData ? (
                  <ParsedFields parsed={selected.parsedResumeData} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nothing has been extracted from this resume yet.
                  </p>
                )}
              </section>

              <ResumeViewer candidate={selected} />
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="No resume selected"
              description="Upload a resume on the left to see every extracted field here."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
