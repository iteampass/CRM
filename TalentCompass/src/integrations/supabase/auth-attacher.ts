import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "./client";

/** Attaches the current Supabase access token to every server function call. */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return next({
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });
  },
);
