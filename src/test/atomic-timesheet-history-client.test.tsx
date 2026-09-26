import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  tableReads: [] as string[], writes: [] as { table: string; kind: string; payload: unknown }[],
  failure: null as null | { message: string },
  historyReady: true,
}));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: "tenant-one" }) }));
vi.mock("@/lib/permission-guard", () => ({ assertPermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "manager-one" } }, error: null }) },
    rpc: async () => ({ data: m.historyReady, error: m.historyReady ? null : { message: "not installed" } }),
    from: (table: string) => {
      m.tableReads.push(table);
      if (table === "audit_log") throw new Error("Client must not write history separately");
      let kind = "";
      let payload: unknown;
      const result = () => ({ data: { id: "entry-one" }, error: m.failure });
      const q: any = {
        select: () => q, eq: () => q, in: () => q,
        single: async () => result(),
        update: (value: unknown) => { kind = "update"; payload = value; m.writes.push({ table, kind, payload }); return q; },
        insert: (value: unknown) => { kind = "insert"; payload = value; m.writes.push({ table, kind, payload }); return q; },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return q;
    },
  },
}));

import { useApproveTimeEntries, useManagerEditTimeEntry, useRejectTimeEntry } from "@/hooks/useTimeEntries";

const wrap = ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;

beforeEach(() => { m.tableReads = []; m.writes = []; m.failure = null; m.historyReady = true; });

describe("timesheet writes rely on transactional history", () => {
  it("sends flagged approval explanation with the row and makes no second audit request", async () => {
    const { result } = renderHook(() => useApproveTimeEntries(), { wrapper: wrap });
    await result.current.mutateAsync({ entryIds: ["entry-one"], mode: "approve_single", reviewReason: "Confirmed on site with supervisor" });
    expect(m.writes).toHaveLength(1);
    expect(m.writes[0]).toMatchObject({ table: "time_entries", kind: "update", payload: {
      status: "approved", approval_mode: "approve_single",
      approval_review_reason: "Confirmed on site with supervisor",
    } });
    expect(m.tableReads).not.toContain("audit_log");
  });

  it("reports a database failure instead of claiming a saved edit", async () => {
    m.failure = { message: "synthetic audit failure" };
    const { result } = renderHook(() => useManagerEditTimeEntry(), { wrapper: wrap });
    await expect(result.current.mutateAsync({ entryId: "entry-one", updates: { break_minutes: 30 }, reason: "Corrected break" }))
      .rejects.toMatchObject({ message: "synthetic audit failure" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(m.tableReads).not.toContain("audit_log");
  });

  it("does not write at all when the history trigger is unavailable", async () => {
    m.historyReady = false;
    const { result } = renderHook(() => useApproveTimeEntries(), { wrapper: wrap });
    await expect(result.current.mutateAsync({ entryIds: ["entry-one"] }))
      .rejects.toThrow("Secure timesheet history is not available yet. Nothing was changed.");
    expect(m.writes).toHaveLength(0);
  });

  it("rejects without a second audit request", async () => {
    const { result } = renderHook(() => useRejectTimeEntry(), { wrapper: wrap });
    await result.current.mutateAsync({ id: "entry-one", notes: "Insufficient evidence" });
    expect(m.writes).toHaveLength(1);
    expect(m.writes[0].payload).toMatchObject({ status: "rejected", notes: "Insufficient evidence" });
    expect(m.tableReads).not.toContain("audit_log");
  });
});
