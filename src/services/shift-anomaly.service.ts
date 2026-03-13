/**
 * Shift Anomaly Detection Service
 * Analyses time entries against scheduled shifts to detect operational problems.
 * Advisory only — does NOT modify existing schedule or payroll logic.
 */

export type AlertType =
  | "missing_clockout"
  | "early_clockin"
  | "late_clockin"
  | "overtime"
  | "unscheduled_work";

export interface ShiftAlert {
  employeeId: string;
  employeeName: string;
  shiftId: string | null;
  timeEntryId: string | null;
  alertType: AlertType;
  alertMessage: string;
  /** Minutes delta (positive = late/over, negative = early) */
  deltaMinutes?: number;
}

interface TimeEntryRow {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: string;
  shift_id?: string | null;
  total_hours?: number | null;
  employees?: { id: string; forename: string; surname: string } | null;
}

interface ShiftRow {
  id: string;
  employee_id: string | null;
  shift_date: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
}

const EARLY_THRESHOLD_MINUTES = 15;
const LATE_THRESHOLD_MINUTES = 15;

function empName(entry: TimeEntryRow): string {
  if (entry.employees) return `${entry.employees.forename} ${entry.employees.surname}`;
  return entry.employee_id;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Run anomaly detection for a given date's time entries + shifts.
 */
export function detectShiftAnomalies(
  entries: TimeEntryRow[],
  shifts: ShiftRow[],
): ShiftAlert[] {
  const alerts: ShiftAlert[] = [];

  // Index shifts by employee_id for fast lookup
  const shiftsByEmployee = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    if (!s.employee_id) continue;
    const arr = shiftsByEmployee.get(s.employee_id) || [];
    arr.push(s);
    shiftsByEmployee.set(s.employee_id, arr);
  }

  for (const entry of entries) {
    const name = empName(entry);
    const employeeShifts = shiftsByEmployee.get(entry.employee_id) || [];
    const clockIn = new Date(entry.clock_in_time);
    const clockInMins = clockIn.getHours() * 60 + clockIn.getMinutes();

    // 1. Missing clock-out
    if (!entry.clock_out_time && entry.status === "clocked_in") {
      alerts.push({
        employeeId: entry.employee_id,
        employeeName: name,
        shiftId: entry.shift_id || null,
        timeEntryId: entry.id,
        alertType: "missing_clockout",
        alertMessage: `${name} missing clock-out`,
      });
    }

    // Find matching shift (same date)
    const clockInDate = clockIn.toISOString().slice(0, 10);
    const matchingShift = employeeShifts.find((s) => s.shift_date === clockInDate);

    if (matchingShift) {
      const scheduledStart = timeToMinutes(matchingShift.start_time);
      const scheduledEnd = timeToMinutes(matchingShift.end_time);
      const scheduledDuration = scheduledEnd > scheduledStart
        ? scheduledEnd - scheduledStart
        : (24 * 60 - scheduledStart) + scheduledEnd;

      // 2. Early clock-in
      const earlyDelta = scheduledStart - clockInMins;
      if (earlyDelta > EARLY_THRESHOLD_MINUTES) {
        alerts.push({
          employeeId: entry.employee_id,
          employeeName: name,
          shiftId: matchingShift.id,
          timeEntryId: entry.id,
          alertType: "early_clockin",
          alertMessage: `${name} clocked in ${earlyDelta} minutes early`,
          deltaMinutes: -earlyDelta,
        });
      }

      // 3. Late clock-in
      const lateDelta = clockInMins - scheduledStart;
      if (lateDelta > LATE_THRESHOLD_MINUTES) {
        alerts.push({
          employeeId: entry.employee_id,
          employeeName: name,
          shiftId: matchingShift.id,
          timeEntryId: entry.id,
          alertType: "late_clockin",
          alertMessage: `${name} clocked in ${lateDelta} minutes late`,
          deltaMinutes: lateDelta,
        });
      }

      // 4. Overtime
      if (entry.clock_out_time && entry.total_hours) {
        const scheduledHours = scheduledDuration / 60;
        const overtimeHours = entry.total_hours - scheduledHours;
        if (overtimeHours > 0.25) {
          alerts.push({
            employeeId: entry.employee_id,
            employeeName: name,
            shiftId: matchingShift.id,
            timeEntryId: entry.id,
            alertType: "overtime",
            alertMessage: `${name} worked ${overtimeHours.toFixed(1)} hours overtime`,
            deltaMinutes: Math.round(overtimeHours * 60),
          });
        }
      }
    } else {
      // 5. Unscheduled work
      alerts.push({
        employeeId: entry.employee_id,
        employeeName: name,
        shiftId: null,
        timeEntryId: entry.id,
        alertType: "unscheduled_work",
        alertMessage: `${name} clocked in without a scheduled shift`,
      });
    }
  }

  return alerts;
}
