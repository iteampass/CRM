import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "user-a" } as { id: string } | null,
  schema: vi.fn(),
  eq: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { schema: mocks.schema } }));
import { useFavorites, searchInput, profileInput } from "@/lib/personal-data";
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "user-a" };
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: mocks.eq.mockReturnThis(),
    order: vi.fn(async () => ({ data: [], error: null })),
    upsert: mocks.upsert.mockResolvedValue({ error: null }),
    delete: mocks.remove.mockReturnThis(),
    then: (resolve: (value: unknown) => void) => resolve({ error: null }),
  };
  mocks.schema.mockReturnValue(chain);
});
describe("personal data", () => {
  it("saves favorites under the signed-in owner and refreshes the query", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(() => result.current.toggle.mutateAsync({ id: "listing-a", saved: false }));
    expect(mocks.upsert).toHaveBeenCalledWith(
      { user_id: "user-a", listing_id: "listing-a" },
      expect.anything(),
    );
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-a");
  });
  it("removes only the signed-in user's favorite", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(() => result.current.toggle.mutateAsync({ id: "listing-a", saved: true }));
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(mocks.eq).toHaveBeenCalledWith("listing_id", "listing-a");
  });
  it("does not fetch personal data when signed out and rejects writes", async () => {
    mocks.user = null;
    const { wrapper } = setup();
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    await act(async () => {
      await expect(
        result.current.toggle.mutateAsync({ id: "listing-a", saved: false }),
      ).rejects.toThrow("Please sign in");
    });
    expect(mocks.schema).not.toHaveBeenCalled();
  });
  it("rejects inverted price ranges and negative budgets", () => {
    expect(
      searchInput.safeParse({
        name: "Search",
        city: null,
        areas: [],
        min_price: 1000,
        max_price: 500,
        property_type: null,
        move_in_date: null,
      }).success,
    ).toBe(false);
    expect(
      profileInput.safeParse({ full_name: "Name", preferred_city: "Belgrade", max_budget: -1 })
        .success,
    ).toBe(false);
  });
});
