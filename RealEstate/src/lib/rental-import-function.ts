import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { importInput, publicWebUrl, type ImportedRental } from "./rental-import";

export const extractAndSaveRental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(importInput)
  .handler(async ({ data, context }) => {
    const db = (context.supabase as SupabaseClient).schema("realestate");
    const source_url = publicWebUrl(data.url)!;
    const { data: existing, error: readError } = await db
      .from("imported_rentals")
      .select("id,status")
      .eq("user_id", context.userId)
      .eq("source_url", source_url)
      .maybeSingle();
    if (readError) throw new Error("Imported apartments could not be loaded. Please try again.");
    if (existing && existing.status !== "failed")
      return { id: existing.id as string, status: existing.status as ImportedRental["status"] };
    const { checkSearchLimit } = await import("./social-search.server");
    checkSearchLimit(`rental-import:${context.userId}`);
    const { extractRental } = await import("./rental-import.server");
    const result = await extractRental({ ...data, url: source_url });
    const values = {
      ...result.fields,
      user_id: context.userId,
      source_url,
      status: result.status,
      error_message: result.error_message,
      raw_data: result.raw_data,
      updated_at: new Date().toISOString(),
    };
    // A unique per-user source URL makes repeat imports idempotent. Conditional
    // retries cannot replace a successful extraction from another request.
    if (existing) {
      const { error } = await db
        .from("imported_rentals")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", context.userId)
        .eq("status", "failed");
      if (error) throw new Error("Could not save the extracted apartment. Please try again.");
    } else {
      const { error } = await db
        .from("imported_rentals")
        .upsert(values, { onConflict: "user_id,source_url", ignoreDuplicates: true });
      if (error) throw new Error("Could not save the extracted apartment. Please try again.");
    }
    const { data: saved, error } = await db
      .from("imported_rentals")
      .select("id,status")
      .eq("user_id", context.userId)
      .eq("source_url", source_url)
      .single();
    if (error) throw new Error("Could not confirm the saved apartment. Please try again.");
    return { id: saved.id as string, status: saved.status as ImportedRental["status"] };
  });

const summaryColumns =
  "id,source_url,status,imported_at,updated_at,error_message,page_kind,title,location,street,address,floor,price,currency,price_period,price_raw,building_type,parking,advertiser_type,advertiser_name,date_announced,description,images,listing_links,notes";
export const listImportedRentals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ page: z.number().int().min(0).max(10000).default(0) }))
  .handler(async ({ data, context }) => {
    const {
      data: rows,
      error,
      count,
    } = await (context.supabase as SupabaseClient)
      .schema("realestate")
      .from("imported_rentals")
      .select(summaryColumns, { count: "exact" })
      .eq("user_id", context.userId)
      .order("imported_at", { ascending: false })
      .order("id")
      .range(data.page * 50, data.page * 50 + 49);
    if (error) throw new Error("Imported apartments could not be loaded. Please try again.");
    return { rows: (rows ?? []) as ImportedRental[], count: count ?? 0 };
  });
export const getRentalRawData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SupabaseClient)
      .schema("realestate")
      .from("imported_rentals")
      .select("raw_data")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .single();
    if (error) throw new Error("Raw data could not be loaded.");
    return JSON.stringify(row.raw_data, null, 2);
  });
