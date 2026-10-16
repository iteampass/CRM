import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./bits";

export function ComingSoon({ title, phase, text }: { title: string; phase: number; text: string }) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title={title} />
      <div className="card-surface flex flex-col items-center px-6 py-16 text-center">
        <span className="rounded-full bg-highlight/15 px-3 py-1 text-xs font-semibold text-highlight">Planned for Phase {phase}</span>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{text}</p>
        <Button asChild variant="outline" className="mt-5"><Link to="/leads">Go to leads</Link></Button>
      </div>
    </div>
  );
}
