import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Row = Record<string, any>;
const m = vi.hoisted(() => ({
  userId: "u1" as string | null,
  tenantId: "t1" as string | null,
  employees: [] as Row[],
  entries: [] as Row[],
  employeeError: null as any,
  calls: [] as { table: string; filters: [string, any][] }[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const filters: [string, any][] = [];
      m.calls.push({ table, filters });
      const run = () => {
        if (table === "employees" && m.employeeError) return { data: null, error: m.employeeError };
        const src = table === "employees" ? m.employees : m.entries;
        return { data: src.filter(r => filters.every(([c, v]) => r[c] === v)), error: null };
      };
      const chain: any = {
        select: () => chain, order: () => chain, limit: () => chain,
        eq: (c: string, v: any) => { filters.push([c, v]); return chain; },
        maybeSingle: async () => { const r = run(); if (r.error) return r; if (r.data!.length > 1) return { data: null, error: { message: "multiple" } }; return { data: r.data![0] ?? null, error: null }; },
        then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
      };
      return chain;
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: m.userId ? { id: m.userId } : null }) }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: m.tenantId }) }));
vi.mock("@/lib/permission-guard", () => ({ assertPermission: vi.fn() }));

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useMyTimeEntries, useActiveClockIn, ActiveClockInConflictError } from "@/hooks/useTimeEntries";

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (c: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={c}>{children}</QueryClientProvider>;

beforeEach(() => {
  Object.assign(m, {
    userId: "u1", tenantId: "t1", employeeError: null, calls: [],
    employees: [
      { id: "e-t1", user_id: "u1", tenant_id: "t1", forename: "Ana", surname: "Test" },
      { id: "e-t2", user_id: "u1", tenant_id: "t2", forename: "Ana", surname: "Test" },
      { id: "e-other", user_id: "u2", tenant_id: "t1", forename: "Bo", surname: "Other" },
    ],
    entries: [
      { id: "own-t1", employee_id: "e-t1", tenant_id: "t1", status: "clocked_in" },
      { id: "own-t2", employee_id: "e-t2", tenant_id: "t2", status: "clocked_in" },
      { id: "staff-t1", employee_id: "e-other", tenant_id: "t1", status: "clocked_in" },
    ],
  });
});

describe("A02 current employee", () => {
  it("resolves within the active workspace only", async () => {
    const { result } = renderHook(() => useCurrentEmployee(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.employeeId).toBe("e-t1"));
    const q = m.calls.find(c => c.table === "employees")!;
    expect(q.filters).toEqual(expect.arrayContaining([["user_id", "u1"], ["tenant_id", "t1"]]));
  });
  it("a failed lookup is an error, not 'not linked'", async () => {
    m.employeeError = { message: "offline" };
    const { result } = renderHook(() => useCurrentEmployee(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isResolved).toBe(false);
  });
  it("a genuine missing link is resolved and not an error", async () => {
    m.employees = [];
    const { result } = renderHook(() => useCurrentEmployee(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.isLinked).toBe(false);
    expect(result.current.isError).toBe(false);
  });
  it("does not read before the workspace is resolved", async () => {
    m.tenantId = null;
    const { result } = renderHook(() => useCurrentEmployee(), { wrapper: wrap(client()) });
    await new Promise(r => setTimeout(r, 20));
    expect(m.calls.length).toBe(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLinked).toBe(false);
  });
});

describe("A02 personal time entries", () => {
  it("manager with their own record sees only their own open clock-in", async () => {
    const { result } = renderHook(() => useActiveClockIn(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("own-t1");
  });
  it("my entries are filtered to own employee and workspace", async () => {
    const { result } = renderHook(() => useMyTimeEntries(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.map((r: Row) => r.id)).toEqual(["own-t1"]);
  });
  it("switching workspace uses a separate cache entry and the other record", async () => {
    const c = client();
    const a = renderHook(() => useActiveClockIn(), { wrapper: wrap(c) });
    await waitFor(() => expect(a.result.current.data?.id).toBe("own-t1"));
    m.tenantId = "t2";
    const b = renderHook(() => useActiveClockIn(), { wrapper: wrap(c) });
    await waitFor(() => expect(b.result.current.data?.id).toBe("own-t2"));
    expect(c.getQueryData(["active_clock_in", "t1", "e-t1"])).toMatchObject({ id: "own-t1" });
  });
  it("two open clock-ins are reported as a conflict, not guessed", async () => {
    m.entries.push({ id: "own-t1-dup", employee_id: "e-t1", tenant_id: "t1", status: "clocked_in" });
    const { result } = renderHook(() => useActiveClockIn(), { wrapper: wrap(client()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ActiveClockInConflictError);
  });
  it("does not query time entries while the employee lookup is failing", async () => {
    m.employeeError = { message: "offline" };
    const { result } = renderHook(() => useMyTimeEntries(), { wrapper: wrap(client()) });
    await new Promise(r => setTimeout(r, 30));
    expect(m.calls.some(c => c.table === "time_entries")).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
