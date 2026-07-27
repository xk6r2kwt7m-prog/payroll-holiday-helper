import { describe, it, expect } from "vitest";
import {
  buildPdfAdjustmentRows,
  summarisePdfAdjustments,
  type RawPdfAdjustment,
} from "@/lib/payroll-pdf-adjustments";

const a = (over: Partial<RawPdfAdjustment>): RawPdfAdjustment => ({
  id: Math.random().toString(),
  employee_id: "emp-A",
  employee_name: "Hafiz Rahim",
  field_name: "service_charge",
  old_value: 1,
  new_value: 2,
  delta: 1,
  note: "Service charge correction",
  created_at: "2026-07-27T09:00:00Z",
  ...over,
});

describe("payroll-pdf-adjustments — accountant PDF filtering", () => {
  it("includes hourly_rate adjustments", () => {
    const rows = buildPdfAdjustmentRows([
      a({ field_name: "hourly_rate", old_value: 9.5, new_value: 10.5, employee_name: "Iara" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].field_label).toBe("Hourly Rate");
    expect(rows[0].from_value).toBe(9.5);
    expect(rows[0].to_value).toBe(10.5);
  });

  it("includes service_charge adjustments", () => {
    const rows = buildPdfAdjustmentRows([
      a({ field_name: "service_charge", old_value: 1, new_value: 2 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].field_label).toBe("Service Charge");
  });

  it("EXCLUDES timesheet_hours changes by default", () => {
    const rows = buildPdfAdjustmentRows([a({ field_name: "timesheet_hours" })]);
    expect(rows).toEqual([]);
  });

  it("EXCLUDES imported_hours override changes by default", () => {
    const rows = buildPdfAdjustmentRows([a({ field_name: "imported_hours" })]);
    expect(rows).toEqual([]);
  });

  it("EXCLUDES performance_bonus changes by default", () => {
    const rows = buildPdfAdjustmentRows([a({ field_name: "performance_bonus" })]);
    expect(rows).toEqual([]);
  });

  it("EXCLUDES special_bonus changes by default", () => {
    const rows = buildPdfAdjustmentRows([a({ field_name: "special_bonus" })]);
    expect(rows).toEqual([]);
  });

  it("EXCLUDES holiday_pay changes by default", () => {
    const rows = buildPdfAdjustmentRows([a({ field_name: "holiday_pay" })]);
    expect(rows).toEqual([]);
  });
});

describe("payroll-pdf-adjustments — one line per employee+field", () => {
  it("collapses repeated service_charge edits into a single from→to line", () => {
    // £1 → £1.50, then £1.50 → £2. Accountant should see £1 → £2.
    const rows = buildPdfAdjustmentRows([
      a({ id: "1", old_value: 1, new_value: 1.5, created_at: "2026-07-27T09:00:00Z" }),
      a({ id: "2", old_value: 1.5, new_value: 2, created_at: "2026-07-27T14:00:00Z", note: "Second correction" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].from_value).toBe(1);
    expect(rows[0].to_value).toBe(2);
    // Latest non-empty reason wins.
    expect(rows[0].reason).toBe("Second correction");
  });

  it("collapses repeated hourly_rate edits into a single line", () => {
    const rows = buildPdfAdjustmentRows([
      a({ id: "1", field_name: "hourly_rate", old_value: 9.5, new_value: 10, created_at: "2026-07-27T09:00:00Z" }),
      a({ id: "2", field_name: "hourly_rate", old_value: 10, new_value: 10.5, created_at: "2026-07-27T14:00:00Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].from_value).toBe(9.5);
    expect(rows[0].to_value).toBe(10.5);
  });

  it("keeps rate and service_charge as separate rows for the same employee", () => {
    const rows = buildPdfAdjustmentRows([
      a({ id: "1", field_name: "hourly_rate", old_value: 10, new_value: 11 }),
      a({ id: "2", field_name: "service_charge", old_value: 1, new_value: 2 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.field_label).sort()).toEqual(["Hourly Rate", "Service Charge"]);
  });

  it("drops no-op movements (edited and reverted within the period)", () => {
    const rows = buildPdfAdjustmentRows([
      a({ id: "1", old_value: 1, new_value: 2, created_at: "2026-07-27T09:00:00Z" }),
      a({ id: "2", old_value: 2, new_value: 1, created_at: "2026-07-27T14:00:00Z" }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe("payroll-pdf-adjustments — summary counts", () => {
  it("reports how many rate/SC rows appear vs how many internal rows are hidden", () => {
    const raw = [
      a({ field_name: "hourly_rate", old_value: 10, new_value: 11 }),
      a({ field_name: "service_charge", old_value: 1, new_value: 2 }),
      a({ field_name: "timesheet_hours" }),
      a({ field_name: "performance_bonus" }),
      a({ field_name: "special_bonus" }),
    ];
    const rows = buildPdfAdjustmentRows(raw);
    const summary = summarisePdfAdjustments(raw, rows);
    expect(summary.pdf_rows).toBe(2);
    expect(summary.internal_hidden).toBe(3);
  });
});
