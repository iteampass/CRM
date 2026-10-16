import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  auth: vi.fn(),
  rpc: vi.fn(),
  roleError: null as { message: string } | null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.auth },
    schema: () => ({
      rpc: mocks.rpc,
      from: (table: string) => {
        const response = () =>
          table === "workspaces"
            ? { data: { name: "Workspace" }, error: null }
            : table === "workspace_members"
              ? { data: { role: "member" }, error: mocks.roleError }
              : { data: [], error: null };
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: (...args: unknown[]) => {
            mocks.eq(table, ...args);
            return chain;
          },
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          then: (resolve: (value: unknown) => void) => resolve(response()),
        };
        return chain;
      },
    }),
  },
}));
import { loadCrm, resetCrm, workspace } from "@/lib/mock-data";
beforeEach(() => {
  resetCrm();
  vi.clearAllMocks();
  mocks.roleError = null;
  mocks.auth.mockResolvedValue({ data: { user: { id: "member-user" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: "workspace-id", error: null });
});
it("uses the current user's role instead of the first workspace member", async () => {
  await loadCrm();
  expect(mocks.eq).toHaveBeenCalledWith("workspace_members", "user_id", "member-user");
  expect(workspace.role).toBe("member");
});
it("propagates membership errors instead of guessing a role", async () => {
  mocks.roleError = { message: "Membership unavailable" };
  await expect(loadCrm()).rejects.toEqual(mocks.roleError);
  expect(workspace.role).toBe("");
});
it("clears workspace privileges when resetting a session", async () => {
  await loadCrm();
  resetCrm();
  expect(workspace).toEqual({ id: "", name: "", role: "" });
});
