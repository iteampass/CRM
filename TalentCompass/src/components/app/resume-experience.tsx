import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ParsedResume } from "@/lib/types";

export function ResumeExperience({ experience }: { experience: ParsedResume["experience"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const hasDetails = Boolean(experience.description?.trim());

  return (
    <div className="border-border grid gap-1 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {experience.role || "-"} {experience.company ? `· ${experience.company}` : ""}
          </p>
          <p className="text-muted-foreground text-xs">{experience.period}</p>
        </div>
        {hasDetails && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={`${expanded ? "Collapse" : "Expand"} details for ${experience.role || "experience"}${experience.company ? ` at ${experience.company}` : ""}`}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
          </Button>
        )}
      </div>
      {hasDetails && (
        <p id={detailsId} hidden={!expanded} className="text-muted-foreground mt-2 whitespace-pre-line text-sm leading-relaxed">
          {experience.description}
        </p>
      )}
    </div>
  );
}
