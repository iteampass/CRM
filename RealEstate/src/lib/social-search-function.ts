import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { socialSearchInput } from "./social-search";

export const searchSocialRentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(socialSearchInput)
  .handler(async ({ data, context }) => {
    const { searchSocialSources, checkSearchLimit } = await import("./social-search.server");
    checkSearchLimit(context.userId);
    return searchSocialSources(data);
  });
