import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { listings as sampleListings, type Listing } from "@/lib/listings";
import apt1 from "@/assets/apt1.jpg";
import apt2 from "@/assets/apt2.jpg";
import apt3 from "@/assets/apt3.jpg";
import apt4 from "@/assets/apt4.jpg";

const fallbackImages = [apt1, apt2, apt3, apt4];

export type ListingRow = {
  id: string;
  title: string;
  area: string;
  price_eur: number;
  beds: number;
  baths: number;
  size_m2: number;
  furnished: boolean;
  image_url: string | null;
  source: string;
  found_at: string;
  score: number;
  risk: "low" | "medium" | "high";
  duplicate_count: number;
  map_x: number;
  map_y: number;
};

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function toListing(row: ListingRow, i: number): Listing {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    price: row.price_eur,
    beds: row.beds,
    baths: row.baths,
    size: row.size_m2,
    image: row.image_url || fallbackImages[i % fallbackImages.length] || apt1,
    source: row.source,
    foundAgo: timeAgo(row.found_at),
    score: row.score,
    risk: row.risk,
    duplicates: row.duplicate_count,
    furnished: row.furnished,
    x: row.map_x,
    y: row.map_y,
  };
}

export const demoMode = import.meta.env["VITE_DEMO_MODE"] === "true";
// The generated file currently covers public only; keep custom-schema access here.
export const estate = () => (supabase as SupabaseClient).schema("realestate");

export async function fetchListings(): Promise<Listing[]> {
  if (demoMode) return sampleListings;
  const { data, error } = await estate()
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("found_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ListingRow[]).map(toListing);
}

export function useListings() {
  return useQuery({ queryKey: ["realestate", "listings", demoMode], queryFn: fetchListings });
}
