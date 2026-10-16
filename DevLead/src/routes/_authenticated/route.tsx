import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadCrm } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    await loadCrm();
    return { user: data.user };
  },
  pendingComponent: () => <div className="p-10 text-sm text-muted-foreground">Loading your workspace…</div>,
  errorComponent: ({ error }) => <div className="space-y-4 p-10"><h1 className="text-xl font-semibold">Workspace access</h1><p role="alert">{error instanceof Error ? error.message : "Could not load your workspace."}</p><p>Ask your workspace administrator for an invitation if you need access.</p><div className="flex gap-4"><Link to="/">Return to website</Link><button onClick={async () => { await supabase.auth.signOut(); window.location.assign("/auth"); }}>Sign out</button></div></div>,
  component: () => <Outlet />,
});
