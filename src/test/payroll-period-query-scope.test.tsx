import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePayrollEntries } from "@/hooks/usePayroll";
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: "company" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => { throw new Error("Unexpected database read"); }) } }));

describe("missing payroll period", () => {
  it("cannot inherit a cached all-company result when a comparison period is absent", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(["payroll_entries", "company", undefined], [{ id: "unrelated-period-entry" }]);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => usePayrollEntries(undefined, { enabled: false }), { wrapper });
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    unmount();
    client.clear();
  });
  it("retains intentional all-period report reads", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const rows = [{ id: "report-entry" }];
    client.setQueryData(["payroll_entries", "company", undefined], rows);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => usePayrollEntries(), { wrapper });
    expect(result.current.data).toEqual(rows);
    unmount();
    client.clear();
  });
});
