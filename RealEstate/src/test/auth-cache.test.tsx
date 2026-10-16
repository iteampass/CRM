import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({
  notify: (_event: string, _session: { user: User } | null) => {},
  unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof auth.notify) => {
        auth.notify = callback;
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
      },
    },
  },
}));
import { AuthProvider, useAuth } from "@/lib/auth";
it("clears another account's cached data on account changes and sign-out", async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cache}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useAuth(), { wrapper });
  act(() => auth.notify("INITIAL_SESSION", { user: { id: "user-a" } as User }));
  await waitFor(() => expect(result.current.user?.id).toBe("user-a"));
  cache.setQueryData(["realestate-private", "user-a", "favorites"], ["private-a"]);
  cache.setQueryData(["realestate", "listings", false], ["public-listing"]);
  act(() => auth.notify("SIGNED_IN", { user: { id: "user-b" } as User }));
  await waitFor(() =>
    expect(cache.getQueryData(["realestate-private", "user-a", "favorites"])).toBeUndefined(),
  );
  expect(result.current.user?.id).toBe("user-b");
  cache.setQueryData(["realestate-private", "user-b", "profile"], { full_name: "private-b" });
  act(() => auth.notify("SIGNED_OUT", null));
  await waitFor(() =>
    expect(cache.getQueryData(["realestate-private", "user-b", "profile"])).toBeUndefined(),
  );
  expect(result.current.user).toBeNull();
  expect(cache.getQueryData(["realestate", "listings", false])).toEqual(["public-listing"]);
  unmount();
  expect(auth.unsubscribe).toHaveBeenCalled();
});
