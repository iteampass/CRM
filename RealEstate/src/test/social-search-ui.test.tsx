import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { SocialRentalSearch } from "@/components/SocialRentalSearch";
const mocks = vi.hoisted(() => ({
  user: { id: "user" } as { id: string } | null,
  search: vi.fn(),
  session: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/social-search-function", () => ({ searchSocialRentals: mocks.search }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.session } },
}));
function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SocialRentalSearch />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "user" };
  mocks.session.mockResolvedValue({ data: { session: { access_token: "session-token" } } });
});
it("requires sign-in before exposing the search form", () => {
  mocks.user = null;
  show();
  expect(screen.getByText("Sign in to search social sources")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Search rental posts" })).not.toBeInTheDocument();
  expect(mocks.search).not.toHaveBeenCalled();
});
it("submits on demand with auth and shows partial results with source errors", async () => {
  mocks.search.mockResolvedValue([
    {
      source: "reddit",
      status: "ok",
      posts: [
        {
          id: "reddit:abc",
          source: "reddit",
          title: "Apartment",
          text: "For rent",
          author: "owner",
          url: "https://www.reddit.com/comments/abc",
          publishedAt: "2026-10-17T10:00:00Z",
        },
      ],
    },
    {
      source: "x",
      status: "error",
      message: "Search rate limit reached. Please try again later.",
      posts: [],
    },
  ]);
  show();
  expect(mocks.search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Search rental posts" }));
  await waitFor(() => expect(screen.getByText("Apartment")).toBeInTheDocument());
  expect(mocks.search).toHaveBeenCalledWith({
    data: { location: "Belgrade", source: "all", subreddit: "" },
    headers: { Authorization: "Bearer session-token" },
  });
  expect(screen.getByText(/X.com: Search rate limit/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View original post" })).toHaveAttribute(
    "href",
    "https://www.reddit.com/comments/abc",
  );
});
