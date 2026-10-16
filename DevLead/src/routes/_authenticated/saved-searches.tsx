import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/crm/ComingSoon";

export const Route = createFileRoute("/_authenticated/saved-searches")({
  head: () => ({ meta: [
    { title: "Saved Searches — DevLead CRM" },
    { name: "description", content: "Save lead-discovery criteria, re-run them and get alerts for new matches." },
    { property: "og:title", content: "Saved Searches — DevLead CRM" },
    { property: "og:description", content: "Save lead-discovery criteria, re-run them and get alerts for new matches." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <ComingSoon title="Saved Searches" phase={3} text="Save lead-discovery criteria, re-run them and get alerts for new matches." />,
});
