import { describe, expect, it } from "vitest";
import {
  buildTemplatePreview,
  shiftsToRemoveForApply,
  type TemplatePatternShift,
  type ExistingShift,
} from "@/lib/schedule-template-preview";
import type {
  AutoAssignEmployee,
  AutoAssignAvailabilitySlot,
  AutoAssignLeaveRange,
} from "@/lib/schedule-auto-assign";

const weekStart = "2026-01-19"; // Monday

function emp(id: string, overrides: Partial<AutoAssignEmployee> = {}): AutoAssignEmployee {
  return {
    id,
    status: "active",
    branch: "Soho",
    department: "FOH",
    role: "Server",
    contracted_weekly_hours: 40,
    ...overrides,
  };
}

const baseCtx = {
  availability: [] as AutoAssignAvailabilitySlot[],
  approvedLeave: [] as AutoAssignLeaveRange[],
};

const baseInput = (overrides: Partial<Parameters<typeof buildTemplatePreview>[0]> = {}) => ({
  templateName: "Saturday Service",
  branch: "Soho",
  scopeDepartment: "FOH" as const,
  patternShifts: [] as TemplatePatternShift[],
  weekStartIso: weekStart,
  existingShifts: [] as ExistingShift[],
  candidates: [] as AutoAssignEmployee[],
  ctx: baseCtx,
  ...overrides,
});

describe("schedule template preview (Phase 2)", () => {
  it("expands required_headcount into multiple shifts and reports counts", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [
          { day_of_week: 6, start_time: "11:00", end_time: "16:00", required_headcount: 3, role: "Server" },
        ],
        candidates: [emp("a"), emp("b")],
      })
    );
    expect(preview.totalShifts).toBe(3);
    expect(preview.assignedShifts).toBe(2); // only 2 candidates
    expect(preview.unassignedShifts).toBe(1);
    expect(preview.affectedDepartments).toEqual(["FOH"]);
  });

  it("does not assign inactive employees", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [{ day_of_week: 1, start_time: "11:00", end_time: "16:00" }],
        candidates: [emp("a", { status: "inactive" })],
      })
    );
    expect(preview.assignedShifts).toBe(0);
    expect(preview.shifts[0].warnings).toContain("no_candidate");
  });

  it("excludes employees on approved leave", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [{ day_of_week: 1, start_time: "11:00", end_time: "16:00" }],
        candidates: [emp("a")],
        ctx: {
          ...baseCtx,
          approvedLeave: [{ employee_id: "a", start_date: "2026-01-19", end_date: "2026-01-21", status: "approved" }],
        },
      })
    );
    expect(preview.assignedShifts).toBe(0);
  });

  it("prevents overlapping assignment within the same template apply", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [
          { day_of_week: 1, start_time: "11:00", end_time: "16:00" },
          { day_of_week: 1, start_time: "14:00", end_time: "18:00" },
        ],
        candidates: [emp("a")],
      })
    );
    expect(preview.assignedShifts).toBe(1);
    expect(preview.unassignedShifts).toBe(1);
  });

  it("respects role suitability via wrong_role warning when no other candidate matches", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [{ day_of_week: 1, start_time: "11:00", end_time: "16:00", role: "Manager" }],
        candidates: [emp("a", { role: "Server" })],
      })
    );
    expect(preview.unassignedShifts).toBe(1);
    expect(preview.shifts[0].warnings.length).toBeGreaterThan(0);
  });

  it("counts existing draft vs published shifts in scope", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [{ day_of_week: 1, start_time: "11:00", end_time: "16:00" }],
        existingShifts: [
          { id: "x", shift_date: "2026-01-19", branch: "Soho", department: "FOH", is_published: false },
          { id: "y", shift_date: "2026-01-20", branch: "Soho", department: "FOH", is_published: true },
          { id: "z", shift_date: "2026-01-20", branch: "Soho", department: "BOH", is_published: false },
        ],
      })
    );
    expect(preview.existingDraftCount).toBe(1);
    expect(preview.existingPublishedCount).toBe(1);
  });

  it("shiftsToRemoveForApply only returns DRAFT in-scope shifts on replace_draft", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [{ day_of_week: 1, start_time: "11:00", end_time: "16:00" }],
      })
    );
    const existing: ExistingShift[] = [
      { id: "draft1", shift_date: "2026-01-19", branch: "Soho", department: "FOH", is_published: false },
      { id: "pub1", shift_date: "2026-01-19", branch: "Soho", department: "FOH", is_published: true },
      { id: "draft-bar", shift_date: "2026-01-19", branch: "Other", department: "FOH", is_published: false },
    ];
    expect(shiftsToRemoveForApply(preview, existing, "add_only")).toEqual([]);
    expect(shiftsToRemoveForApply(preview, existing, "cancel")).toEqual([]);
    expect(shiftsToRemoveForApply(preview, existing, "replace_draft")).toEqual(["draft1"]);
  });

  it("preferred employee is used when safe", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [
          { day_of_week: 1, start_time: "11:00", end_time: "16:00", preferred_employee_id: "b" },
        ],
        candidates: [emp("a"), emp("b")],
      })
    );
    expect(preview.shifts[0].assignedEmployeeId).toBe("b");
  });

  it("falls back when preferred employee is on leave", () => {
    const preview = buildTemplatePreview(
      baseInput({
        patternShifts: [
          { day_of_week: 1, start_time: "11:00", end_time: "16:00", preferred_employee_id: "a" },
        ],
        candidates: [emp("a"), emp("b")],
        ctx: {
          ...baseCtx,
          approvedLeave: [{ employee_id: "a", start_date: "2026-01-19", end_date: "2026-01-21", status: "approved" }],
        },
      })
    );
    expect(preview.shifts[0].assignedEmployeeId).toBe("b");
  });
});
