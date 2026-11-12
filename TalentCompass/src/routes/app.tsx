import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { WorkspaceOnboarding } from "@/components/app/workspace-onboarding";
import { RecruitmentProvider } from "@/data/store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <WorkspaceProvider>
      <AppGate />
    </WorkspaceProvider>
  );
}

function AppGate() {
  const { user, ready } = useAuth();
  const workspace = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready || user) return;
    let cancelled = false;
    // Double-check with Supabase: the profile can lag a fresh sign-in by a tick.
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && !data.session) void navigate({ to: "/auth", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center text-sm">
        {ready ? "Redirecting to sign in…" : "Loading your workspace…"}
      </div>
    );
  }

  if (!workspace.ready) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center text-sm">
        Loading your workspace…
      </div>
    );
  }

  if (!workspace.workspaceId) return <WorkspaceOnboarding />;
  if (workspace.accessError) return (
    <div className="mx-auto max-w-lg space-y-3 p-8" role="alert">
      <h1 className="text-lg font-semibold">Workspace access unavailable</h1>
      <p>{workspace.accessError}</p>
      <button type="button" className="underline" onClick={() => void workspace.refresh()}>Retry</button>
    </div>
  );

  return (
    <RecruitmentProvider>
      <Outlet />
    </RecruitmentProvider>
  );
}
