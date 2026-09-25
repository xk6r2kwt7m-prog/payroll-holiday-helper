import { describe, it, expect, vi } from "vitest";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { payrollDataBlock } from "@/lib/payroll-data-readiness";
import { addComputedCarryOver } from "@/lib/holiday-carry-over";

describe("complete financial reads", () => {
  it("loads more than the API's 1,000-row default without gaps", async () => {
    const records = Array.from({ length: 2501 }, (_, id) => ({ id }));
    const page = vi.fn(async (from: number, to: number) => ({ data: records.slice(from, to + 1), error: null }));
    expect(await fetchAllRows(page)).toEqual(records);
    expect(page.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("checks the next page when the last populated page is full", async () => {
    const page = vi.fn().mockResolvedValueOnce({ data: [1, 2], error: null }).mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchAllRows(page, 2)).toEqual([1, 2]);
    expect(page).toHaveBeenCalledTimes(2);
  });
  it("never returns a partial total if a later page fails", async () => {
    const page = vi.fn().mockResolvedValueOnce({ data: [1, 2], error: null }).mockResolvedValueOnce({ data: null, error: { message: "Connection lost" } });
    await expect(fetchAllRows(page, 2)).rejects.toThrow("Connection lost");
  });
  it("distinguishes an empty result from absent data", async () => {
    expect(await fetchAllRows(async () => ({ data: [], error: null }))).toEqual([]);
    await expect(fetchAllRows(async () => ({ data: null, error: null }))).rejects.toThrow("no data");
  });
  it.each([0, -1, 1.5, NaN])("refuses invalid page size %s", async size => {
    await expect(fetchAllRows(vi.fn(), size)).rejects.toThrow("Invalid page size");
  });
});

describe("payroll safety data", () => {
  it("blocks failed checks even while another check is loading", () => {
    expect(payrollDataBlock([{ label: "terms", isError: true }, { label: "history", isLoading: true }])).toContain("Could not load terms");
  });
  it("blocks a pending safety check", () => {
    expect(payrollDataBlock([{ label: "holiday payments", isLoading: true }])).toContain("Please wait");
  });
  it("allows completed successful checks", () => {
    expect(payrollDataBlock([{ label: "terms", isError: false, isLoading: false }])).toBeNull();
  });
});

const current = { employeeId: "staff-1", hoursAccrued: 12, hoursTaken: 3, hoursCarriedOver: 0, balance: 9 };
describe("recorded holiday carry-over", () => {
  it("preserves an explicit zero instead of reviving last year's balance", () => {
    expect(addComputedCarryOver([current], [{ ...current, balance: 40 }], [{ employee_id: "staff-1" }])).toEqual([current]);
  });
  it("does not add prior balance again to recorded positive carry-over", () => {
    const recorded = { ...current, hoursCarriedOver: 5, balance: 14 };
    expect(addComputedCarryOver([recorded], [{ ...current, balance: 40 }], [{ employee_id: "staff-1" }])).toEqual([recorded]);
  });
  it("preserves the legacy fallback only for staff without a recorded balance", () => {
    expect(addComputedCarryOver([current], [{ ...current, balance: 4 }], [])[0]).toMatchObject({ hoursCarriedOver: 4, balance: 13 });
    expect(current.balance).toBe(9);
  });
  it("does not carry a negative balance or another employee's balance", () => {
    expect(addComputedCarryOver([current], [{ ...current, balance: -5 }, { ...current, employeeId: "other", balance: 40 }], [])).toEqual([current]);
  });
});
