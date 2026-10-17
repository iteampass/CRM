import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { WebRentalSearch } from "@/components/WebRentalSearch";
const mocks = vi.hoisted(() => ({
  user: { id: "user" } as { id: string } | null,
  search: vi.fn(),
  session: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/web-search-function", () => ({ searchWebRentals: mocks.search }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.session } },
}));
function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WebRentalSearch />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "user" };
  mocks.session.mockResolvedValue({ data: { session: { access_token: "token" } } });
});
it("provides external searches to guests without calling the API", () => {
  mocks.user = null;
  show();
  expect(screen.getByText("Sign in to aggregate results")).toBeInTheDocument();
  expect(screen.getAllByText("Google")[0]).toHaveAttribute(
    "href",
    expect.stringContaining("Belgrade"),
  );
  expect(mocks.search).not.toHaveBeenCalled();
});
it("searches custom locations and merges subsequent pages", async () => {
  const item = {
    url: "https://example.com/1",
    title: "Rental flat",
    description: "Apartment",
    site: "example.com",
    keywords: ["rent"],
  };
  mocks.search
    .mockResolvedValueOnce({ results: [item], warnings: [], more: true, configured: true })
    .mockResolvedValueOnce({
      results: [item, { ...item, url: "https://example.com/2", title: "Another flat" }],
      warnings: [],
      more: false,
      configured: true,
    });
  show();
  fireEvent.change(screen.getByLabelText("City, town or region"), {
    target: { value: "Novi Sad" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find rentals" }));
  await waitFor(() => expect(screen.getByText("Rental flat")).toBeInTheDocument());
  expect(mocks.search.mock.calls[0]![0].data.location).toBe("Novi Sad");
  fireEvent.click(screen.getByRole("button", { name: "Load more results" }));
  await waitFor(() => expect(screen.getByText("Another flat")).toBeInTheDocument());
  expect(screen.getAllByText("Rental flat")).toHaveLength(1);
  expect(mocks.search.mock.calls[1]![0].data.page).toBe(1);
});
