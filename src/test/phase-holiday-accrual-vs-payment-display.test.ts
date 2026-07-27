/**
 * Holiday accrual vs actual payment — display clarification regression.
 *
 * Locks the UI-labelling invariants added for the "accrual looks like pay"
 * ticket. Exercises pure library helpers only — NO DB, NO mutations.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  HOLIDAY_DISPLAY_LABELS,
  pickLeaverSettlementCandidate,
  sumActualHolidayPayments,
} from "@/lib/holiday-display-labels";

describe("Holiday accrual vs actual payment display", () => {
  it("uses labels that separate accrual from payment", () => {
    expect(HOLIDAY_DISPLAY_LABELS.accrualColumn).toBe("Holiday Accrued");
    expect(HOLIDAY_DISPLAY_LABELS.accrualColumnTooltip).toMatch(/not a holiday payment/i);
    expect(HOLIDAY_DISPLAY_LABELS.actualHolidayPay).toBe("Actual holiday payments");
    expect(HOLIDAY_DISPLAY_LABELS.actualHolidayPaySubtitle).toMatch(/accrued/i);
    expect(HOLIDAY_DISPLAY_LABELS.actualHolidayPaySubtitle).toMatch(/not yet paid/i);
    expect(HOLIDAY_DISPLAY_LABELS.accrualRowSuffix).toMatch(/not paid yet/i);
    expect(HOLIDAY_DISPLAY_LABELS.leaverSettlementCta).toMatch(/Settle Leaver/);
  });

  it("payroll holiday total counts actual payments only", () => {
    // Real July 2026 rows from production data.
    const payments = [
      { total: 508.4 },
      { total: 237.5 },
      { total: 441.76 },
      { total: 243.96 },
      { total: 86.05 },
      { total: 1321.84 },
    ];
    expect(sumActualHolidayPayments(payments)).toBe(2839.51);
    // Accrual amount must never be added to this total.
    expect(sumActualHolidayPayments([])).toBe(0);
  });

  it("Nina-style leaver with accrual but no payment is flagged for Settle Leaver", () => {
    // Nina: leaver ending 2026-07-27, 13.24h accrued year-to-date, £0 taken,
    // £0 carry-over, no payout_on_termination row.
    const c = pickLeaverSettlementCandidate({
      employeeId: "nina",
      employeeName: "Nina Lenne",
      endDate: "2026-07-27",
      hourlyRate: 12,
      accruedHoursYear: 13.24,
      carryOverHours: 0,
      takenHoursYear: 0,
      hasSettlementLedger: false,
    });
    expect(c).not.toBeNull();
    expect(c!.remainingHours).toBe(13.24);
    expect(c!.estimatedValue).toBe(158.88);
  });

  it("does not flag a leaver who already has a payout_on_termination row", () => {
    const c = pickLeaverSettlementCandidate({
      employeeId: "already-settled",
      employeeName: "X",
      endDate: "2026-07-27",
      hourlyRate: 12,
      accruedHoursYear: 13.24,
      carryOverHours: 0,
      takenHoursYear: 0,
      hasSettlementLedger: true,
    });
    expect(c).toBeNull();
  });

  it("does not flag a leaver whose accrual equals what was paid", () => {
    const c = pickLeaverSettlementCandidate({
      employeeId: "balanced",
      employeeName: "Balanced Person",
      endDate: "2026-07-27",
      hourlyRate: 12,
      accruedHoursYear: 10,
      carryOverHours: 0,
      takenHoursYear: 10,
      hasSettlementLedger: false,
    });
    expect(c).toBeNull();
  });

  it("applies to every leaver — flags multiple candidates independently", () => {
    const inputs = [
      { employeeId: "a", employeeName: "A", endDate: "2026-07-27", hourlyRate: 12, accruedHoursYear: 5, carryOverHours: 0, takenHoursYear: 0, hasSettlementLedger: false },
      { employeeId: "b", employeeName: "B", endDate: "2026-07-27", hourlyRate: 15, accruedHoursYear: 20, carryOverHours: 2, takenHoursYear: 8, hasSettlementLedger: false },
      { employeeId: "c", employeeName: "C", endDate: "2026-07-27", hourlyRate: 10, accruedHoursYear: 5, carryOverHours: 0, takenHoursYear: 5, hasSettlementLedger: false }, // balanced -> skip
    ];
    const flagged = inputs
      .map((i) => pickLeaverSettlementCandidate(i))
      .filter(Boolean);
    expect(flagged).toHaveLength(2);
    expect(flagged[0]!.employeeId).toBe("a");
    expect(flagged[1]!.employeeId).toBe("b");
    expect(flagged[1]!.remainingHours).toBe(14); // 20 + 2 - 8
    expect(flagged[1]!.estimatedValue).toBe(210); // 14 * 15
  });

  it("PayrollHolidaySection surfaces the accrual-vs-payment scope note", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../components/payroll/PayrollHolidaySection.tsx"),
      "utf8",
    );
    expect(src).toContain("actualHolidayPay");
    expect(src).toContain("holiday-pay-scope-note");
    // Old, ambiguous heading must no longer be present.
    expect(src).not.toMatch(/>Holiday Pay</);
    expect(src).not.toMatch(/"No holiday payments yet"/);
  });

  it("EditablePayrollTable marks Holiday Accrued header with a not-paid tooltip", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../components/payroll/EditablePayrollTable.tsx"),
      "utf8",
    );
    expect(src).toContain("holiday-accrued-header");
    expect(src).toMatch(/Not a holiday payment/i);
  });

  it("Payroll page renames the collapsible section and mounts leaver alerts", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../pages/Payroll.tsx"),
      "utf8",
    );
    expect(src).toContain('title="Actual holiday payments"');
    expect(src).toContain("LeaverSettlementAlerts");
    // Old vague title must be gone.
    expect(src).not.toContain('title="Holiday pay"');
  });

  it("holiday-display-labels module exposes no mutation surface", () => {
    const mod = require("@/lib/holiday-display-labels");
    const banned = ["delete", "update", "insert", "save", "mutate", "post"];
    for (const name of Object.keys(mod)) {
      for (const b of banned) {
        expect(name.toLowerCase()).not.toContain(b);
      }
    }
  });
});
