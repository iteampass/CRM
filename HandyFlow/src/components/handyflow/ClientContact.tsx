import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ClientContact({ taskId, participant = false, counterpart = "Client" }: {
  taskId: string; participant?: boolean; counterpart?: "Client" | "Handyman";
}) {
  const { t: tr, locale } = useI18n();
  const [expanded, setExpanded] = useState(participant);
  const contact = useQuery({
    queryKey: [participant ? "request-participant-contact" : "request-client-contact", taskId],
    enabled: expanded,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(participant ? "get_request_participant_contact" : "get_request_client_contact", { _task_id: taskId });
      if (error) {
        if (error.code === "PGRST202") throw new Error("Contact details are not available yet. Please contact support.");
        throw new Error(error.message);
      }
      if (!data?.[0]) throw new Error("Contact details are unavailable.");
      return data[0];
    },
  });

  return (
    <section className="mt-5 rounded-xl border border-border p-4">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="text-sm font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        {`${expanded ? "Hide" : "View"} ${counterpart.toLowerCase()} contact details`}
      </button>
      {expanded && (
        <div className="mt-3 text-sm">
          {contact.isPending && <p role="status">{tr("Loading contact details…")}</p>}
          {contact.error && <div role="alert"><p>{contact.error.message}</p><button type="button" className="mt-2 text-brand underline" onClick={() => void contact.refetch()}>{tr("Try again")}</button></div>}
          {contact.data && !contact.error && (
            <dl className="grid gap-3 break-words">
              <div><dt className="text-muted-foreground">{counterpart}</dt><dd>{contact.data.name}</dd></div>
              <div><dt className="text-muted-foreground">{tr("Email")}</dt><dd>{contact.data.email ? <a className="text-brand underline" href={`mailto:${contact.data.email}`}>{contact.data.email}</a> : tr("Not provided")}</dd></div>
              <div><dt className="text-muted-foreground">{tr("Phone")}</dt><dd>{contact.data.phones?.filter(phone => phone.trim()).length ? contact.data.phones.filter(phone => phone.trim()).map(phone => <a key={phone} className="block text-brand underline" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>) : tr("Not provided")}</dd></div>
              <div><dt className="text-muted-foreground">{tr("Address")}</dt><dd>{contact.data.address || "Not provided"}</dd></div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
