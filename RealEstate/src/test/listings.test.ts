import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ schema: vi.fn(), result: { data: [] as unknown[], error: null as { message: string } | null }, eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { schema: mocks.schema } }));
import { fetchListings } from "@/lib/data";
beforeEach(() => {
  mocks.result = { data: [], error: null };
  const chain = { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: mocks.eq.mockReturnThis(), order: vi.fn(async () => mocks.result) };
  mocks.schema.mockReturnValue(chain);
});
describe("live listing feed", () => {
  it("keeps empty inventory empty instead of inventing sample listings", async () => {
    expect(await fetchListings()).toEqual([]);
    expect(mocks.schema).toHaveBeenCalledWith("realestate");
    expect(mocks.eq).toHaveBeenCalledWith("status", "active");
  });
  it("surfaces database errors", async () => {
    mocks.result.error = { message: "Schema is not exposed" };
    await expect(fetchListings()).rejects.toThrow("Schema is not exposed");
  });
  it("maps a live listing", async () => {
    mocks.result.data = [{ id: "listing-id", title: "Live rental", area: "Center", price_eur: 500, beds: 1, baths: 1, size_m2: 40, furnished: true, image_url: "https://example.com/photo.jpg", source: "Portal", found_at: new Date().toISOString(), score: 0, risk: "low", duplicate_count: 0, map_x: 10, map_y: 20 }];
    expect(await fetchListings()).toEqual([expect.objectContaining({ id: "listing-id", title: "Live rental", price: 500 })]);
  });
});
