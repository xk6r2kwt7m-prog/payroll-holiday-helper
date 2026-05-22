/**
 * Pure helper: evaluate whether a draft week is safe to publish.
 *
 * No React / Supabase / React Query imports.
 *
 * Hard blockers (publish is prevented):
 *  - unassigned shifts (when allowUnassigned = false)
 *  - overlapping shifts for the same employee
 *  - employee on approved leave
 *  - inactive employee assigned
 *  - missing required role coverage (when coverageRequirements provided)
 *
 * Soft warnings (publish allowed, surfaced to manager):
 *  - over contracted hours
 *  - missing break / insufficient rest
 *  - understaffed department
 *  - unusual pattern (passed through from caller)
 */

import type {
  AutoAssignAvailabilitySlot,
  AutoAssignEmployee,
  AutoAssignLeaveRange,
  AutoAssignShift,
} from "./schedule-auto-assign";
import { aggregateRotaIssues, type RotaIssueCode } from "./schedule-rota-issues";

export type PublishBlockerCode =
  | "unassigned_shift"
  | "overlapping_shift"
  | "employee_on_leave"
  | "inactive_employee"
  | "missing_role_coverage";

export type PublishWarningCode =
  | "over_contracted_hours"
  | "missing_break"
  | "insufficient_cover"
  | "employee_unavailable"
  | "missing_role";

export interface PublishBlocker {
  code: PublishBlockerCode;
  message: string;
  shiftId?: string;
  employeeId?: string;
  date?: string;
}

export interface PublishWarning {
  code: PublishWarningCode;
  message: string;
  shiftId?: string;
  employeeId?: string;
  date?: string;
}

export interface PublishSummary {
  totalShifts: number;
  draftShifts: number; // unpublished shifts being published
  publishedShifts: number; // already published
  assignedShifts: number;
  unassignedShifts: number;
  affectedEmployeeCount: number;
  affectedDepartments: string[];
}

export interface PublishGateInput {
  shifts: Array<
    AutoAssignShift & { is_published?: boolean | null }
  >;
  employees: (AutoAssignEmployee & { forename?: string; surname?: string })[];
  availability?: AutoAssignAvailabilitySlot[];
  approvedLeave?: AutoAssignLeaveRange[];
  coverageRequirements?: Array<{
    branch: string;
    department: string;
    date: string;
    minimum: number;
  }>;
  allowUnassigned?: boolean;
}

export interface PublishGateResult {
  canPublish: boolean;
  blockers: PublishBlocker[];
  warnings: PublishWarning[];
  summary: PublishSummary;
}

const ISSUE_TO_BLOCKER: Partial<Record<RotaIssueCode, PublishBlockerCode>> = {
  overlapping_shift: "overlapping_shift",
  employee_on_leave: "employee_on_leave",
};

const ISSUE_TO_WARNING: Partial<Record<RotaIssueCode, PublishWarningCode>> = {
  over_contracted_hours: "over_contracted_hours",
  missing_break: "missing_break",
  insufficient_cover: "insufficient_cover",
  employee_unavailable: "employee_unavailable",
  missing_role: "missing_role",
};

export function evaluatePublishGate(input: PublishGateInput): PublishGateResult {
  const shifts = input.shifts || [];
  const employees = input.employees || [];
  const empById = new Map(employees.map((e) => [e.id, e]));

  // Only consider shifts that are going to be published this run.
  const draftShifts = shifts.filter((s) => !s.is_published);
  const publishedShifts = shifts.filter((s) => s.is_published);

  const assignedShifts = draftShifts.filter((s) => !!s.employee_id).length;
  const unassignedShifts = draftShifts.length - assignedShifts;

  const affectedEmployees = new Set<string>();
  const affectedDepartments = new Set<string>();
  for (const s of draftShifts) {
    if (s.employee_id) affectedEmployees.add(s.employee_id);
    if (s.department) affectedDepartments.add(s.department);
  }

  const blockers: PublishBlocker[] = [];
  const warnings: PublishWarning[] = [];

  // Unassigned-as-blocker (unless explicitly allowed)
  if (!input.allowUnassigned) {
    for (const s of draftShifts) {
      if (!s.employee_id) {
        blockers.push({
          code: "unassigned_shift",
          message: `Unassigned shift on ${s.shift_date} ${s.start_time}–${s.end_time}`,
          shiftId: s.id,
          date: s.shift_date,
        });
      }
    }
  }

  // Inactive employee assigned
  for (const s of draftShifts) {
    if (!s.employee_id) continue;
    const emp = empById.get(s.employee_id);
    if (emp && emp.status !== "active" && emp.status !== "starter") {
      blockers.push({
        code: "inactive_employee",
        message: `Inactive employee assigned to a shift on ${s.shift_date}`,
        shiftId: s.id,
        employeeId: s.employee_id,
        date: s.shift_date,
      });
    }
  }

  // Reuse rota-issue aggregation for overlap / leave / soft warnings,
  // limited to the shifts being published.
  const issues = aggregateRotaIssues({
    shifts: draftShifts,
    employees,
    availability: input.availability ?? [],
    approvedLeave: input.approvedLeave ?? [],
    coverageRequirements: input.coverageRequirements,
  });

  for (const i of issues) {
    const blockerCode = ISSUE_TO_BLOCKER[i.code];
    if (blockerCode) {
      blockers.push({
        code: blockerCode,
        message: i.message,
        shiftId: i.shiftId,
        employeeId: i.employeeId,
        date: i.date,
      });
      continue;
    }
    const warningCode = ISSUE_TO_WARNING[i.code];
    if (warningCode) {
      warnings.push({
        code: warningCode,
        message: i.message,
        shiftId: i.shiftId,
        employeeId: i.employeeId,
        date: i.date,
      });
    }
  }

  // Missing required role coverage — only treated as a hard blocker when
  // a coverage requirement is fully unmet (count = 0). Partial under-staffing
  // remains a soft warning via aggregateRotaIssues.
  if (input.coverageRequirements) {
    for (const req of input.coverageRequirements) {
      const count = draftShifts.filter(
        (s) =>
          s.branch === req.branch &&
          s.department === req.department &&
          s.shift_date === req.date &&
          s.employee_id
      ).length;
      if (count === 0 && req.minimum > 0) {
        blockers.push({
          code: "missing_role_coverage",
          message: `No staff scheduled for ${req.department} at ${req.branch} on ${req.date}`,
          date: req.date,
        });
      }
    }
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
    warnings,
    summary: {
      totalShifts: shifts.length,
      draftShifts: draftShifts.length,
      publishedShifts: publishedShifts.length,
      assignedShifts,
      unassignedShifts,
      affectedEmployeeCount: affectedEmployees.size,
      affectedDepartments: Array.from(affectedDepartments).sort(),
    },
  };
}
