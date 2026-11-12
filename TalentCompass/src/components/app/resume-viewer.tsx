import { Download, FileText, Minus, Plus, Printer, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/lib/types";

export function ResumeViewer({ candidate }: { candidate: Candidate }) {
  const [zoom, setZoom] = useState(100);

  if (!candidate.resumeText || !candidate.resumeMeta) {
    return (
      <EmptyState
        icon={Upload}
        title="No resume uploaded"
        description="This candidate applied without attaching a CV. Request one before moving them to screening."
        action={
          <Button size="sm" variant="outline" onClick={() => toast.info("Resume upload coming with the file storage phase")}>
            <Upload className="size-3.5" />
            Request resume
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="panel overflow-hidden">
        <div className="bg-surface-muted border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-2">
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{candidate.resumeMeta.fileName}</span>
            <span className="hidden shrink-0 sm:inline">
              · {candidate.resumeMeta.pages} pages · {candidate.resumeMeta.sizeKb.toFixed(2)} KB
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setZoom((z) => Math.max(80, z - 10))}
              aria-label="Zoom out"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setZoom((z) => Math.min(140, z + 10))}
              aria-label="Zoom in"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => toast.info("Printing is available once file storage is connected")}
              aria-label="Print resume"
            >
              <Printer className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => toast.info("Download is available once file storage is connected")}
              aria-label="Download resume"
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="bg-surface-muted max-h-[560px] overflow-auto p-4 sm:p-6">
          <div
            className="bg-surface border-border mx-auto max-w-2xl rounded-lg border p-6 shadow-panel sm:p-8"
            style={{ fontSize: `${zoom / 100}rem` }}
          >
            <pre className="text-foreground/90 font-sans text-[0.78em] leading-relaxed whitespace-pre-wrap">
              {candidate.resumeText}
            </pre>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        This is the original document as submitted. Parsed fields are kept separately on the
        Parsed data tab.
      </p>
    </div>
  );
}
