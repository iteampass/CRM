import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { ImportList } from "@/routes/imports";
import { emptyApartment } from "@/lib/rental-import";
const mocks = vi.hoisted(() => ({ list: vi.fn(), raw: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "user" } }),
  RequireUser: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PageHeader: () => null,
}));
vi.mock("@/components/ExtractRentalButton", () => ({
  ExtractRentalButton: () => <button>Retry extraction</button>,
}));
vi.mock("@/lib/rental-import-function", () => ({
  listImportedRentals: mocks.list,
  getRentalRawData: mocks.raw,
}));
vi.mock("@/lib/rental-import-client", () => ({
  rentalAuthHeaders: async () => ({ Authorization: "Bearer test-token" }),
}));
beforeEach(() => vi.clearAllMocks());
it("shows all structured fields, source images and lazily loaded escaped raw data", async () => {
  mocks.list.mockResolvedValue({
    rows: [
      {
        ...emptyApartment,
        id: "record",
        source_url: "https://www.4zida.rs/stan/123",
        title: "Valjevo apartment",
        page_kind: "listing",
        status: "extracted",
        location: "Valjevo",
        street: "Karadjordjeva",
        address: "Karadjordjeva 10",
        floor: "2",
        price: 400,
        currency: "EUR",
        price_period: "month",
        building_type: "Building",
        parking: "Included",
        advertiser_type: "owner",
        advertiser_name: "Owner name",
        date_announced: "03.10.2026",
        description: "Furnished apartment",
        images: [{ url: "https://images.4zida.rs/a.jpg", caption: "Living room" }],
        imported_at: "2026-10-17T10:00:00Z",
        updated_at: "2026-10-17T10:00:00Z",
        error_message: null,
      },
    ],
    count: 1,
  });
  mocks.raw.mockResolvedValue('{"content":"<script>untrusted</script>"}');
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ImportList />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Valjevo apartment")).toBeInTheDocument());
  expect(screen.getByText("400 EUR month")).toBeInTheDocument();
  expect(screen.getByText("Karadjordjeva · Karadjordjeva 10")).toBeInTheDocument();
  expect(screen.getByText("03.10.2026")).toBeInTheDocument();
  expect(mocks.raw).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "View details" }));
  expect(screen.getByText("Furnished apartment")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Living room" })).toHaveAttribute(
    "src",
    "https://images.4zida.rs/a.jpg",
  );
  fireEvent.click(screen.getByRole("button", { name: "Show raw data" }));
  await waitFor(() =>
    expect(screen.getByText('{"content":"<script>untrusted</script>"}')).toBeInTheDocument(),
  );
  expect(document.querySelector("script")).toBeNull();
  expect(mocks.raw).toHaveBeenCalledWith({
    data: { id: "record" },
    headers: { Authorization: "Bearer test-token" },
  });
});
