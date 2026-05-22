/**
 * Phase Schedule Improvements — pure helper tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import {
  suggestAssignmentForShift,
  checkEmployeeForShift,
  type AutoAssignContext,
  type AutoAssignShift,
} from "@/lib/schedule-auto-assign";
import { getScheduleWeekState } from "@/lib/schedule-week-state";
import { aggregateRotaIssues } from "@/lib/schedule-rota-issues";

const baseShift: AutoAssignShift = {
  id: "sh1",
  shift_date: "2026-05-25", // Monday
  start_time: "11:30",
  end_time: "22:30",
  branch: "Main",
  department: "FOH",
  role: "Waiter",
};

const baseCtx = (over: Partial<AutoAssignContext> = {}): AutoAssignContext => ({
  candidates: [],
  availability: [],
  approvedLeave: [],
  existingShifts: [],
  ...over,
});

describe("schedule-auto-assign", () => {
  it("skips inactive employees", () => {
    const ctx = baseCtx({
      candidates: [{ id: "e1", status: "inactive", branch: "Main", department: "FOH", role: "Waiter" }],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBeNull();
    expect(r.rejected["e1"]).toContain("inactive");
  });

  it("skips employees on approved leave", () => {
    const ctx = baseCtx({
      candidates: [{ id: "e1", status: "active", branch: "Main", department: "FOH", role: "Waiter" }],
      approvedLeave: [{ employee_id: "e1", start_date: "2026-05-24", end_date: "2026-05-26", status: "approved" }],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBeNull();
    expect(r.rejected["e1"]).toContain("on_leave");
  });

  it("ignores pending (non-approved) leave", () => {
    const ctx = baseCtx({
      candidates: [{ id: "e1", status: "active", branch: "Main", department: "FOH", role: "Waiter" }],
      approvedLeave: [{ employee_id: "e1", start_date: "2026-05-24", end_date: "2026-05-26", status: "pending" }],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBe("e1");
  });

  it("skips unavailable employees", () => {
    const ctx = baseCtx({
      candidates: [{ id: "e1", status: "active", branch: "Main", department: "FOH", role: "Waiter" }],
      availability: [{ employee_id: "e1", day_of_week: 1, is_available: false }],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBeNull();
    expect(r.rejected["e1"]).toContain("unavailable");
  });

  it("skips employees with overlapping shifts", () => {
    const ctx = baseCtx({
      candidates: [{ id: "e1", status: "active", branch: "Main", department: "FOH", role: "Waiter" }],
      existingShifts: [
        { id: "x", employee_id: "e1", shift_date: "2026-05-25", start_time: "10:00", end_time: "15:00" },
      ],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBeNull();
    expect(r.rejected["e1"]).toContain("overlap");
  });

  it("prefers role match over non-match", () => {
    const ctx = baseCtx({
      candidates: [
        { id: "e1", status: "active", branch: "Main", department: "FOH", role: "Host" },
        { id: "e2", status: "active", branch: "Main", department: "FOH", role: "Waiter" },
      ],
    });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBe("e2");
  });

  it("returns null when no safe candidate exists", () => {
    const ctx = baseCtx({ candidates: [] });
    const r = suggestAssignmentForShift(baseShift, ctx);
    expect(r.employeeId).toBeNull();
    expect(r.reasons).toContain("no_candidate");
  });

  it("checkEmployeeForShift reports wrong_department", () => {
    const reasons = checkEmployeeForShift(
      { id: "e1", status: "active", branch: "Main", department: "BOH", role: "Waiter" },
      baseShift,
      baseCtx()
    );
    expect(reasons).toContain("wrong_department");
  });
});

describe("schedule-week-state", () => {
  it("not_started when 0 shifts", () => {
    expect(getScheduleWeekState({ shifts: [], criticalWarningCount: 0 }).state).toBe("not_started");
  });
  it("published when all shifts published", () => {
    expect(
      getScheduleWeekState({
        shifts: [{ employee_id: "e1", is_published: true }, { employee_id: "e2", is_published: true }],
        criticalWarningCount: 0,
      }).state
    ).toBe("published");
  });
  it("ready_to_publish when none published, all assigned, no critical", () => {
    expect(
      getScheduleWeekState({
        shifts: [{ employee_id: "e1", is_published: false }, { employee_id: "e2", is_published: false }],
        criticalWarningCount: 0,
      }).state
    ).toBe("ready_to_publish");
  });
  it("needs_attention when critical warnings", () => {
    expect(
      getScheduleWeekState({
        shifts: [{ employee_id: "e1", is_published: false }],
        criticalWarningCount: 2,
      }).state
    ).toBe("needs_attention");
  });
  it("draft when partially assigned, no critical", () => {
    expect(
      getScheduleWeekState({
        shifts: [
          { employee_id: "e1", is_published: false },
          { employee_id: null, is_published: false },
        ],
        criticalWarningCount: 0,
      }).state
    ).toBe("draft");
  });
});

describe("schedule-rota-issues", () => {
  it("flags unassigned shifts", () => {
    const issues = aggregateRotaIssues({
      shifts: [{ id: "s1", shift_date: "2026-05-25", start_time: "11:30", end_time: "22:30", department: "FOH", employee_id: null }],
      employees: [],
      availability: [],
      approvedLeave: [],
    });
    expect(issues.some((i) => i.code === "unassigned")).toBe(true);
  });

  it("flags employee on approved leave", () => {
    const issues = aggregateRotaIssues({
      shifts: [{ id: "s1", employee_id: "e1", shift_date: "2026-05-25", start_time: "11:30", end_time: "22:30" }],
      employees: [{ id: "e1", status: "active", forename: "A", surname: "B" }],
      availability: [],
      approvedLeave: [{ employee_id: "e1", start_date: "2026-05-25", end_date: "2026-05-25", status: "approved" }],
    });
    expect(issues.some((i) => i.code === "employee_on_leave" && i.severity === "critical")).toBe(true);
  });

  it("flags overlapping shifts", () => {
    const issues = aggregateRotaIssues({
      shifts: [
        { id: "s1", employee_id: "e1", shift_date: "2026-05-25", start_time: "11:00", end_time: "16:00" },
        { id: "s2", employee_id: "e1", shift_date: "2026-05-25", start_time: "15:00", end_time: "20:00" },
      ],
      employees: [{ id: "e1", status: "active" }],
      availability: [],
      approvedLeave: [],
    });
    expect(issues.some((i) => i.code === "overlapping_shift")).toBe(true);
  });

  it("flags insufficient cover", () => {
    const issues = aggregateRotaIssues({
      shifts: [],
      employees: [],
      availability: [],
      approvedLeave: [],
      coverageRequirements: [{ branch: "Main", department: "FOH", date: "2026-05-25", minimum: 2 }],
    });
    expect(issues.some((i) => i.code === "insufficient_cover")).toBe(true);
  });
});

describe("purity — no react/supabase/react-query imports in pure helpers", () => {
  const files = [
    "src/lib/schedule-auto-assign.ts",
    "src/lib/schedule-week-state.ts",
    "src/lib/schedule-rota-issues.ts",
  ];
  it.each(files)("%s is pure", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/@tanstack\/react-query/);
    expect(src).not.toMatch(/@\/integrations\/supabase/);
  });
});
