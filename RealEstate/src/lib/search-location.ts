import { useState } from "react";
import { useAuth } from "./auth";
import { useProfile } from "./personal-data";

/** Follow the profile until the user explicitly edits this search's location. */
export function useSearchLocation() {
  const { user } = useAuth();
  const profile = useProfile();
  const userId = user?.id ?? null;
  const preferredCity = user
    ? profile.data?.preferred_city.trim() || (profile.isPending ? "" : "Belgrade")
    : "Belgrade";
  const [draft, setDraft] = useState<{ userId: string | null; value: string } | null>(null);
  return {
    location: draft && draft.userId === userId ? draft.value : preferredCity,
    setLocation: (value: string) => setDraft({ userId, value }),
    preferredCity,
  };
}
