import { z } from "zod";
import { canonicalUrl } from "./web-search";

// Only public web URLs; outbound retrieval goes through a fixed reader service,
// never to a user-selected host from our server network.
export function publicWebUrl(raw: string): string | null {
  const canonical = canonicalUrl(raw);
  if (!canonical) return null;
  const url = new URL(canonical);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    url.port ||
    !host.includes(".") ||
    host.includes(":") ||
    /^\d+(\.\d+){3}$/.test(host) ||
    /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host)
  )
    return null;
  return canonical;
}
export const importInput = z.object({
  url: z
    .string()
    .max(2000)
    .refine((value) => !!publicWebUrl(value), "Enter a public listing URL."),
  title: z.string().max(1000),
  description: z.string().max(10000),
  apifySnapshot: z
    .object({ payload: z.string().max(130000), signature: z.string().regex(/^[a-f0-9]{64}$/) })
    .optional(),
});
export type ImportInput = z.infer<typeof importInput>;
const field = z.string().max(2000).nullable();
export const apartmentExtraction = z.object({
  page_kind: z.enum(["listing", "directory", "unavailable", "other"]),
  title: field,
  location: field,
  street: field,
  address: field,
  floor: field,
  price: z.number().finite().nonnegative().nullable(),
  currency: z.string().max(12).nullable(),
  price_period: field,
  price_raw: field,
  building_type: field,
  parking: field,
  advertiser_type: z.enum(["agency", "owner", "unknown"]),
  advertiser_name: field,
  date_announced: field,
  description: z.string().max(16000).nullable(),
  images: z.array(z.object({ url: z.string().max(2000), caption: z.string().max(500) })).max(30),
  listing_links: z
    .array(z.object({ url: z.string().max(2000), title: z.string().max(500) }))
    .max(20),
  notes: z.array(z.string().max(1000)).max(20),
});
export type ApartmentExtraction = z.infer<typeof apartmentExtraction>;
export type ImportedRental = ApartmentExtraction & {
  id: string;
  source_url: string;
  status: "extracted" | "needs_review" | "failed";
  imported_at: string;
  updated_at: string;
  error_message: string | null;
};
export const emptyApartment: ApartmentExtraction = {
  page_kind: "unavailable",
  title: null,
  location: null,
  street: null,
  address: null,
  floor: null,
  price: null,
  currency: null,
  price_period: null,
  price_raw: null,
  building_type: null,
  parking: null,
  advertiser_type: "unknown",
  advertiser_name: null,
  date_announced: null,
  description: null,
  images: [],
  listing_links: [],
  notes: [],
};
export const importStatusLabels = {
  extracted: "Extracted · unverified",
  needs_review: "Not an individual listing",
  failed: "Extraction failed",
} as const;
