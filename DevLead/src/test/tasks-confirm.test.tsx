import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
let lastOp = "";

const chain: any = new Proxy(
  {},
  {
    get(_t, prop: string) {
      if (prop === "then") return (res: any) =>
        Promise.resolve(lastOp === "select"
          ? { data: [{ id: "t1", title: "Follow up", due_date: "2026-10-10", priority: "High", done: false, company_id: "c1", companies: { name: "Staffbase" } }], error: null }
          : { error: null }).then(res);
      if (prop === "select") return () => { lastOp = "select"; return chain; };
      if (prop === "update") return (patch: any) => { lastOp = "update"; update(patch); return chain; };
      return () => chain;
    },
  },
);

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ children }: any) => <a>{children}</a>,
}));

vi.mock("@/lib/mock-data", () => ({
  db: () => ({ from: () => chain }),
  workspace: { id: "w1" },
  leadForCompany: () => undefined,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const checkboxAt = (i: number) => { const el = screen.getAllByRole("checkbox")[i]; if (!el) throw new Error(`missing checkbox ${i}`); return el; };

describe("Task completion confirm popup", () => {
  beforeEach(() => {
    update.mockClear();
    lastOp = "";
  });
  afterEach(cleanup);

  const renderPage = async () => {
    const { Route } = await import("@/routes/_authenticated/tasks");
    const Page = (Route as any).options.component;
    render(<Page />);
    await screen.findByText("Follow up");
  };

  it("asks before completing, then completes on confirm", async () => {
    await renderPage();
    fireEvent.click(checkboxAt(1));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Mark this task as completed?");
    expect(dialog).toHaveTextContent("Follow up");
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    expect(update).toHaveBeenCalledWith({ done: true });
  });

  it("does nothing when cancelled", async () => {
    await renderPage();
    fireEvent.click(checkboxAt(1));
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("reopens instantly without asking", async () => {
    await renderPage();
    fireEvent.click(checkboxAt(1));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    await waitFor(() => expect(screen.queryByText("Follow up")).not.toBeInTheDocument());

    fireEvent.click(checkboxAt(0)); // Show completed
    await screen.findByText("Follow up");
    fireEvent.click(checkboxAt(1));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(update).toHaveBeenLastCalledWith({ done: false });
  });
});
