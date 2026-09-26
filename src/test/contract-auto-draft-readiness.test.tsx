import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useContractAutoDraft } from "@/hooks/useContractAutoDraft";
import { evaluateContractAutoDraft } from "@/lib/contract-auto-draft";
const state = vi.hoisted(() => ({ changes: {} as any, rtw: {} as any, record: {} as any, options: {} as any }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ tenantId: "company" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useStaffDetailChanges", () => ({
  useStaffDetailChanges: () => state.changes, useRightToWorkReview: () => state.rtw,
  isBankField: (field: string) => ["bank_account_no", "sort_code"].includes(field),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: any) => { state.options = options; return state.record; } }));
const query = (data: any) => ({ data, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
beforeEach(() => {
  state.changes = query([]); state.rtw = query({ rtw_status: "verified" });
  state.record = query({ emp: { forename: "Test", surname: "Person", start_date: "2026-10-01", hourly_rate: 15, department: "FOH" }, onb: { personal_info: { home_address: "Test address" } }, hasContract: false, verifiedBankChanges: [] });
});
describe("contract preparation readiness", () => {
  it("allows preparation only once checks have loaded", () => expect(renderHook(() => useContractAutoDraft("staff")).result.current.ready).toBe(true));
  it.each(["changes", "rtw", "record"] as const)("blocks a failed %s read despite cached data", key => {
    state[key].isError = true;
    expect(renderHook(() => useContractAutoDraft("staff")).result.current.ready).toBe(false);
  });
  it.each(["changes", "rtw", "record"] as const)("blocks during %s refresh", key => {
    state[key].isFetching = true;
    expect(renderHook(() => useContractAutoDraft("staff")).result.current.ready).toBe(false);
  });
  it("holds accepted bank changes until direct confirmation is recorded", () => {
    state.changes.data = [{ id: "bank", field_name: "sort_code", state: "accepted", needs_review: true }];
    const { result, rerender } = renderHook(() => useContractAutoDraft("staff"));
    expect(result.current.ready).toBe(false);
    state.record.data.verifiedBankChanges = ["bank"]; rerender();
    expect(result.current.ready).toBe(true);
  });
  it.each([null, "not_submitted", "requested", "expired"])("does not label %s right-to-work evidence approved", rtwStatus => expect(evaluateContractAutoDraft({ changes: [], rtwStatus }).ready).toBe(false));
  it("retries all dependencies", () => {
    renderHook(() => useContractAutoDraft("staff")).result.current.retry();
    expect(state.changes.refetch).toHaveBeenCalledOnce(); expect(state.rtw.refetch).toHaveBeenCalledOnce(); expect(state.record.refetch).toHaveBeenCalledOnce();
  });
});
