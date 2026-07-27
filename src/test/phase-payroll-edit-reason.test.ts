import { describe, it, expect } from "vitest";
import {
  EDIT_REASON_CATEGORIES,
  EDIT_FIELD_TO_NOTE_CATEGORY,
  EDITABLE_FIELD_LABEL,
  isValidEditReasonCategory,
  editReasonLabel,
  noteCategoryForField,
  formatFieldChange,
  formatEditReasonNote,
  validateEditReason,
  type FieldChange,
} from "@/lib/payroll-edit-reason";
import { isDuplicateNote } from "@/lib/payroll-hours-override";

describe("payroll-edit-reason", () => {
  it("exposes all required reason categories", () => {
    const values = EDIT_REASON_CATEGORIES.map((c) => c.value);
    for (const v of [
      "rate_correction",
      "service_charge_correction",
      "timesheet_correction",
      "bonus_correction",
      "holiday_pay_correction",
      "manual_adjustment",
      "other",
    ]) {
      expect(values).toContain(v);
    }
  });

  it("validates reason categories", () => {
    expect(isValidEditReasonCategory("rate_correction")).toBe(true);
    expect(isValidEditReasonCategory("nope")).toBe(false);
    expect(isValidEditReasonCategory(null)).toBe(false);
  });

  it("maps every editable field to a stable note category", () => {
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.hourly_rate).toBe("rate");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.service_charge).toBe("service_charge");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.timesheet_hours).toBe("timesheet");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.performance_bonus).toBe("bonus");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.special_bonus).toBe("bonus");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.holiday_pay).toBe("holiday");
    expect(EDIT_FIELD_TO_NOTE_CATEGORY.manual_adjustment).toBe("manual_adjustment");
    expect(noteCategoryForField("hourly_rate")).toBe("rate");
  });

  it("has a human label for every editable field", () => {
    for (const k of Object.keys(EDIT_FIELD_TO_NOTE_CATEGORY)) {
      expect(EDITABLE_FIELD_LABEL[k as keyof typeof EDITABLE_FIELD_LABEL]).toBeTruthy();
    }
  });

  it("formats a single field change with a signed delta", () => {
    const line = formatFieldChange({ field: "hourly_rate", previous: 12, next: 12.5 });
    expect(line).toContain("Hourly rate");
    expect(line).toContain("+");
  });

  it("builds a composite reason note with reason + free text", () => {
    const changes: FieldChange[] = [
      { field: "hourly_rate", previous: 12, next: 12.5 },
      { field: "service_charge", previous: 0, next: 1 },
    ];
    const note = formatEditReasonNote({
      changes,
      category: "rate_correction",
      freeText: "Agreed with owner",
    });
    expect(note).toContain("Hourly rate");
    expect(note).toContain("Service charge");
    expect(note).toContain("Rate correction");
    expect(note).toContain("Agreed with owner");
  });

  it("rejects saves without a reason category", () => {
    expect(
      validateEditReason({
        changes: [{ field: "hourly_rate", previous: 12, next: 13 }],
        category: null,
      }),
    ).toMatch(/reason/i);
    expect(
      validateEditReason({
        changes: [{ field: "hourly_rate", previous: 12, next: 13 }],
        category: "rate_correction",
      }),
    ).toBeNull();
  });

  it("rejects saves with no field changes", () => {
    expect(
      validateEditReason({ changes: [], category: "rate_correction" }),
    ).toMatch(/no changes/i);
  });

  it("has label lookup for known and unknown categories", () => {
    expect(editReasonLabel("rate_correction")).toBe("Rate correction");
    expect(editReasonLabel("weird")).toBe("weird");
    expect(editReasonLabel(null)).toBe("");
  });
});

describe("payroll edit note — dedup / preserve existing", () => {
  it("detects duplicates ignoring whitespace/case", () => {
    const note = "Hourly rate: £12.00 → £12.50 (+£0.50). Reason: Rate correction.";
    const existing = [
      { note: "  HOURLY RATE: £12.00 → £12.50 (+£0.50). REASON: Rate correction.  " },
    ];
    expect(isDuplicateNote(note, existing)).toBe(true);
  });

  it("treats distinct reasons as distinct notes (existing notes preserved)", () => {
    const existing = [
      { note: "Hourly rate: £12.00 → £12.50 (+£0.50). Reason: Rate correction." },
    ];
    const incoming = "Service charge: £0.00 → £1.00 (+£1.00). Reason: Service charge correction.";
    expect(isDuplicateNote(incoming, existing)).toBe(false);
  });
});

describe("payroll edit reason — scope coverage matrix", () => {
  const cases: Array<{ field: FieldChange["field"]; prev: number; next: number }> = [
    { field: "hourly_rate", prev: 12, next: 13 },
    { field: "service_charge", prev: 0, next: 1 },
    { field: "timesheet_hours", prev: 40, next: 42 },
    { field: "performance_bonus", prev: 0, next: 50 },
    { field: "special_bonus", prev: 0, next: 25 },
    { field: "holiday_pay", prev: 0, next: 120 },
    { field: "manual_adjustment", prev: 0, next: 15 },
  ];
  for (const c of cases) {
    it(`records a reason for ${c.field}`, () => {
      const err = validateEditReason({
        changes: [{ field: c.field, previous: c.prev, next: c.next }],
        category: "manual_adjustment",
      });
      expect(err).toBeNull();
      const note = formatEditReasonNote({
        changes: [{ field: c.field, previous: c.prev, next: c.next }],
        category: "manual_adjustment",
      });
      expect(note).toContain(EDITABLE_FIELD_LABEL[c.field]);
      expect(note).toContain("Manual adjustment");
    });
  }
});
