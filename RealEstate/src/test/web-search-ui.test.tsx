import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { WebRentalSearch } from "@/components/WebRentalSearch";
const mocks = vi.hoisted(() => ({
  user: { id: "user" } as { id: string } | null,
  search: vi.fn(),
  save: vi.fn(),
  session: vi.fn(),
  profile: undefined as { preferred_city: string } | undefined,
}));
vi.mock("@/lib/personal-data", () => ({
  useSavedSearches: () => ({ save: { mutate: mocks.save, isPending: false, isError: false } }),
  useProfile: () => ({ data: mocks.profile, isPending: !mocks.profile }),
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
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <WebRentalSearch />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "user" };
  mocks.profile = { preferred_city: "Valjevo" };
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

it("uses the preferred profile town for the query and external search links", async () => {
  mocks.search.mockResolvedValue({ results: [], warnings: [], more: false, configured: true });
  show();
  expect(screen.getByLabelText("City, town or region")).toHaveValue("Valjevo");
  expect(screen.getAllByText("Google")[0]).toHaveAttribute(
    "href",
    expect.stringContaining("Valjevo"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Find rentals" }));
  await waitFor(() => expect(mocks.search).toHaveBeenCalled());
  expect(mocks.search.mock.calls[0]![0].data.location).toBe("Valjevo");
});
it("adopts a profile loaded later without overwriting a manually entered town", () => {
  mocks.profile = undefined;
  const client = new QueryClient();
  const view = () => (
    <QueryClientProvider client={client}>
      <WebRentalSearch />
    </QueryClientProvider>
  );
  const { rerender } = render(view());
  expect(screen.getByLabelText("City, town or region")).toHaveValue("");
  mocks.profile = { preferred_city: "Valjevo" };
  rerender(view());
  expect(screen.getByLabelText("City, town or region")).toHaveValue("Valjevo");
  fireEvent.change(screen.getByLabelText("City, town or region"), {
    target: { value: "Novi Sad" },
  });
  mocks.profile = { preferred_city: "Nis" };
  rerender(view());
  expect(screen.getByLabelText("City, town or region")).toHaveValue("Novi Sad");
});

it("collapses and expands without losing search inputs", () => {
  show();
  fireEvent.change(screen.getByLabelText("City, town or region"), {
    target: { value: "Novi Sad" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Collapse search" }));
  expect(screen.getByLabelText("City, town or region")).not.toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Expand search" }));
  expect(screen.getByLabelText("City, town or region")).toHaveValue("Novi Sad");
});
it("saves the location and keyword lines without running a web search", () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Save search" }));
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      values: expect.objectContaining({
        city: "Valjevo",
        keywords: ["apartments for rent", "izdavanje stanova"],
      }),
    }),
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
  expect(mocks.search).not.toHaveBeenCalled();
});
it("restores saved search criteria instead of the profile default", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WebRentalSearch
        initialSearch={{
          location: "Novi Sad",
          keywords: ["pet friendly rent", "izdavanje stanova"],
        }}
      />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText("City, town or region")).toHaveValue("Novi Sad");
  expect(screen.getByLabelText("Keywords (one search per line, up to 5)")).toHaveValue(
    "pet friendly rent\nizdavanje stanova",
  );
  expect(mocks.search).not.toHaveBeenCalled();
});
it("offers Saved searches after a successful save and prevents duplicate clicks", () => {
  mocks.save.mockImplementation((_input, options) => options.onSuccess());
  show();
  fireEvent.click(screen.getByRole("button", { name: "Save search" }));
  expect(screen.getByText("Browse saved searches")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search saved" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("City, town or region"), { target: { value: "Nis" } });
  expect(screen.getByRole("button", { name: "Save search" })).toBeEnabled();
});
