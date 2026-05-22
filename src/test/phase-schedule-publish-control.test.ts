/**
 * Schedule Phase 3 — publish flow, staff visibility, and post-publish change control.
 *
 * Pure helper tests. No payroll/timesheet/holiday/contract/profile/DB logic exercised.
 */
import { describe, it, expect } from "vitest";

import {
  evaluatePublishGate,
  type PublishGateInput,
} from "@/lib/schedule-publish-gate";
import {
  isShiftVisibleToStaff,
  filterShiftsForStaff,
  isPublishedChange,
  shouldNotifyStaffOfChange,
} from "@/lib/schedule-staff-visibility";
import {
  classifyPublishedChange,
  summarisePublishedChanges,
} from "@/lib/schedule-published-change";

const baseInput = (over: Partial<PublishGateInput> = {}): PublishGateInput => ({
  shifts: [],
  employees: [],
  availability: [],
  approvedLeave: [],
  allowUnassigned: false,
  ...over,
});

const employee = (id: string, status = "active", over: any = {}) => ({
  id,
  status,
  branch: "Main",
  department: "FOH",
  role: "Waiter",
  contracted_weekly_hours: 40,
  ...over,
});

const shift = (id: string, over: any = {}) => ({
  id,
  employee_id: "e1",
  shift_date: "2026-05-25",
  start_time: "11:00",
  end_time: "19:00",
  branch: "Main",
  department: "FOH",
  role: "Waiter",
  is_published: false,
  ...over,
});

describe("schedule-publish-gate — summary", () => {
  it("computes draft/assigned/unassigned counts and affected departments/staff", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1"), employee("e2", "active", { department: "BOH" })],
        shifts: [
          shift("s1", { employee_id: "e1" }),
          shift("s2", { employee_id: "e2", department: "BOH" }),
          shift("s3", { employee_id: null }),
          shift("s4", { employee_id: "e1", is_published: true }),
        ],
        allowUnassigned: true, // isolate summary
      })
    );
    expect(r.summary.totalShifts).toBe(4);
    expect(r.summary.draftShifts).toBe(3);
    expect(r.summary.publishedShifts).toBe(1);
    expect(r.summary.assignedShifts).toBe(2);
    expect(r.summary.unassignedShifts).toBe(1);
    expect(r.summary.affectedDepartments).toEqual(["BOH", "FOH"]);
    expect(r.summary.affectedEmployeeCount).toBe(2);
  });
});

describe("schedule-publish-gate — hard blockers", () => {
  it("blocks publish when an unassigned shift exists and allowUnassigned is false", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [shift("s1", { employee_id: null })],
      })
    );
    expect(r.canPublish).toBe(false);
    expect(r.blockers.some((b) => b.code === "unassigned_shift")).toBe(true);
  });

  it("permits publish when allowUnassigned is true and no other issues", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [shift("s1", { employee_id: null })],
        allowUnassigned: true,
      })
    );
    expect(r.canPublish).toBe(true);
  });

  it("blocks publish when an inactive employee is assigned", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1", "inactive")],
        shifts: [shift("s1")],
      })
    );
    expect(r.blockers.some((b) => b.code === "inactive_employee")).toBe(true);
    expect(r.canPublish).toBe(false);
  });

  it("blocks publish when assigned employee is on approved leave", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [shift("s1")],
        approvedLeave: [
          { employee_id: "e1", start_date: "2026-05-24", end_date: "2026-05-26", status: "approved" },
        ],
      })
    );
    expect(r.blockers.some((b) => b.code === "employee_on_leave")).toBe(true);
    expect(r.canPublish).toBe(false);
  });

  it("blocks publish when an employee has overlapping shifts", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [
          shift("s1", { start_time: "11:00", end_time: "16:00" }),
          shift("s2", { start_time: "15:00", end_time: "20:00" }),
        ],
      })
    );
    expect(r.blockers.some((b) => b.code === "overlapping_shift")).toBe(true);
    expect(r.canPublish).toBe(false);
  });

  it("blocks publish when a coverage requirement is fully unmet", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [],
        coverageRequirements: [
          { branch: "Main", department: "FOH", date: "2026-05-25", minimum: 2 },
        ],
        allowUnassigned: true,
      })
    );
    expect(r.blockers.some((b) => b.code === "missing_role_coverage")).toBe(true);
  });
});

