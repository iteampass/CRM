import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Manual "Scan now" — only workspace owners/admins. */
export const scanJobBoardsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: isAdmin, error } = await (context.supabase as any).schema("software").rpc("is_admin", { _ws: data.workspaceId });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Only workspace owners and admins can run a scan.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runScan } = await import("./scan.server");
    return runScan(supabaseAdmin, data.workspaceId, "manual");
  });
