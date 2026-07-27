import { describe, it, expect } from "vitest";
import { isLeaverInPeriod } from "@/lib/employee-period-relevance";

/**
 * Regression: Daniela Patricia Da Costa Almeida was accidentally marked as a
 * leaver in July 2026. Once the mistaken end_date / status='leaver' is
 * cleared, she must NOT be classified as a leaver even though a normal
 * holiday payment still exists for her in that period.
 *
 * A holiday payment on its own is not proof of leaving.
 */
const julyPeriod = { start_date: "2026-06-22", end_date: "2026-07-26" };

describe("leaver misclassification — Daniela correction", () => {
  it("classifies as leaver when end_date falls in period", () => {
    const emp = { id: "daniela", status: "leaver", end_date: "2026-07-20" };
    expect(isLeaverInPeriod(emp, julyPeriod)).toBe(true);
  });

  it("clearing end_date + status removes leaver classification", () => {
    const emp = { id: "daniela", status: "active", end_date: null };
    expect(
      isLeaverInPeriod(emp, julyPeriod, {
        holidayPaymentEmployeeIds: new Set(["daniela"]),
        entryEmployeeIds: new Set(["daniela"]),
      }),
    ).toBe(false);
  });

  it("normal mid-employment holiday pay does NOT force leaver classification", () => {
    // Active employee, no end_date, just took paid holiday this period.
    const emp = { id: "emp", status: "active", end_date: null };
    expect(
      isLeaverInPeriod(emp, julyPeriod, {
        holidayPaymentEmployeeIds: new Set(["emp"]),
      }),
    ).toBe(false);
  });

  it("still classifies persistent leavers with current-period activity", () => {
    const emp = { id: "x", status: "leaver", end_date: null };
    expect(
      isLeaverInPeriod(emp, julyPeriod, {
        entryEmployeeIds: new Set(["x"]),
      }),
    ).toBe(true);
  });

  it("still classifies leaver-flagged employees with a settlement payment", () => {
    const emp = { id: "y", status: "leaver", end_date: null };
    expect(
      isLeaverInPeriod(emp, julyPeriod, {
        holidayPaymentEmployeeIds: new Set(["y"]),
      }),
    ).toBe(true);
  });
});