describe("schedule-publish-gate — soft warnings do not block", () => {
  it("over contracted hours surfaces as warning, not a blocker", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1", "active", { contracted_weekly_hours: 8 })],
        shifts: [
          shift("s1", { shift_date: "2026-05-25", start_time: "08:00", end_time: "20:00" }),
          shift("s2", { shift_date: "2026-05-26", start_time: "08:00", end_time: "20:00" }),
        ],
      })
    );
    expect(r.warnings.some((w) => w.code === "over_contracted_hours")).toBe(true);
    expect(r.canPublish).toBe(true);
  });

  it("understaffed coverage (partial) is a warning, not a blocker", () => {
    const r = evaluatePublishGate(
      baseInput({
        employees: [employee("e1")],
        shifts: [shift("s1")],
        coverageRequirements: [
          { branch: "Main", department: "FOH", date: "2026-05-25", minimum: 3 },
        ],
      })
    );
    expect(r.warnings.some((w) => w.code === "insufficient_cover")).toBe(true);
    expect(r.blockers.some((b) => b.code === "missing_role_coverage")).toBe(false);
    expect(r.canPublish).toBe(true);
  });
});

describe("schedule-staff-visibility", () => {
  it("draft shifts are not visible to staff", () => {
    expect(isShiftVisibleToStaff({ is_published: false })).toBe(false);
  });
  it("published shifts are visible to staff", () => {
    expect(isShiftVisibleToStaff({ is_published: true })).toBe(true);
  });
  it("filterShiftsForStaff hides drafts", () => {
    const s = filterShiftsForStaff([
      { id: "1", is_published: true },
      { id: "2", is_published: false },
    ]);
    expect(s.map((x) => x.id)).toEqual(["1"]);
  });
  it("replaced draft shifts never notify staff", () => {
    expect(shouldNotifyStaffOfChange({ is_published: false }, "delete")).toBe(false);
  });
  it("flags published edits as change requiring notification", () => {
    expect(shouldNotifyStaffOfChange({ is_published: true }, "edit")).toBe(true);
    expect(shouldNotifyStaffOfChange({ is_published: true }, "reassign")).toBe(true);
    expect(shouldNotifyStaffOfChange({ is_published: true }, "delete")).toBe(true);
  });
  it("isPublishedChange detects published shifts only", () => {
    expect(isPublishedChange({ is_published: true })).toBe(true);
    expect(isPublishedChange({ is_published: false })).toBe(false);
    expect(isPublishedChange(null)).toBe(false);
  });
});

describe("schedule-published-change — classification", () => {
  const b = {
    id: "s1",
    is_published: true,
    shift_date: "2026-05-25",
    start_time: "11:00",
    end_time: "19:00",
    employee_id: "e1",
    department: "FOH",
    notes: null,
  };
  it("detects time changes", () => {
    expect(classifyPublishedChange(b, { ...b, end_time: "20:00" })).toContain("time_change");
  });
  it("detects reassignment", () => {
    expect(classifyPublishedChange(b, { ...b, employee_id: "e2" })).toContain("reassign");
  });
  it("detects unassign", () => {
    expect(classifyPublishedChange(b, { ...b, employee_id: null })).toContain("unassign");
  });
  it("detects deletion", () => {
    expect(classifyPublishedChange(b, null)).toEqual(["delete"]);
  });

  it("summarises diffs across a week, ignoring still-draft shifts", () => {
    const before = [
      { id: "p1", is_published: true, shift_date: "2026-05-25", start_time: "11:00", end_time: "19:00", employee_id: "e1", department: "FOH" },
      { id: "p2", is_published: true, shift_date: "2026-05-26", start_time: "11:00", end_time: "19:00", employee_id: "e2", department: "FOH" },
      { id: "d1", is_published: false, shift_date: "2026-05-25", start_time: "09:00", end_time: "17:00", employee_id: "e3", department: "FOH" },
    ];
    const after = [
      // time change to p1
      { id: "p1", is_published: true, shift_date: "2026-05-25", start_time: "11:00", end_time: "20:00", employee_id: "e1", department: "FOH" },
      // p2 removed
      // new published shift
      { id: "p3", is_published: true, shift_date: "2026-05-27", start_time: "11:00", end_time: "19:00", employee_id: "e4", department: "FOH" },
      // draft updated — should not appear in summary
      { id: "d1", is_published: false, shift_date: "2026-05-25", start_time: "10:00", end_time: "18:00", employee_id: "e3", department: "FOH" },
    ];
    const r = summarisePublishedChanges(before, after);
    expect(r.added.map((s) => s.id)).toEqual(["p3"]);
    expect(r.removed.map((s) => s.id)).toEqual(["p2"]);
    expect(r.timeChanges.map((c) => c.before.id)).toEqual(["p1"]);
    expect(r.affectedEmployeeIds.sort()).toEqual(["e1", "e2", "e4"]);
  });
});

describe("Schedule Phase 3 — no-auto-publish contract (purity)", () => {
  // These helpers are pure inputs; we assert that they never mutate is_published.
  it("evaluatePublishGate never flips is_published", () => {
    const input = baseInput({
      employees: [employee("e1")],
      shifts: [shift("s1"), shift("s2", { is_published: true })],
      allowUnassigned: true,
    });
    const snapshot = JSON.stringify(input.shifts);
    evaluatePublishGate(input);
    expect(JSON.stringify(input.shifts)).toBe(snapshot);
  });
});
