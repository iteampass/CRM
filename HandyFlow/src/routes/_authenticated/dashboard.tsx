import { useI18n } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HandyFlowApp } from "@/components/handyflow/HandyFlowApp";
import { getWorkspaceData } from "@/lib/handyflow.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Workspace — HandyFlow" },
      {
        name: "description",
        content:
          "Your HandyFlow workspace: live open requests, accepted client tasks, handyman crew and the weekly schedule.",
      },
      { property: "og:title", content: "Workspace — HandyFlow" },
      {
        property: "og:description",
        content: "Live requests, tasks, crew and schedule for your home services team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t: tr, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchWorkspace = useServerFn(getWorkspaceData);

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchWorkspace(),
  });

  async function handleSignOut() {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      await queryClient.cancelQueries();
      queryClient.clear();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error(tr("Couldn't sign you out. Please try again."));
    }
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">{tr("We couldn't load your workspace")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tr("We couldn’t retrieve your account’s requests. Try again or sign out and sign back in.")}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" className="primary-button" disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? tr("Retrying…") : tr("Try again")}
            </button>
            <button type="button" className="outline-button" onClick={() => void handleSignOut()}>{tr("Sign out")}</button>
          </div>
        </div>
      </div>
    );
  }

  return <HandyFlowApp data={data} onSignOut={handleSignOut} />;
}
