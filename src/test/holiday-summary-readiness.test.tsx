import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHolidayYearSummary } from "@/hooks/useHolidayYearSummary";
const state = vi.hoisted(() => ({ ledger: {} as any, payments: {} as any, pending: {} as any }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: "company" }) }));
vi.mock("@/hooks/useHolidayLedger", () => ({ useHolidayLedger: () => state.ledger }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({ useQuery: ({ queryKey }: any) => queryKey[0] === "holiday_payments_year_total" ? state.payments : state.pending }));
const result = (data: any[]) => ({ data, isFetching: false, isError: false, refetch: vi.fn() });
beforeEach(() => {
  state.ledger = result([{ entry_type: "accrual", hours: 20 }, { entry_type: "holiday_taken", hours: -4 }]);
  state.payments = result([{ total: 50 }]);
  state.pending = result([{ holiday_accrued_hours: 3, payroll_periods: { period_name: "May", status: "draft" } }]);
});
describe("holiday payment balance readiness", () => {
  it("uses complete ledger, payment and pending accrual data", () => {
    const { result } = renderHook(() => useHolidayYearSummary("staff", 2026));
    expect(result.current.summary).toMatchObject({ availableHours: 16, availableIncludingPendingHours: 19, paidAmount: 50 });
  });
  it.each(["ledger", "payments", "pending"] as const)("withholds the balance if %s fails despite stale data", key => {
    state[key].isError = true;
    const { result } = renderHook(() => useHolidayYearSummary("staff", 2026));
    expect(result.current.summary).toBeNull();
    expect(result.current.isError).toBe(true);
  });
  it.each(["ledger", "payments", "pending"] as const)("withholds the balance while %s is refreshing", key => {
    state[key].isFetching = true;
    const { result } = renderHook(() => useHolidayYearSummary("staff", 2026));
    expect(result.current.summary).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
  it("retries all sources together", () => {
    const { result } = renderHook(() => useHolidayYearSummary("staff", 2026));
    result.current.refetch();
    for (const query of Object.values(state)) expect(query.refetch).toHaveBeenCalledOnce();
  });
});
