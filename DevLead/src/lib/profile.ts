import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { email: string; firstName: string; lastName: string; phone: string; jobTitle: string; avatarPath: string; avatarUrl: string };

const listeners = new Set<() => void>();
export const notifyProfileChanged = () => listeners.forEach((l) => l());

export async function fetchProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const m = (u.user_metadata ?? {}) as { avatar_path?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null; job_title?: string | null };
  const avatarPath = m.avatar_path ?? "";
  let avatarUrl = "";
  if (avatarPath) {
    const { data: s } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60 * 24);
    avatarUrl = s?.signedUrl ?? "";
  }
  return { email: u.email ?? "", firstName: m.first_name ?? "", lastName: m.last_name ?? "", phone: m.phone ?? "", jobTitle: m.job_title ?? "", avatarPath, avatarUrl };
}

export function useProfile() {
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => {
    const load = () => { fetchProfile().then(setP); };
    load();
    listeners.add(load);
    return () => { listeners.delete(load); };
  }, []);
  return p;
}
