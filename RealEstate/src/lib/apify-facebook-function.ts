import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { webSearchInput } from "./web-search";
export const searchFacebookRentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(webSearchInput)
  .handler(async ({ data, context }) => {
    const { searchFacebook } = await import("./apify-facebook.server");
    return searchFacebook(data, context.userId);
  });
