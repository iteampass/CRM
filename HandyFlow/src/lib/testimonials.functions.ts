import { APP_SCHEMA } from "@/integrations/supabase/schema";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export interface PublicTestimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  rating: number;
  featured: boolean;
}

export interface AdminTestimonial extends PublicTestimonial {
  status: string;
  createdAt: string;
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database, typeof APP_SCHEMA>(process.env["SUPABASE_URL"]!, key, {
    db: { schema: APP_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public landing-page data: the switch state plus approved testimonials. */
export const getPublicTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ enabled: boolean; items: PublicTestimonial[]; signInTestimonial: PublicTestimonial | null }> => {
    const supabase = publicClient();
    const [settingRes, rowsRes] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "testimonials").maybeSingle(),
      supabase
        .from("testimonials")
        .select("id, quote, author_name, author_role, rating, featured")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    if (settingRes.error) throw settingRes.error;
    if (rowsRes.error) throw rowsRes.error;
    const value = (settingRes.data?.value ?? {}) as { enabled?: boolean; signInTestimonialId?: string };
    let signInTestimonial: PublicTestimonial | null = null;
    if (value.signInTestimonialId) {
      const { data: selected, error } = await supabase.from("testimonials")
        .select("id, quote, author_name, author_role, rating, featured")
        .eq("id", value.signInTestimonialId).eq("status", "approved").maybeSingle();
      if (error) throw error;
      if (selected) signInTestimonial = {
        id: selected.id, quote: selected.quote, name: selected.author_name,
        role: selected.author_role, rating: selected.rating, featured: selected.featured,
      };
    }
    return {
      signInTestimonial,
      enabled: value.enabled === true,
      items: (rowsRes.data ?? []).map((r) => ({
        id: r.id,
        quote: r.quote,
        name: r.author_name,
        role: r.author_role,
        rating: r.rating,
        featured: r.featured,
      })),
    };
  },
);

/** Anyone signed in can submit a testimonial; it starts as pending. */
export const submitTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { quote: string; role: string; rating: number; name?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const quote = data.quote.trim();
    if (quote.length < 20) throw new Error("Please write at least a couple of sentences.");
    const me = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("testimonials").insert({
      author_id: userId,
      author_name: (data.name?.trim() || me.data?.name || "HandyFlow user").slice(0, 80),
      author_role: data.role.trim().slice(0, 80),
      quote: quote.slice(0, 600),
      rating: Math.min(5, Math.max(1, Math.round(data.rating))),
    });
    if (error) throw error;
    return { ok: true };
  });

/** A user's own submissions, so they can see the review state. */
export const getMyTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTestimonial[]> => {
    const { data } = await context.supabase
      .from("testimonials")
      .select("id, quote, author_name, author_role, rating, featured, status, created_at")
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id,
      quote: r.quote,
      name: r.author_name,
      role: r.author_role,
      rating: r.rating,
      featured: r.featured,
      status: r.status,
      createdAt: r.created_at,
    }));
  });

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage testimonials.");
}

/** Admin: every testimonial plus the current on/off switch. */
export const getTestimonialAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ enabled: boolean; items: AdminTestimonial[]; signInTestimonialId: string | null }> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [settingRes, rowsRes] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "testimonials").maybeSingle(),
      supabase
        .from("testimonials")
        .select("id, quote, author_name, author_role, rating, featured, status, created_at")
        .order("created_at", { ascending: false }),
    ]);
    if (settingRes.error) throw settingRes.error;
    if (rowsRes.error) throw rowsRes.error;
    const value = (settingRes.data?.value ?? {}) as { enabled?: boolean; signInTestimonialId?: string };
    return {
      signInTestimonialId: value.signInTestimonialId ?? null,
      enabled: value.enabled === true,
      items: (rowsRes.data ?? []).map((r) => ({
        id: r.id,
        quote: r.quote,
        name: r.author_name,
        role: r.author_role,
        rating: r.rating,
        featured: r.featured,
        status: r.status,
        createdAt: r.created_at,
      })),
    };
  });

/** Admin: turn the public testimonials section on or off. */
export const setTestimonialsEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: settings, error: readError } = await supabase.from("site_settings").select("value").eq("key", "testimonials").maybeSingle();
    if (readError) throw readError;
    const value = (settings?.value ?? {}) as Record<string, import("@/integrations/supabase/types").Json | undefined>;
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "testimonials", value: { ...value, enabled: data.enabled } }, { onConflict: "key" });
    if (error) throw error;
    return { enabled: data.enabled };
  });

/** Admin: approve, reject or feature a submitted testimonial. */
export const updateTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status?: "pending" | "approved" | "rejected"; featured?: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: { status?: string; featured?: boolean } = {};
    if (data.status) patch.status = data.status;
    if (typeof data.featured === "boolean") patch.featured = data.featured;
    const { error } = await supabase.from("testimonials").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Admin: delete a testimonial for good. */
export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Select an approved real submission for the sign-in page, or hide the quote. */
export const selectSignInTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string | null }) => {
    if (input.id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Invalid testimonial");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.id) {
      const { data: item, error } = await supabase.from("testimonials").select("id").eq("id", data.id).eq("status", "approved").maybeSingle();
      if (error) throw error;
      if (!item) throw new Error("Approve this testimonial before showing it on sign-in.");
    }
    const { data: settings, error: readError } = await supabase.from("site_settings").select("value").eq("key", "testimonials").maybeSingle();
    if (readError) throw readError;
    const value = (settings?.value ?? {}) as Record<string, import("@/integrations/supabase/types").Json | undefined>;
    const { error } = await supabase.from("site_settings").upsert({ key: "testimonials", value: { ...value, signInTestimonialId: data.id } }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });
