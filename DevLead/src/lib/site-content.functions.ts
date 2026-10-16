import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { mergeContent } from "./site-content";

// Public read of the landing content (anon SELECT policy). Falls back to defaults.
export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).schema("software").from("site_content").select("content").eq("id", "landing").maybeSingle();
    const content = mergeContent(data?.content);
    const paths = content.heroSlides.filter(slide => slide.path).map(slide => slide.path);
    if (paths.length) {
      const { data: signed } = await sb.storage.from("website-slides").createSignedUrls(paths, 86400);
      content.heroSlides = content.heroSlides.map(slide => {
        const image = signed?.find(item => item.path === slide.path && item.signedUrl);
        if (!slide.path) return slide;
        if (!image?.signedUrl) return null;
        return { ...slide, url: image.signedUrl.replace(url, import.meta.env["VITE_SUPABASE_URL"]) };
      }).filter((slide): slide is NonNullable<typeof slide> => slide !== null);
      if (!content.heroSlides.length) content.heroSlides = mergeContent(null).heroSlides;
    }
    return content;
  } catch {
    return mergeContent(null);
  }
});
