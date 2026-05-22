/**
 * Pure helper: suggest a safe employee for a given shift.
 *
 * No React, no Supabase, no React Query imports. All data is passed in.
 *
 * Safety contract:
 *  - Never returns an inactive, on-leave, unavailable, wrong-site, wrong-dept,
 *    or overlapping employee.
 *  - When no safe candidate exists, returns `null` plus reason codes so the
 *    caller can leave the shift unassigned and surface a warning.
 */

export type AutoAssignReason =
  | "inactive"
  | "on_leave"
  | "unavailable"
  | "wrong_branch"
  | "wrong_department"
  | "wrong_role"
  | "overlap"
  | "over_contracted_hours"
  | "no_candidate";

export interface AutoAssignEmployee {
  id: string;
  status: string; // "active" | "starter" | "leaver" | "inactive" | ...
  branch?: string | null;
  department?: string | null;
  role?: string | null;
  contracted_weekly_hours?: number | null;
}

export interface AutoAssignAvailabilitySlot {
  employee_id: string;
  day_of_week: number; // 0=Sun..6=Sat (matches JS Date.getDay())
  is_available: boolean;
  available_from?: string | null; // "HH:MM"
  available_to?: string | null;
}

export interface AutoAssignLeaveRange {
  employee_id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  status: string; // only "approved" excludes
}

export interface AutoAssignShift {
  id?: string;
  employee_id?: string | null;
  shift_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  branch?: string | null;
  department?: string | null;
  role?: string | null;
}

export interface AutoAssignContext {
  candidates: AutoAssignEmployee[];
  availability: AutoAssignAvailabilitySlot[];
  approvedLeave: AutoAssignLeaveRange[];
  existingShifts: AutoAssignShift[]; // already-assigned shifts in scope
}

export interface AutoAssignResult {
  employeeId: string | null;
  reasons: AutoAssignReason[];
  rejected: Record<string, AutoAssignReason[]>;
}

function toMinutes(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function dayOfWeekForDate(iso: string): number {
  // Avoid timezone drift by parsing as local date
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

export function checkEmployeeForShift(
  employee: AutoAssignEmployee,
  shift: AutoAssignShift,
  ctx: AutoAssignContext
): AutoAssignReason[] {
  const reasons: AutoAssignReason[] = [];

  if (employee.status !== "active" && employee.status !== "starter") {
    reasons.push("inactive");
  }

  if (shift.branch && employee.branch && employee.branch !== shift.branch) {
    reasons.push("wrong_branch");
  }
  if (shift.department && employee.department && employee.department !== shift.department) {
    reasons.push("wrong_department");
  }
  if (shift.role && employee.role && employee.role !== shift.role) {
    reasons.push("wrong_role");
  }

  // Approved leave covering the shift date
  const onLeave = ctx.approvedLeave.some(
    (l) =>
      l.employee_id === employee.id &&
      l.status === "approved" &&
      l.start_date <= shift.shift_date &&
      l.end_date >= shift.shift_date
  );
  if (onLeave) reasons.push("on_leave");

  // Availability for this day
  const dow = dayOfWeekForDate(shift.shift_date);
  const slots = ctx.availability.filter((s) => s.employee_id === employee.id && s.day_of_week === dow);
  if (slots.length > 0) {
    const hasDayBlock = slots.some((s) => s.is_available === false);
    if (hasDayBlock && !slots.some((s) => s.is_available)) {
      reasons.push("unavailable");
    } else {
      const availableSlots = slots.filter((s) => s.is_available);
      if (availableSlots.length > 0) {
        const shiftStart = toMinutes(shift.start_time);
        const shiftEnd = toMinutes(shift.end_time);
        const fits = availableSlots.some((s) => {
          if (!s.available_from || !s.available_to) return true;
          return toMinutes(s.available_from) <= shiftStart && toMinutes(s.available_to) >= shiftEnd;
        });
        if (!fits) reasons.push("unavailable");
      }
    }
  }

  // Overlap on the same day with any existing shift
  const sameDay = ctx.existingShifts.filter(
    (s) =>
      s.employee_id === employee.id &&
      s.shift_date === shift.shift_date &&
      s.id !== shift.id
  );
  if (sameDay.some((s) => overlaps(shift.start_time, shift.end_time, s.start_time, s.end_time))) {
    reasons.push("overlap");
  }

  return reasons;
}

function shiftDurationHours(s: AutoAssignShift): number {
  const mins = toMinutes(s.end_time) - toMinutes(s.start_time);
  return Math.max(0, mins) / 60;
}

export function suggestAssignmentForShift(
  shift: AutoAssignShift,
  ctx: AutoAssignContext
): AutoAssignResult {
  const rejected: Record<string, AutoAssignReason[]> = {};
  const eligible: { id: string; score: number }[] = [];

  for (const emp of ctx.candidates) {
    const reasons = checkEmployeeForShift(emp, shift, ctx);
    if (reasons.length > 0) {
      rejected[emp.id] = reasons;
      continue;
    }

    // Soft scoring (higher is better)
    let score = 0;
    if (shift.role && emp.role === shift.role) score += 10;
    if (shift.department && emp.department === shift.department) score += 5;

    // Prefer employees furthest below their contracted hours
    const weekHours = ctx.existingShifts
      .filter((s) => s.employee_id === emp.id)
      .reduce((sum, s) => sum + shiftDurationHours(s), 0);

    const contracted = emp.contracted_weekly_hours ?? 0;
    if (contracted > 0) {
      const shiftHrs = shiftDurationHours(shift);
      if (weekHours + shiftHrs > contracted * 1.25) {
        rejected[emp.id] = ["over_contracted_hours"];
        continue;
      }
      score += Math.max(0, contracted - weekHours);
    }

    eligible.push({ id: emp.id, score });
  }

  if (eligible.length === 0) {
    return { employeeId: null, reasons: ["no_candidate"], rejected };
  }

  eligible.sort((a, b) => b.score - a.score);
  return { employeeId: eligible[0].id, reasons: [], rejected };
}
