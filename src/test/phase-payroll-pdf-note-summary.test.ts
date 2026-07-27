import { describe, it, expect } from "vitest";
import {
  summarisePdfNoteVisibility,
  latestNoteForCategory,
  FIELD_TO_NOTE_CATEGORY,
  type PdfVisibilityNote,
} from "@/lib/payroll-pdf-note-summary";

const n = (over: Partial<PdfVisibilityNote>): PdfVisibilityNote => ({
  id: Math.random().toString(),
  employee_id: "emp-A",
  category: "timesheet",
  show_on_pdf: false,
  note: "",
  created_at: "2026-06-01T10:00:00Z",
  ...over,
});

describe("payroll-pdf-note-summary — summarisePdfNoteVisibility", () => {
  it("returns zeros when there are no notes", () => {
    expect(summarisePdfNoteVisibility([])).toEqual({
      total: 0,
      pdf_visible: 0,
      internal_only: 0,
      pdf_visible_timesheet: 0,
      pdf_visible_employees: 0,
    });
  });

  it("splits pdf-visible vs internal counts", () => {
    const notes = [
      n({ show_on_pdf: true }),
      n({ show_on_pdf: false }),
      n({ show_on_pdf: true, employee_id: "emp-B" }),
    ];
    const s = summarisePdfNoteVisibility(notes);
    expect(s.total).toBe(3);
    expect(s.pdf_visible).toBe(2);
    expect(s.internal_only).toBe(1);
    expect(s.pdf_visible_employees).toBe(2);
  });

  it("counts pdf-visible timesheet-category notes for accountant preview", () => {
    const notes = [
      n({ category: "timesheet", show_on_pdf: true }),
      n({ category: "timesheet", show_on_pdf: false }),
      n({ category: "rate", show_on_pdf: true }),
    ];
    expect(summarisePdfNoteVisibility(notes).pdf_visible_timesheet).toBe(1);
  });
});

describe("payroll-pdf-note-summary — latestNoteForCategory", () => {
  it("returns null when no matching note exists", () => {
    expect(latestNoteForCategory([], "emp-A", "timesheet")).toBeNull();
  });

  it("returns the most recent note when several exist", () => {
    const older = n({ id: "old", created_at: "2026-06-01T10:00:00Z", note: "old" });
    const newer = n({ id: "new", created_at: "2026-06-05T09:00:00Z", note: "latest" });
    const other = n({ id: "otherEmp", employee_id: "emp-B", note: "different employee" });
    const result = latestNoteForCategory([older, newer, other], "emp-A", "timesheet");
    expect(result?.id).toBe("new");
  });

  it("scopes lookup by employee AND category", () => {
    const rate = n({ category: "rate", note: "rate uplift" });
    const timesheet = n({ category: "timesheet", note: "hours corrected" });
    expect(latestNoteForCategory([rate, timesheet], "emp-A", "timesheet")?.note).toBe(
      "hours corrected",
    );
  });
});

describe("payroll-pdf-note-summary — field to category map", () => {
  it("maps every editable payroll field to a note category", () => {
    expect(FIELD_TO_NOTE_CATEGORY.timesheet_hours).toBe("timesheet");
    expect(FIELD_TO_NOTE_CATEGORY.hourly_rate).toBe("rate");
    expect(FIELD_TO_NOTE_CATEGORY.service_charge).toBe("service_charge");
    expect(FIELD_TO_NOTE_CATEGORY.performance_bonus).toBe("bonus");
    expect(FIELD_TO_NOTE_CATEGORY.special_bonus).toBe("bonus");
    expect(FIELD_TO_NOTE_CATEGORY.holiday_pay).toBe("holiday");
  });
});

describe("payroll-pdf-note-summary — visibility toggle preserves note", () => {
  it("shows the same note reference regardless of show_on_pdf flag", () => {
    // Simulates the "toggle later" flow: same note id, only show_on_pdf flips.
    const before = n({ id: "note-1", show_on_pdf: false, note: "hours corrected" });
    const after = { ...before, show_on_pdf: true };
    const scoped = [before];
    const latest = latestNoteForCategory(scoped, "emp-A", "timesheet");
    expect(latest?.note).toBe("hours corrected");
    // Toggling visibility must NOT rewrite the text.
    expect(after.note).toBe(before.note);
    // Summary reflects the new visibility.
    expect(summarisePdfNoteVisibility([after]).pdf_visible).toBe(1);
    expect(summarisePdfNoteVisibility([after]).internal_only).toBe(0);
  });
});
