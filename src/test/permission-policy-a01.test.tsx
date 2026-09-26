import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { decidePermission } from "@/lib/permission-policy";

const m = vi.hoisted(() => ({
  roles: [] as any, rolesError: null as any,
  platform: null as any,
  perms: [] as any, permsError: null as any,
  tenantId: "t1" as string | null, role: "manager" as string | null, authLoading: false,
  permCalls: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (table: string) => {
      if (table === "user_roles") return { select: () => ({ eq: async () => ({ data: m.roles, error: m.rolesError }) }) };
      if (table === "platform_admins") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.platform, error: null }) }) }) };
      const chain: any = {
        select: () => chain,
        eq: (_c: string, v: string) => { m.permCalls.push(v); return chain; },
        in: () => chain,
        then: (res: any, rej: any) => Promise.resolve({ data: m.perms, error: m.permsError }).then(res, rej),
      };
      return chain;
    },
  },
}));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: m.tenantId, isPlatformAdmin: false }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ role: m.role, loading: m.authLoading, user: { id: "u1" } }) }));

import { assertPermission } from "@/lib/permission-guard";
import { usePermissionDecision } from "@/hooks/useRolePermissions";

beforeEach(() => {
  Object.assign(m, { roles: [{ role: "manager" }], rolesError: null, platform: null, perms: [], permsError: null, tenantId: "t1", role: "manager", authLoading: false, permCalls: [] });
});

describe("A01 shared policy", () => {
  const base = { roles: ["manager"], key: "approve_timesheets" };
  it("explicit false beats an allowing default", () => {
    expect(decidePermission({ ...base, overrides: { manager: { approve_timesheets: false } } })).toBe("denied");
  });
  it("explicit true grants beyond defaults", () => {
    expect(decidePermission({ ...base, key: "view_pay_data", overrides: { manager: { view_pay_data: true } } })).toBe("allowed");
  });
  it("absent override uses the role default", () => {
    expect(decidePermission({ ...base, overrides: {} })).toBe("allowed");
    expect(decidePermission({ ...base, key: "view_pay_data", overrides: {} })).toBe("denied");
  });
  it("failed or missing overrides are unresolved, not defaults", () => {
    expect(decidePermission({ ...base, overrides: undefined })).toBe("unresolved");
    expect(decidePermission({ ...base, overrides: {}, overridesFailed: true })).toBe("unresolved");
    expect(decidePermission({ roles: null, key: "view_schedules", overrides: {} })).toBe("unresolved");
  });
  it("unknown roles are denied", () => {
    expect(decidePermission({ roles: ["intruder"], key: "view_schedules", overrides: {} })).toBe("denied");
  });
  it("multiple roles: an explicit deny only affects its own role", () => {
    expect(decidePermission({ roles: ["manager", "supervisor"], key: "view_employees", overrides: { manager: { view_employees: false } } })).toBe("allowed");
    expect(decidePermission({ roles: ["manager", "supervisor"], key: "approve_holidays", overrides: { manager: { approve_holidays: false } } })).toBe("denied");
  });
  it("admin policy unchanged, even with a stored false", () => {
    expect(decidePermission({ roles: ["admin"], key: "view_pay_data", overrides: { admin: { view_pay_data: false } } })).toBe("allowed");
    expect(decidePermission({ roles: ["admin"], key: "view_pay_data", overrides: undefined, overridesFailed: true })).toBe("allowed");
  });
});

describe("A01 assertPermission", () => {
  it("refuses when the stored override is false", async () => {
    m.perms = [{ role: "manager", permission_key: "approve_timesheets", granted: false }];
    await expect(assertPermission("approve_timesheets", "t1")).rejects.toThrow(/Permission denied/);
  });
  it("allows via default when no override exists", async () => {
    await expect(assertPermission("approve_timesheets", "t1")).resolves.toBeUndefined();
  });
  it("refuses (does not fall back) when the permission read fails", async () => {
    m.permsError = { message: "offline" };
    await expect(assertPermission("approve_timesheets", "t1")).rejects.toThrow(/could not check/i);
  });
  it("refuses when the role read fails", async () => {
    m.rolesError = { message: "offline" };
    await expect(assertPermission("approve_timesheets", "t1")).rejects.toThrow(/could not check/i);
  });
  it("refuses unknown roles and missing workspace", async () => {
    m.roles = [{ role: "intruder" }];
    await expect(assertPermission("view_schedules", "t1")).rejects.toThrow(/Permission denied/);
    m.roles = [{ role: "manager" }];
    await expect(assertPermission("view_schedules", null)).rejects.toThrow(/no workspace/);
  });
  it("admin still passes", async () => {
    m.roles = [{ role: "admin" }]; m.permsError = { message: "x" };
    await expect(assertPermission("view_pay_data", "t1")).resolves.toBeUndefined();
  });
});

describe("A01 usePermissionDecision", () => {
  const wrap = (client: QueryClient) => ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it("is unresolved while loading, then applies the explicit deny", async () => {
    m.perms = [{ role: "manager", permission_key: "approve_timesheets", granted: false }];
    const { result } = renderHook(() => usePermissionDecision("approve_timesheets"), { wrapper: wrap(client()) });
    expect(result.current).toBe("unresolved");
    await waitFor(() => expect(result.current).toBe("denied"));
  });
  it("stays unresolved (no default grant) when the read fails", async () => {
    m.permsError = { message: "offline" };
    const { result } = renderHook(() => usePermissionDecision("view_employees"), { wrapper: wrap(client()) });
    await new Promise(r => setTimeout(r, 30));
    expect(result.current).toBe("unresolved");
  });
  it("is unresolved while auth is loading and with no workspace", () => {
    m.authLoading = true;
    const a = renderHook(() => usePermissionDecision("view_schedules"), { wrapper: wrap(client()) });
    expect(a.result.current).toBe("unresolved");
    m.authLoading = false; m.tenantId = null;
    const b = renderHook(() => usePermissionDecision("view_schedules"), { wrapper: wrap(client()) });
    expect(b.result.current).toBe("unresolved");
  });
  it("does not reuse another workspace's cached overrides", async () => {
    const c = client();
    c.setQueryData(["role_permissions", "t1", "overrides"], { manager: { approve_timesheets: true } });
    m.tenantId = "t2";
    m.perms = [{ role: "manager", permission_key: "approve_timesheets", granted: false }];
    const { result } = renderHook(() => usePermissionDecision("approve_timesheets"), { wrapper: wrap(c) });
    expect(result.current).toBe("unresolved");
    await waitFor(() => expect(result.current).toBe("denied"));
    expect(m.permCalls).toContain("t2");
  });
  it("stale cached data with a failed refresh is unresolved", async () => {
    const c = client();
    m.permsError = { message: "offline" };
    const { result } = renderHook(() => usePermissionDecision("view_employees"), { wrapper: wrap(c) });
    c.setQueryData(["role_permissions", "t1", "overrides"], {});
    await c.refetchQueries({ queryKey: ["role_permissions", "t1", "overrides"] }).catch(() => {});
    await waitFor(() => expect(result.current).toBe("unresolved"));
  });
});
