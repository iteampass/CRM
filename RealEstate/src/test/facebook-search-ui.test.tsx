import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { FacebookRentalSearch } from "@/components/FacebookRentalSearch";
const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/apify-facebook-function", () => ({ searchFacebookRentals: mocks.search }));
vi.mock("@/lib/rental-import-client", () => ({
  rentalAuthHeaders: async () => ({ Authorization: "Bearer user-token" }),
}));
it("runs Facebook search only on click with the current criteria and returns results", async () => {
  const onResults = vi.fn();
  const onBusy = vi.fn();
  const result = { results: [], warnings: [], configured: true, more: false };
  mocks.search.mockResolvedValue(result);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FacebookRentalSearch
        location="Valjevo"
        keywords={"izdavanje stanova\nparking"}
        disabled={false}
        onResults={onResults}
        onBusy={onBusy}
      />
    </QueryClientProvider>,
  );
  expect(mocks.search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Search Facebook (Apify)" }));
  await waitFor(() => expect(onResults).toHaveBeenCalled());
  expect(mocks.search).toHaveBeenCalledWith({
    data: { location: "Valjevo", keywords: ["izdavanje stanova", "parking"], page: 0 },
    headers: { Authorization: "Bearer user-token" },
  });
  expect(onBusy).toHaveBeenCalledWith(true);
  expect(onBusy).toHaveBeenCalledWith(false);
});
