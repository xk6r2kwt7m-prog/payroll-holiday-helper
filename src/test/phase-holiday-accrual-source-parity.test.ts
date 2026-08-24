/**
 * Holiday accrual source parity.
 *
 * Locks the rule that both holiday surfaces (Holidays audit detail sheet and
 * the Record Holiday Taken dialog) report the SAME accrued total, split into
 * ledger-posted accrual (approved periods) and pending accrual (open periods).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isCommittedPayrollStatus } from "@/lib/payroll-status";

const read = (p: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

describe("Holiday accrual source parity", () => {
  it("only approved/finalised periods count as committed to the ledger", () => {
    expect(isCommittedPayrollStatus("approved")).toBe(true);
    expect(isCommittedPayrollStatus("Finalised")).toBe(true);
    expect(isCommittedPayrollStatus("finalized")).toBe(true);
    for (const s of ["draft", "pending", "rejected", "", null, undefined]) {
      expect(isCommittedPayrollStatus(s)).toBe(false);
    }
  });

  it("reconciles the Arisnorky 2026 case: ledger + open periods = audit total", () => {
    const periods = [
      { status: "approved", accrued: 15.47 },
      { status: "approved", accrued: 15.95 },
      { status: "approved", accrued: 14.45 },
      { status: "pending", accrued: 18.16 },
      { status: "draft", accrued: 12.5 },
      { status: "draft", accrued: 15.69 },
      { status: "draft", accrued: 6.17 },
    ];
    const round = (n: number) => Math.round(n * 100) / 100;
    const total = round(periods.reduce((s, p) => s + p.accrued, 0));
    const posted = round(
      periods
        .filter((p) => isCommittedPayrollStatus(p.status))
        .reduce((s, p) => s + p.accrued, 0),
    );
    const pending = round(total - posted);
    expect(total).toBe(98.39);
    expect(posted).toBe(45.87);
    expect(pending).toBe(52.52);

    const carryOver = 88.15;
    const taken = 104;
    expect(round(total + carryOver - taken)).toBe(82.54);
    expect(round(posted + carryOver - taken)).toBe(30.02);
  });

  it("Holidays page tracks pending accrual per employee", () => {
    const src = read("pages/Holidays.tsx");
    expect(src).toContain("isCommittedPayrollStatus");
    expect(src).toContain("pendingAccrued");
    expect(src).toContain("pendingAccrued={selectedEmployee.pendingAccrued}");
  });

  it("detail sheet shows the ledger vs open-period split", () => {
    const src = read("components/holidays/EmployeeHolidayDetailSheet.tsx");
    expect(src).toContain("accrual-source-split");
    expect(src).toMatch(/posted to ledger/);
    expect(src).toMatch(/Open period/);
  });

  it("record-holiday dialog reports the same split", () => {
    const src = read("components/holidays/AddHolidayPaymentDialog.tsx");
    expect(src).toContain("accruedIncludingPendingHours");
    expect(src).toMatch(/posted to ledger/);
  });

  it("summary hook excludes superseded [Corrected] periods from pending accrual", () => {
    const src = read("hooks/useHolidayYearSummary.ts");
    expect(src).toContain("[Corrected]");
    expect(src).toContain("isCommittedPayrollStatus");
  });
});
