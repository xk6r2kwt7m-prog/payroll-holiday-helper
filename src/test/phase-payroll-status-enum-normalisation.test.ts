import { describe, it, expect } from "vitest";
import {
  normalisePayrollStatus,
  sanitisePayrollPeriodUpdate,
  isPayrollStatus,
  PAYROLL_STATUS_VALUES,
} from "@/lib/payroll-status";

describe("payroll-status normalisation", () => {
  it("recognises all four valid enum values", () => {
    for (const v of PAYROLL_STATUS_VALUES) {
      expect(isPayrollStatus(v)).toBe(true);
      expect(normalisePayrollStatus(v)).toBe(v);
    }
  });

  it('returns fallback (or undefined) for blank / null / undefined', () => {
    expect(normalisePayrollStatus("")).toBeUndefined();
    expect(normalisePayrollStatus("   ")).toBeUndefined();
    expect(normalisePayrollStatus(null)).toBeUndefined();
    expect(normalisePayrollStatus(undefined)).toBeUndefined();
    expect(normalisePayrollStatus("", "draft")).toBe("draft");
    expect(normalisePayrollStatus(null, "draft")).toBe("draft");
  });

  it("throws on invalid non-blank values", () => {
    expect(() => normalisePayrollStatus("finalised")).toThrow(/Invalid payroll status/);
    expect(() => normalisePayrollStatus("APPROVED")).toThrow(/Invalid payroll status/);
    expect(normalisePayrollStatus("draft ")).toBe("draft");
  });
});

describe("sanitisePayrollPeriodUpdate", () => {
  it('drops status: "" so PostgREST never sees an invalid enum', () => {
    const out = sanitisePayrollPeriodUpdate({ status: "", notes: "n" });
    expect("status" in out).toBe(false);
    expect(out.notes).toBe("n");
  });

  it("drops undefined imported_by without touching other fields", () => {
    const out = sanitisePayrollPeriodUpdate({
      notes: "hello",
      imported_by: undefined,
    });
    expect(out).toEqual({ notes: "hello" });
  });

  it("preserves valid draft status when importing a new period", () => {
    const out = sanitisePayrollPeriodUpdate({
      period_name: "July 2026",
      status: "draft",
    });
    expect(out.status).toBe("draft");
  });

  it("throws on invalid status so imports fail fast, not silently", () => {
    expect(() =>
      sanitisePayrollPeriodUpdate({ status: "locked" as any }),
    ).toThrow(/Invalid payroll status/);
  });

  it("existing-period update payload never carries status", () => {
    // Emulates the ImportPayrollDialog existing-period branch.
    const payload = sanitisePayrollPeriodUpdate({
      notes: "note",
      imported_by: "user-1",
    });
    expect("status" in payload).toBe(false);
  });

  it("keeps zero and null values (they are legitimate)", () => {
    const out = sanitisePayrollPeriodUpdate({
      notes: null,
      period_weeks: 0,
    });
    expect(out).toEqual({ notes: null, period_weeks: 0 });
  });
});
