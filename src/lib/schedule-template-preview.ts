/**
 * Pure helper: build a preview of what will happen when a template is applied
 * to a target week, including overwrite semantics and per-shift staffing-rule
 * checks. No React / Supabase / React Query imports.
 */

import {
  suggestAssignmentForShift,
  type AutoAssignContext,
  type AutoAssignEmployee,
  type AutoAssignShift,
  type AutoAssignReason,
} from "./schedule-auto-assign";

export type ApplyMode = "add_only" | "replace_draft" | "cancel";

export interface TemplatePatternShift {
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string;
  end_time: string;
  department?: string | null;
  role?: string | null;
  required_headcount?: number | null;
  preferred_employee_id?: string | null;
  break_minutes?: number | null;
  notes?: string | null;
}

export interface ExistingShift {
  id: string;
  shift_date: string;
  branch: string;
  department?: string | null;
  is_published: boolean;
  employee_id?: string | null;
}

export interface TemplatePreviewInput {
  templateName: string;
  branch: string;
  scopeDepartment: string | "site"; // template scope
  patternShifts: TemplatePatternShift[];
  weekStartIso: string; // Monday YYYY-MM-DD
  existingShifts: ExistingShift[]; // already in target week (any branch/dept)
  candidates: AutoAssignEmployee[];
  ctx: Omit<AutoAssignContext, "candidates" | "existingShifts">;
}

export interface PreviewShift {
  shift_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  branch: string;
  department: string | null;
  role: string | null;
  required_headcount: number;
  break_minutes: number | null;
  notes: string | null;
  assignedEmployeeId: string | null;
  warnings: AutoAssignReason[];
}

export interface TemplatePreview {
  templateName: string;
  branch: string;
  totalShifts: number;
  assignedShifts: number;
  unassignedShifts: number;
  warnings: number;
  affectedDepartments: string[];
  existingDraftCount: number;
  existingPublishedCount: number;
  shifts: PreviewShift[];
}

function dateForDayOffset(weekStartIso: string, dayOfWeek: number): string {
  // weekStart is Monday. day_of_week 1=Mon..0=Sun -> map.
  const [y, m, d] = weekStartIso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  // Map JS getDay() (0=Sun..6=Sat) to a Monday-offset
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  dt.setDate(dt.getDate() + offset);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function buildTemplatePreview(input: TemplatePreviewInput): TemplatePreview {
  const previewShifts: PreviewShift[] = [];
  const departments = new Set<string>();

  // Working set of "existing assignments" for overlap checks during simulation
  const simExisting: AutoAssignShift[] = input.existingShifts
    .filter((s) => s.employee_id)
    .map((s) => ({
      id: s.id,
      employee_id: s.employee_id ?? null,
      shift_date: s.shift_date,
      start_time: "00:00",
      end_time: "00:00",
      branch: s.branch,
      department: s.department ?? null,
    }));

  for (const p of input.patternShifts) {
    const count = Math.max(1, p.required_headcount ?? 1);
    for (let i = 0; i < count; i++) {
      const shift_date = dateForDayOffset(input.weekStartIso, p.day_of_week);
      const department = p.department ?? (input.scopeDepartment === "site" ? null : input.scopeDepartment);
      if (department) departments.add(department);

      const candidateShift: AutoAssignShift = {
        shift_date,
        start_time: p.start_time,
        end_time: p.end_time,
        branch: input.branch,
        department,
        role: p.role ?? null,
      };

      let assignedEmployeeId: string | null = null;
      let warnings: AutoAssignReason[] = [];

      // Try preferred employee first; fall back to suggestion
      const ctx: AutoAssignContext = {
        candidates: input.candidates,
        availability: input.ctx.availability,
        approvedLeave: input.ctx.approvedLeave,
        existingShifts: simExisting,
      };

      if (p.preferred_employee_id) {
        const preferred = input.candidates.find((e) => e.id === p.preferred_employee_id);
        if (preferred) {
          const onlyCtx: AutoAssignContext = { ...ctx, candidates: [preferred] };
          const result = suggestAssignmentForShift(candidateShift, onlyCtx);
          if (result.employeeId) {
            assignedEmployeeId = result.employeeId;
          } else {
            warnings = result.reasons;
          }
        }
      }

      if (!assignedEmployeeId) {
        const result = suggestAssignmentForShift(candidateShift, ctx);
        if (result.employeeId) {
          assignedEmployeeId = result.employeeId;
          warnings = [];
        } else if (warnings.length === 0) {
          warnings = result.reasons;
        }
      }

      // Add to sim so subsequent template shifts don't double-book
      if (assignedEmployeeId) {
        simExisting.push({
          id: `sim-${simExisting.length}-${previewShifts.length}`,
          employee_id: assignedEmployeeId,
          shift_date,
          start_time: p.start_time,
          end_time: p.end_time,
          branch: input.branch,
          department,
        });
      }

      previewShifts.push({
        shift_date,
        day_of_week: p.day_of_week,
        start_time: p.start_time,
        end_time: p.end_time,
        branch: input.branch,
        department,
        role: p.role ?? null,
        required_headcount: count,
        break_minutes: p.break_minutes ?? null,
        notes: p.notes ?? null,
        assignedEmployeeId,
        warnings,
      });
    }
  }

  const existingInScope = input.existingShifts.filter(
    (s) =>
      s.branch === input.branch &&
      (input.scopeDepartment === "site" || s.department === input.scopeDepartment)
  );

  return {
    templateName: input.templateName,
    branch: input.branch,
    totalShifts: previewShifts.length,
    assignedShifts: previewShifts.filter((s) => s.assignedEmployeeId).length,
    unassignedShifts: previewShifts.filter((s) => !s.assignedEmployeeId).length,
    warnings: previewShifts.reduce((n, s) => n + s.warnings.length, 0),
    affectedDepartments: Array.from(departments).sort(),
    existingDraftCount: existingInScope.filter((s) => !s.is_published).length,
    existingPublishedCount: existingInScope.filter((s) => s.is_published).length,
    shifts: previewShifts,
  };
}

/**
 * Decide which existing-shift IDs (if any) should be deleted for an apply mode.
 * Published shifts are NEVER auto-deleted here.
 */
export function shiftsToRemoveForApply(
  preview: TemplatePreview,
  existing: ExistingShift[],
  mode: ApplyMode
): string[] {
  if (mode !== "replace_draft") return [];
  return existing
    .filter(
      (s) =>
        !s.is_published &&
        s.branch === preview.branch &&
        (preview.affectedDepartments.length === 0 || preview.affectedDepartments.includes(s.department ?? ""))
    )
    .map((s) => s.id);
}
