/**
 * Imported Hours Override — reason required + audit + PDF-toggle logic.
 *
 * These tests lock in the pure logic behind the new manager flow:
 *   - a reason category is mandatory when imported hours change
 *   - the composite note is deterministic and includes before/after
 *   - the approval checklist surfaces a non-blocking, ack-required warning
 *   - duplicate protection normalises whitespace and case
 *   - the override count aggregates by employee, not entry
 */
import { describe, it, expect } from "vitest";
import {
  OVERRIDE_REASON_CATEGORIES,
  formatOverrideNote,
  validateOverride,
  isDuplicateNote,
  isValidOverrideCategory,
  countImportedHoursOverrides,
} from "@/lib/payroll-hours-override";
import { buildApprovalChecklist } from "@/lib/payroll-approval-checklist";

describe("payroll-hours-override — reason category", () => {
  it("rejects a save with no category selected", () => {
    expect(
      validateOverride({ category: null as any, imported: 40, corrected: 38 }),
    ).toMatch(/reason category/i);
  });

  it("rejects an unknown category value", () => {
    expect(
      validateOverride({ category: "made_up" as any, imported: 40, corrected: 38 }),
    ).toMatch(/reason category/i);
  });

  it("rejects a save where hours did not change", () => {
    expect(
      validateOverride({
        category: "timesheet_file_error",
        imported: 40,
        corrected: 40,
      }),
    ).toMatch(/no change/i);
  });

  it("accepts a valid category and delta", () => {
    expect(
      validateOverride({
        category: "unpaid_break",
        imported: 40,
        corrected: 39.25,
      }),
    ).toBeNull();
  });

  it("recognises every UI-listed category as valid", () => {
    for (const c of OVERRIDE_REASON_CATEGORIES) {
      expect(isValidOverrideCategory(c.value)).toBe(true);
    }
  });
});

describe("payroll-hours-override — deterministic composite note", () => {
  it("captures imported → corrected and the reason label", () => {
    const note = formatOverrideNote({
      imported: 40,
      corrected: 38.5,
      category: "unpaid_break",
    });
    expect(note).toContain("40.00");
    expect(note).toContain("38.50");
    expect(note).toContain("Unpaid break correction");
  });

  it("appends manager free-text when provided", () => {
    const note = formatOverrideNote({
      imported: 40,
      corrected: 38.5,
      category: "clock_in_out_issue",
      freeText: "Clock-out missed on Friday",
    });
    expect(note).toMatch(/Clock-out missed on Friday$/);
  });
});

describe("payroll-hours-override — duplicate protection", () => {
  it("matches case + collapsed whitespace as duplicates", () => {
    const existing = [
      { note: "Timesheet hours manually changed from 40.00 to 38.50 after import. Reason: Unpaid break correction." },
    ];
    const incoming =
      "  timesheet   hours   manually   changed   from 40.00 to 38.50 after import. reason: unpaid break correction.  ";
    expect(isDuplicateNote(incoming, existing)).toBe(true);
  });

  it("does not falsely match different notes", () => {
    const existing = [{ note: "Bonus paid this period" }];
    expect(isDuplicateNote("Timesheet hours corrected", existing)).toBe(false);
  });
});

describe("payroll-hours-override — count aggregation", () => {
  it("counts one override per employee, regardless of entry count", () => {
    const entries = [
      { id: "e1", employee_id: "emp-A", imported_hours: 40 },
      { id: "e2", employee_id: "emp-A", imported_hours: 20 },
      { id: "e3", employee_id: "emp-B", imported_hours: 30 },
      { id: "e4", employee_id: "emp-C", imported_hours: null }, // manual entry, no import
    ];
    const adjustments = [
      { payroll_entry_id: "e1", field_name: "timesheet_hours" },
      { payroll_entry_id: "e2", field_name: "timesheet_hours" },
      { payroll_entry_id: "e3", field_name: "hourly_rate" }, // not an hours override
      { payroll_entry_id: "e4", field_name: "timesheet_hours" }, // no imported_hours → ignored
    ];
    const res = countImportedHoursOverrides(entries, adjustments);
    expect(res.count).toBe(1);
    expect(res.employee_ids).toEqual(["emp-A"]);
  });

  it("returns zero when nothing was imported", () => {
    const res = countImportedHoursOverrides(
      [{ id: "e1", employee_id: "emp-A", imported_hours: null }],
      [{ payroll_entry_id: "e1", field_name: "timesheet_hours" }],
    );
    expect(res.count).toBe(0);
  });
});

describe("payroll-approval-checklist — imported hours override warning", () => {
  it("adds a non-blocking, ack-required item when overrides exist", () => {
    const { items, blocking_count, ack_required_ids } = buildApprovalChecklist({
      period_status: "draft",
      entries: [],
      manualAdjustmentsByEntryId: new Map(),
      importedHoursOverrideCount: 2,
      importedHoursOverrideEmployeeIds: ["emp-A", "emp-B"],
    } as any);

    const item = items.find((i) => i.id === "imported_hours_overrides");
    expect(item).toBeDefined();
    expect(item!.status).toBe("warning");
    expect(item!.blocking).toBe(false);
    expect(item!.requires_ack).toBe(true);
    expect(item!.count).toBe(2);
    expect(blocking_count).toBe(0);
    expect(ack_required_ids).toContain("imported_hours_overrides");
  });

  it("omits the item when no overrides are recorded", () => {
    const { items } = buildApprovalChecklist({
      period_status: "draft",
      entries: [],
      manualAdjustmentsByEntryId: new Map(),
      importedHoursOverrideCount: 0,
      importedHoursOverrideEmployeeIds: [],
    } as any);
    expect(items.find((i) => i.id === "imported_hours_overrides")).toBeUndefined();
  });
});
