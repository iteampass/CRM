import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { validateSession } from "@/lib/validate-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await validateSession(supabase);
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },

  component: () => <Outlet />,
});
