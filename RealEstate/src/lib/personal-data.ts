import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { estate, toListing, type ListingRow } from "./data";
import { z } from "zod";
import { webSearchInput } from "./web-search";

export type SavedSearch = {
  id: string;
  name: string;
  city: string | null;
  areas: string[];
  keywords: string[];
  min_price: number | null;
  max_price: number | null;
  property_type: string | null;
  move_in_date: string | null;
  alerts_enabled: boolean;
};
export type Profile = { full_name: string; preferred_city: string; max_budget: number | null };
export const searchInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    city: z.string().trim().max(120).nullable(),
    keywords: z.array(z.string().trim().min(2).max(120)).max(5).default([]),
    areas: z.array(z.string().trim().min(1).max(120)).max(30),
    min_price: z.number().min(0).max(99999999).nullable(),
    max_price: z.number().min(0).max(99999999).nullable(),
    property_type: z.string().max(60).nullable(),
    move_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  })
  .refine(
    (d) =>
      !d.keywords.length ||
      webSearchInput.safeParse({ location: d.city, keywords: d.keywords, page: 0 }).success,
    { message: "Web searches need a valid location and keyword lines." },
  )
  .refine((d) => d.min_price === null || d.max_price === null || d.min_price <= d.max_price, {
    message: "Minimum price cannot exceed maximum price",
  });
export const profileInput = z.object({
  full_name: z.string().trim().max(120),
  preferred_city: z.string().trim().min(1).max(120),
  max_budget: z.number().min(0).max(99999999).nullable(),
});

function usePersonalKeys(name: string) {
  const { user } = useAuth();
  return { user, key: ["realestate-private", user?.id, name] as const, cache: useQueryClient() };
}
function requireId(id: string | undefined) {
  if (!id) throw new Error("Please sign in first");
  return id;
}

export function useFavorites() {
  const { user, key, cache } = usePersonalKeys("favorites");
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await estate()
        .from("favorites")
        .select("listing_id, listings(*)")
        .eq("user_id", requireId(user?.id))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as unknown as { listing_id: string; listings: ListingRow | null }[]).flatMap(
        (r, i) => (r.listings ? [toListing(r.listings, i)] : []),
      );
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      const userId = requireId(user?.id);
      const result = saved
        ? await estate().from("favorites").delete().eq("user_id", userId).eq("listing_id", id)
        : await estate()
            .from("favorites")
            .upsert(
              { user_id: userId, listing_id: id },
              { onConflict: "user_id,listing_id", ignoreDuplicates: true },
            );
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  return { ...query, toggle };
}

export function useSavedSearches() {
  const { user, key, cache } = usePersonalKeys("searches");
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await estate()
        .from("saved_searches")
        .select("*")
        .eq("user_id", requireId(user?.id))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as SavedSearch[];
    },
  });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: z.input<typeof searchInput> }) => {
      const parsed = searchInput.parse(values);
      const userId = requireId(user?.id);
      const result = id
        ? await estate()
            .from("saved_searches")
            .update(parsed)
            .eq("id", id)
            .eq("user_id", userId)
            .select("id")
            .single()
        : await estate()
            .from("saved_searches")
            .insert({ ...parsed, user_id: userId, alerts_enabled: false })
            .select("id")
            .single();
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await estate()
        .from("saved_searches")
        .delete()
        .eq("id", id)
        .eq("user_id", requireId(user?.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  return { ...query, save, remove };
}

export function useProfile() {
  const { user, key, cache } = usePersonalKeys("profile");
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await estate()
        .from("profiles")
        .select("full_name,preferred_city,max_budget")
        .eq("user_id", requireId(user?.id))
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (
        (data as Profile | null) ?? { full_name: "", preferred_city: "Belgrade", max_budget: null }
      );
    },
  });
  const save = useMutation({
    mutationFn: async (values: Profile) => {
      const { data, error } = await estate()
        .from("profiles")
        .upsert({ ...profileInput.parse(values), user_id: requireId(user?.id) })
        .select("full_name,preferred_city,max_budget")
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
    onSuccess: (data) => cache.setQueryData(key, data),
  });
  return { ...query, save };
}

export function useAlerts() {
  const { user, key, cache } = usePersonalKeys("alerts");
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await estate()
        .from("alerts")
        .select("id,is_read,created_at,listings(title)")
        .eq("user_id", requireId(user?.id))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as unknown as {
        id: string;
        is_read: boolean;
        created_at: string;
        listings: { title: string } | null;
      }[];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await estate()
        .from("alerts")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", requireId(user?.id))
        .select("id")
        .single();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  return { ...query, markRead };
}
