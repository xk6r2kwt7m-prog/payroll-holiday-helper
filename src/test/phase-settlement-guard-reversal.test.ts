import { describe, it, expect } from "vitest";
import {
  findBlockingSettlement,
  isSettlementReversed,
  describeBlockingSettlement,
} from "@/lib/leaver-settlement-guard";

const payment = {
  id: "pay-1",
  payroll_period_id: "per-1",
  hours: 40.16,
  holiday_taken_date: "2026-07-27",
  leave_year_start: "2026-01-01",
  notes: "Leaver settlement — full holiday balance payout",
};

describe("leaver settlement guard", () => {
  it("blocks a live settlement in the same leave year", () => {
    expect(
      findBlockingSettlement({ payments: [payment], leaveYearStart: "2026-01-01" }),
    ).toEqual(payment);
  });

  it("does not block when the settlement was reversed", () => {
    const ledger = [
      {
        entry_type: "correction",
        notes: "Reversal of superseded leaver settlement (payment pay-1, 40.16 h)",
      },
    ];
    expect(
      findBlockingSettlement({ payments: [payment], ledger, leaveYearStart: "2026-01-01" }),
    ).toBeNull();
    expect(isSettlementReversed("pay-1", ledger)).toBe(true);
  });

  it("does not block when the payment no longer exists (period deleted)", () => {
    expect(findBlockingSettlement({ payments: [], leaveYearStart: "2026-01-01" })).toBeNull();
  });

  it("names the period in the blocking message", () => {
    expect(describeBlockingSettlement(payment, "July 2026")).toContain("in July 2026");
  });
});
