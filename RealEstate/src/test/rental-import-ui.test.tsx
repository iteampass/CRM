import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { ExtractRentalButton } from "@/components/ExtractRentalButton";
const mocks = vi.hoisted(() => ({ extract: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "user" } }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/rental-import-function", () => ({ extractAndSaveRental: mocks.extract }));
vi.mock("@/lib/rental-import-client", () => ({
  rentalAuthHeaders: async () => ({ Authorization: "Bearer test-token" }),
}));
const item = { url: "https://www.4zida.rs/stan/123", title: "Flat", description: "Rent" };
function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExtractRentalButton item={item} />
    </QueryClientProvider>,
  );
}
beforeEach(() => vi.clearAllMocks());
it("extracts only on click, sends auth and exposes the saved-record view", async () => {
  mocks.extract.mockResolvedValue({ id: "record", status: "extracted" });
  show();
  expect(mocks.extract).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Extract with AI" }));
  await waitFor(() => expect(screen.getByText("View imported apartments")).toBeInTheDocument());
  expect(mocks.extract).toHaveBeenCalledWith({
    data: item,
    headers: { Authorization: "Bearer test-token" },
  });
  expect(screen.getByRole("button", { name: "Saved to imported apartments" })).toBeDisabled();
});
it("shows provider setup errors and allows retry", async () => {
  mocks.extract.mockRejectedValue(
    new Error("AI extraction is not connected. Configure OPENAI_API_KEY on the server."),
  );
  show();
  fireEvent.click(screen.getByRole("button", { name: "Extract with AI" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("OPENAI_API_KEY"));
  expect(screen.getByRole("button", { name: "Extract with AI" })).toBeEnabled();
});
it("distinguishes directory pages from extracted apartments", async () => {
  mocks.extract.mockResolvedValue({ id: "record", status: "needs_review" });
  show();
  fireEvent.click(screen.getByRole("button", { name: "Extract with AI" }));
  await waitFor(() =>
    expect(screen.getByText(/not an individual apartment listing/)).toBeInTheDocument(),
  );
});
