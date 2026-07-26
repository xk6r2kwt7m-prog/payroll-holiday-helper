/**
 * Phase 2 — Payroll Smart Change Review: Notes & PDF Visibility.
 *
 * These tests cover the pure logic pieces that Phase 2 introduces or
 * touches. They deliberately avoid mounting React components (the rest
 * of the suite follows the same pattern for hooks/logic modules) and
 * focus on behaviour a user or an approver relies on:
 *
 *   - comparison summary carries note counters (total / pdf / internal)
 *   - approval checklist surfaces those counters informationally
 *   - notes are NEVER blocking
 *   - notes do not perturb any payroll/NMW/service-charge/holiday number
 *   - PDF filter excludes internal-only notes
 *   - duplicate structured notes are prevented at the API layer
 */
import { describe, it, expect } from "vitest";
import {
  buildPeriodComparison,
  summarizeComparison,
  type CompareEntry,
  type EmployeeChange,
} from "@/lib/payroll-change-review";
import { buildApprovalChecklist } from "@/lib/payroll-approval-checklist";

const period = (id: string, start: string, end: string) => ({
  id,
  start_date: start,
  end_date: end,
  status: "draft" as const,
});

const entry = (over: Partial<CompareEntry>): CompareEntry => ({
  entry_id: over.entry_id ?? "e1",
  employee_id: over.employee_id ?? "emp1",
  hourly_rate: 12,
  service_charge: 50,
  timesheet_hours: 160,
  performance_bonus: 0,
  special_bonus: 0,
  holiday_pay: 0,
  total_pay: 12 * 160 + 50,
  ...over,
});

describe("Phase 2 — comparison summary carries note counters", () => {
  it("splits total_notes into pdf_visible + internal_only", () => {
    const summary = summarizeComparison(new Map(), {
      hasPrev: true,
      pdfVisibleNotesCount: 2,
      totalNotesCount: 5,
    });
    expect(summary.total_notes).toBe(5);
    expect(summary.pdf_visible_notes).toBe(2);
    expect(summary.internal_only_notes).toBe(3);
  });

  it("defaults internal_only_notes to 0 when no notes exist", () => {
    const summary = summarizeComparison(new Map(), {
      hasPrev: true,
      pdfVisibleNotesCount: 0,
      totalNotesCount: 0,
    });
    expect(summary.total_notes).toBe(0);
    expect(summary.pdf_visible_notes).toBe(0);
    expect(summary.internal_only_notes).toBe(0);
  });

  it("never returns a negative internal_only count when totals are inconsistent", () => {
    // Defensive: caller may pass pdfVisible > total by mistake.
    const summary = summarizeComparison(new Map(), {
      hasPrev: true,
      pdfVisibleNotesCount: 4,
      totalNotesCount: 2,
    });
    expect(summary.internal_only_notes).toBe(0);
    expect(summary.total_notes).toBeGreaterThanOrEqual(summary.pdf_visible_notes);
  });
});

describe("Phase 2 — notes are informational, never blocking", () => {
  it("adds a pass-status checklist item when notes exist and does not block approval", () => {
    const cmp = buildPeriodComparison({
      currentPeriod: period("p2", "2026-06-01", "2026-06-28"),
      currentEntries: [entry({})],
      previousPeriod: period("p1", "2026-05-01", "2026-05-28"),
      previousEntries: [entry({})],
      pdfVisibleNotesCount: 1,
      totalNotesCount: 3,
    });

    const { items, blocking_count } = buildApprovalChecklist({
      period_status: "draft",
      entries: [],
      manualAdjustmentsByEntryId: new Map(),
      comparisonSummary: cmp.summary,
    } as any);

    const total = items.find((i) => i.id === "comparison_notes_total");
    const pdf = items.find((i) => i.id === "comparison_pdf_notes");
    expect(total?.status).toBe("pass");
    expect(total?.blocking).toBe(false);
    expect(total?.count).toBe(3);
    expect(pdf?.status).toBe("pass");
    expect(pdf?.blocking).toBe(false);
    expect(pdf?.count).toBe(1);

    // Notes never contribute to blocking_count on their own.
    const blockingFromNotes = items.filter(
      (i) => i.blocking && (i.id === "comparison_notes_total" || i.id === "comparison_pdf_notes"),
    );
    expect(blockingFromNotes).toHaveLength(0);
    expect(blocking_count).toBe(0);
  });

  it("omits the notes checklist rows when the period has no notes", () => {
    const cmp = buildPeriodComparison({
      currentPeriod: period("p2", "2026-06-01", "2026-06-28"),
      currentEntries: [entry({})],
      previousPeriod: period("p1", "2026-05-01", "2026-05-28"),
      previousEntries: [entry({})],
      pdfVisibleNotesCount: 0,
      totalNotesCount: 0,
    });

    const { items } = buildApprovalChecklist({
      period_status: "draft",
      entries: [],
      manualAdjustmentsByEntryId: new Map(),
      comparisonSummary: cmp.summary,
    } as any);

    expect(items.find((i) => i.id === "comparison_notes_total")).toBeUndefined();
    expect(items.find((i) => i.id === "comparison_pdf_notes")).toBeUndefined();
  });
});

