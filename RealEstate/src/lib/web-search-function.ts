import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { webSearchInput } from "./web-search";

export const searchWebRentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(webSearchInput)
  .handler(async ({ data, context }) => {
    const { checkSearchLimit } = await import("./social-search.server");
    const { searchWeb } = await import("./web-search.server");
    checkSearchLimit(context.userId);
    return searchWeb(data);
  });
