/**
 * Pure helper: aggregate rota issues across a week's shifts.
 *
 * No React / Supabase / React Query imports.
 *
 * Issue codes (manager-facing):
 *  - unassigned
 *  - employee_unavailable
 *  - employee_on_leave
 *  - missing_role
 *  - over_contracted_hours
 *  - overlapping_shift
 *  - missing_break
 *  - insufficient_cover
 *  - young_worker_limit (under-18 Working Time limits)
 */

import type {
  AutoAssignAvailabilitySlot,
  AutoAssignEmployee,
  AutoAssignLeaveRange,
  AutoAssignShift,
} from "./schedule-auto-assign";

export type RotaIssueCode =
  | "unassigned"
  | "employee_unavailable"
  | "employee_on_leave"
  | "missing_role"
  | "over_contracted_hours"
  | "overlapping_shift"
  | "missing_break"
  | "insufficient_cover"
  | "young_worker_limit";

export interface RotaIssue {
  code: RotaIssueCode;
  severity: "warning" | "critical";
  message: string;
  shiftId?: string;
  employeeId?: string;
  date?: string;
}

export interface AggregateRotaIssuesInput {
  shifts: AutoAssignShift[];
  employees: (AutoAssignEmployee & { forename?: string; surname?: string; date_of_birth?: string | null })[];
  availability: AutoAssignAvailabilitySlot[];
  approvedLeave: AutoAssignLeaveRange[];
  coverageRequirements?: Array<{
    branch: string;
    department: string;
    date: string;
    minimum: number;
  }>;
  minimumBreakHours?: number; // default 11 (UK WTR rest)
}