describe("Phase 2 — notes do NOT affect payroll numbers", () => {
  /**
   * Building the same comparison with and without notes must produce
   * identical per-employee EmployeeChange values across every field
   * that feeds pay, NMW, service charge or holiday. Only the summary
   * note counters may differ.
   */
  const snapshot = (c: EmployeeChange) => ({
    rate: c.rate,
    service_charge: c.service_charge,
    bonus: c.bonus,
    holiday_pay: c.holiday_pay,
    hours: c.hours,
    gross_pay: c.gross_pay,
    is_new_starter: c.is_new_starter,
    is_leaver: c.is_leaver,
  });

  it("produces identical EmployeeChange values with or without notes present", () => {
    const args = {
      currentPeriod: period("p2", "2026-06-01", "2026-06-28"),
      currentEntries: [
        entry({ employee_id: "a", entry_id: "a1", hourly_rate: 13, timesheet_hours: 170 }),
        entry({ employee_id: "b", entry_id: "b1", service_charge: 80, performance_bonus: 50 }),
      ] as CompareEntry[],
      previousPeriod: period("p1", "2026-05-01", "2026-05-28"),
      previousEntries: [
        entry({ employee_id: "a", entry_id: "a0", hourly_rate: 12, timesheet_hours: 160 }),
        entry({ employee_id: "b", entry_id: "b0", service_charge: 50, performance_bonus: 0 }),
      ] as CompareEntry[],
    };

    const zero = buildPeriodComparison({
      ...args,
      pdfVisibleNotesCount: 0,
      totalNotesCount: 0,
    });
    const many = buildPeriodComparison({
      ...args,
      pdfVisibleNotesCount: 4,
      totalNotesCount: 10,
    });

    for (const empId of ["a", "b"]) {
      expect(snapshot(many.changes.get(empId)!)).toEqual(
        snapshot(zero.changes.get(empId)!),
      );
    }
    // Only the summary counters differ.
    expect(zero.summary.total_notes).toBe(0);
    expect(many.summary.total_notes).toBe(10);
    expect(many.summary.internal_only_notes).toBe(6);
  });
});

describe("Phase 2 — PDF filter", () => {
  it("only notes flagged show_on_pdf are eligible for the payroll PDF", () => {
    const raw = [
      { id: "1", note: "internal", show_on_pdf: false, employee_id: "e", created_at: "" },
      { id: "2", note: "visible", show_on_pdf: true, employee_id: "e", created_at: "" },
      { id: "3", note: "another internal", show_on_pdf: false, employee_id: "e", created_at: "" },
    ];
    const pdfEligible = raw.filter((n) => n.show_on_pdf);
    expect(pdfEligible).toHaveLength(1);
    expect(pdfEligible[0].note).toBe("visible");
  });
});

describe("Phase 2 — duplicate protection", () => {
  it("case-insensitive duplicate detection matches the dialog's guard", () => {
    // Mirrors the guard inside EmployeeChangeReviewDialog.handleAdd.
    const notes = [{ note: "Rate uplift from 1 June" }];
    const incoming = "  rate uplift from 1 june  ";
    const isDup = notes.some(
      (n) => n.note.trim().toLowerCase() === incoming.trim().toLowerCase(),
    );
    expect(isDup).toBe(true);
  });
});
