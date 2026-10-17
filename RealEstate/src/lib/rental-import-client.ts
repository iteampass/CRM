import { supabase } from "@/integrations/supabase/client";
export async function rentalAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again to continue.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}