function toMinutes(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function dayOfWeekForDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

function shiftDurationHours(s: AutoAssignShift): number {
  const mins = toMinutes(s.end_time) - toMinutes(s.start_time);
  return Math.max(0, mins) / 60;
}

export function aggregateRotaIssues(input: AggregateRotaIssuesInput): RotaIssue[] {
  const issues: RotaIssue[] = [];
  const empById = new Map(input.employees.map((e) => [e.id, e]));
  const minRest = input.minimumBreakHours ?? 11;

  for (const shift of input.shifts) {
    if (!shift.employee_id) {
      issues.push({
        code: "unassigned",
        severity: "warning",
        message: `Unassigned shift on ${shift.shift_date} ${shift.start_time}–${shift.end_time}`,
        shiftId: shift.id,
        date: shift.shift_date,
      });
      continue;
    }

    const emp = empById.get(shift.employee_id);
    const name = emp?.forename ? `${emp.forename} ${emp.surname ?? ""}`.trim() : "Employee";

    if (shift.role && emp && emp.role && emp.role !== shift.role) {
      issues.push({
        code: "missing_role",
        severity: "warning",
        message: `${name} assigned to a ${shift.role} shift but their role is ${emp.role}`,
        shiftId: shift.id,
        employeeId: emp.id,
        date: shift.shift_date,
      });
    }

    const onLeave = input.approvedLeave.some(
      (l) =>
        l.employee_id === shift.employee_id &&
        l.status === "approved" &&
        l.start_date <= shift.shift_date &&
        l.end_date >= shift.shift_date
    );
    if (onLeave) {
      issues.push({
        code: "employee_on_leave",
        severity: "critical",
        message: `${name} is on approved leave on ${shift.shift_date}`,
        shiftId: shift.id,
        employeeId: shift.employee_id,
        date: shift.shift_date,
      });
    }

    const dow = dayOfWeekForDate(shift.shift_date);
    const slots = input.availability.filter(
      (s) => s.employee_id === shift.employee_id && s.day_of_week === dow
    );
    if (slots.length > 0) {
      const blocked = slots.every((s) => !s.is_available);
      if (blocked) {
        issues.push({
          code: "employee_unavailable",
          severity: "warning",
          message: `${name} marked unavailable on ${shift.shift_date}`,
          shiftId: shift.id,
          employeeId: shift.employee_id,
          date: shift.shift_date,
        });
      }
    }
  }

  // Overlaps
  const byEmp = new Map<string, AutoAssignShift[]>();
  for (const s of input.shifts) {
    if (!s.employee_id) continue;
    if (!byEmp.has(s.employee_id)) byEmp.set(s.employee_id, []);
    byEmp.get(s.employee_id)!.push(s);
  }
  for (const [empId, list] of byEmp) {
    const sorted = [...list].sort((a, b) =>
      a.shift_date === b.shift_date
        ? a.start_time.localeCompare(b.start_time)
        : a.shift_date.localeCompare(b.shift_date)
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].shift_date === sorted[j].shift_date) {
          if (overlaps(sorted[i].start_time, sorted[i].end_time, sorted[j].start_time, sorted[j].end_time)) {
            issues.push({
              code: "overlapping_shift",
              severity: "critical",
              message: `Overlapping shifts on ${sorted[i].shift_date}`,
              shiftId: sorted[j].id,
              employeeId: empId,
              date: sorted[i].shift_date,
            });
          }
        }
      }
    }
    // Missing break (sequential days)
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.shift_date === b.shift_date) continue;
      const aEnd = new Date(`${a.shift_date}T${a.end_time.slice(0, 5)}:00`).getTime();
      const bStart = new Date(`${b.shift_date}T${b.start_time.slice(0, 5)}:00`).getTime();
      const restH = (bStart - aEnd) / 3_600_000;
      if (restH > 0 && restH < minRest) {
        issues.push({
          code: "missing_break",
          severity: restH < 8 ? "critical" : "warning",
          message: `Only ${restH.toFixed(1)}h rest between ${a.shift_date} and ${b.shift_date} (min ${minRest}h)`,
          shiftId: b.id,
          employeeId: empId,
          date: b.shift_date,
        });
      }
    }
    // Over contracted hours
    const emp = empById.get(empId);
    if (emp?.contracted_weekly_hours && emp.contracted_weekly_hours > 0) {
      const total = sorted.reduce((s, x) => s + shiftDurationHours(x), 0);
      if (total > emp.contracted_weekly_hours * 1.25) {
        issues.push({
          code: "over_contracted_hours",
          severity: "warning",
          message: `${emp.forename ?? "Employee"} scheduled ${total.toFixed(1)}h vs ${emp.contracted_weekly_hours}h contracted`,
          employeeId: empId,
        });
      }
    }

    // Young worker (under 18) Working Time limits — skipped without a date of birth
    if (emp?.date_of_birth) {
      const name = emp.forename ? `${emp.forename} ${emp.surname ?? ""}`.trim() : "Employee";
      const dob = new Date(emp.date_of_birth + "T00:00:00");
      const ageOn = (iso: string): number => {
        const d = new Date(iso + "T00:00:00");
        let age = d.getFullYear() - dob.getFullYear();
        const hadBirthday =
          d.getMonth() > dob.getMonth() ||
          (d.getMonth() === dob.getMonth() && d.getDate() >= dob.getDate());
        if (!hadBirthday) age -= 1;
        return age;
      };
      const young = sorted.filter((s) => ageOn(s.shift_date) < 18);
      if (young.length > 0) {
        // More than 8 hours in a day
        const hoursByDate = new Map<string, number>();
        for (const s of young) {
          hoursByDate.set(s.shift_date, (hoursByDate.get(s.shift_date) ?? 0) + shiftDurationHours(s));
        }
        for (const [date, hours] of hoursByDate) {
          if (hours > 8) {
            issues.push({
              code: "young_worker_limit",
              severity: "critical",
              message: `${name} is under 18 and scheduled ${hours.toFixed(1)}h on ${date} (max 8h/day)`,
              employeeId: empId,
              date,
            });
          }
        }
        // More than 40 hours in the week
        const weekTotal = young.reduce((sum, s) => sum + shiftDurationHours(s), 0);
        if (weekTotal > 40) {
          issues.push({
            code: "young_worker_limit",
            severity: "critical",
            message: `${name} is under 18 and scheduled ${weekTotal.toFixed(1)}h this week (max 40h/week)`,
            employeeId: empId,
          });
        }
        // Less than 12 hours' rest between shifts
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          if (a.shift_date === b.shift_date) continue;
          if (ageOn(b.shift_date) >= 18) continue;
          const aEnd = new Date(`${a.shift_date}T${a.end_time.slice(0, 5)}:00`).getTime();
          const bStart = new Date(`${b.shift_date}T${b.start_time.slice(0, 5)}:00`).getTime();
          const restH = (bStart - aEnd) / 3_600_000;
          if (restH > 0 && restH < 12) {
            issues.push({
              code: "young_worker_limit",
              severity: "critical",
              message: `${name} is under 18 with only ${restH.toFixed(1)}h rest between ${a.shift_date} and ${b.shift_date} (min 12h)`,
              shiftId: b.id,
              employeeId: empId,
              date: b.shift_date,
            });
          }
        }
        // Fewer than 2 days off in the week
        const weekDates = new Set(sorted.map((s) => s.shift_date));
        const daysOff = 7 - weekDates.size;
        if (daysOff < 2) {
          issues.push({
            code: "young_worker_limit",
            severity: "critical",
            message: `${name} is under 18 with only ${daysOff} day${daysOff === 1 ? "" : "s"} off this week (min 2)`,
            employeeId: empId,
          });
        }
        // Any shift over 4.5 hours — 30-minute break required
        for (const s of young) {
          if (shiftDurationHours(s) > 4.5) {
            issues.push({
              code: "young_worker_limit",
              severity: "warning",
              message: `${name} is under 18 with a ${shiftDurationHours(s).toFixed(1)}h shift on ${s.shift_date} — a 30-minute break is required`,
              shiftId: s.id,
              employeeId: empId,
              date: s.shift_date,
            });
          }
        }
      }
    }
  }

  // Coverage requirements
  if (input.coverageRequirements) {
    for (const req of input.coverageRequirements) {
      const count = input.shifts.filter(
        (s) =>
          s.branch === req.branch &&
          s.department === req.department &&
          s.shift_date === req.date &&
          s.employee_id
      ).length;
      if (count < req.minimum) {
        issues.push({
          code: "insufficient_cover",
          severity: "warning",
          message: `${req.department} at ${req.branch} on ${req.date}: ${count}/${req.minimum} staffed`,
          date: req.date,
        });
      }
    }
  }

  return issues;
}
