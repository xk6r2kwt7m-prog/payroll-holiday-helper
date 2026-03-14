/* ─── Labour Cost Simulation Engine ─── */
/* Pure functions — no side effects, no DB writes */

export interface ShiftRow {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  role: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  isPublished: boolean;
}

export interface WhatIfAction {
  type: "add" | "remove" | "extend" | "shorten" | "swap" | "move";
  shiftId?: string;
  /** For "add" */
  employeeId?: string;
  employeeName?: string;
  branch?: string;
  role?: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  hourlyRate?: number;
  /** For "extend"/"shorten" — delta in hours */
  hoursDelta?: number;
  /** For "move" — target branch */
  targetBranch?: string;
  /** For "swap" — replacement employee */
  replacementId?: string;
  replacementName?: string;
  replacementRate?: number;
}

export interface LabourCostRow {
  employeeId: string;
  employeeName: string;
  branch: string;
  role: string;
  shiftDate: string;
  hours: number;
  cost: number;
  overtimeHours: number;
  overtimeCost: number;
}

export interface LabourCostResult {
  rows: LabourCostRow[];
  totalHours: number;
  totalCost: number;
  totalOvertimeHours: number;
  totalOvertimeCost: number;
  avgHourlyCost: number;
  byDay: Record<string, { hours: number; cost: number }>;
  byBranch: Record<string, { hours: number; cost: number }>;
  byRole: Record<string, { hours: number; cost: number }>;
  byEmployee: Record<string, { hours: number; cost: number; name: string }>;
  warnings: LabourWarning[];
}

export interface LabourWarning {
  type: "error" | "warning" | "info";
  message: string;
}

export interface LabourBudget {
  dailyBudget?: number;
  weeklyBudget?: number;
  labourPercentTarget?: number;
  revenue?: number;
}

/* ─── Helpers ─── */

function calcShiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let hours = eh + em / 60 - (sh + sm / 60);
  if (hours < 0) hours += 24; // overnight
  return Math.round(hours * 100) / 100;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* ─── Apply what-if actions ─── */

export function applyWhatIf(shifts: ShiftRow[], actions: WhatIfAction[]): ShiftRow[] {
  let result = [...shifts];
  let nextId = 9000;

  for (const action of actions) {
    switch (action.type) {
      case "add":
        result.push({
          id: `sim-${nextId++}`,
          employeeId: action.employeeId || "",
          employeeName: action.employeeName || "New Employee",
          branch: action.branch || "",
          role: action.role || "Staff",
          shiftDate: action.shiftDate || "",
          startTime: action.startTime || "09:00",
          endTime: action.endTime || "17:00",
          hourlyRate: action.hourlyRate || 0,
          isPublished: false,
        });
        break;

      case "remove":
        result = result.filter((s) => s.id !== action.shiftId);
        break;

      case "extend": {
        const idx = result.findIndex((s) => s.id === action.shiftId);
        if (idx >= 0) {
          const s = result[idx];
          const [eh, em] = s.endTime.split(":").map(Number);
          const totalMin = eh * 60 + em + (action.hoursDelta || 0) * 60;
          const newH = Math.floor(totalMin / 60) % 24;
          const newM = Math.floor(totalMin % 60);
          result[idx] = { ...s, endTime: `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}` };
        }
        break;
      }

      case "shorten": {
        const idx = result.findIndex((s) => s.id === action.shiftId);
        if (idx >= 0) {
          const s = result[idx];
          const [eh, em] = s.endTime.split(":").map(Number);
          const totalMin = Math.max(0, eh * 60 + em - (action.hoursDelta || 0) * 60);
          const newH = Math.floor(totalMin / 60) % 24;
          const newM = Math.floor(totalMin % 60);
          result[idx] = { ...s, endTime: `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}` };
        }
        break;
      }

      case "move": {
        const idx = result.findIndex((s) => s.id === action.shiftId);
        if (idx >= 0 && action.targetBranch) {
          result[idx] = { ...result[idx], branch: action.targetBranch };
        }
        break;
      }

      case "swap": {
        const idx = result.findIndex((s) => s.id === action.shiftId);
        if (idx >= 0 && action.replacementId) {
          result[idx] = {
            ...result[idx],
            employeeId: action.replacementId,
            employeeName: action.replacementName || "Replacement",
            hourlyRate: action.replacementRate || result[idx].hourlyRate,
          };
        }
        break;
      }
    }
  }

  return result;
}

/* ─── Core simulation ─── */

export function calculateLabourCost(
  shifts: ShiftRow[],
  budget?: LabourBudget,
  overtimeThresholdWeekly = 44,
): LabourCostResult {
  const warnings: LabourWarning[] = [];
  const rows: LabourCostRow[] = [];

  // Track weekly hours per employee for overtime
  const weeklyHoursMap = new Map<string, number>();

  for (const shift of shifts) {
    const hours = calcShiftHours(shift.startTime, shift.endTime);
    const prevWeekly = weeklyHoursMap.get(shift.employeeId) || 0;
    const newWeeklyTotal = prevWeekly + hours;
    weeklyHoursMap.set(shift.employeeId, newWeeklyTotal);

    let overtimeHours = 0;
    if (newWeeklyTotal > overtimeThresholdWeekly) {
      overtimeHours = Math.min(hours, newWeeklyTotal - overtimeThresholdWeekly);
    }

    const regularHours = hours - overtimeHours;
    const cost = round2(regularHours * shift.hourlyRate + overtimeHours * shift.hourlyRate * 1.5);
    const overtimeCost = round2(overtimeHours * shift.hourlyRate * 0.5); // extra cost

    rows.push({
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      branch: shift.branch,
      role: shift.role,
      shiftDate: shift.shiftDate,
      hours,
      cost: round2(hours * shift.hourlyRate),
      overtimeHours,
      overtimeCost,
    });
  }

  // Aggregations
  const totalHours = round2(rows.reduce((s, r) => s + r.hours, 0));
  const totalCost = round2(rows.reduce((s, r) => s + r.cost, 0));
  const totalOvertimeHours = round2(rows.reduce((s, r) => s + r.overtimeHours, 0));
  const totalOvertimeCost = round2(rows.reduce((s, r) => s + r.overtimeCost, 0));
  const avgHourlyCost = totalHours > 0 ? round2(totalCost / totalHours) : 0;

  const byDay: Record<string, { hours: number; cost: number }> = {};
  const byBranch: Record<string, { hours: number; cost: number }> = {};
  const byRole: Record<string, { hours: number; cost: number }> = {};
  const byEmployee: Record<string, { hours: number; cost: number; name: string }> = {};

  for (const r of rows) {
    byDay[r.shiftDate] = byDay[r.shiftDate] || { hours: 0, cost: 0 };
    byDay[r.shiftDate].hours += r.hours;
    byDay[r.shiftDate].cost += r.cost;

    byBranch[r.branch] = byBranch[r.branch] || { hours: 0, cost: 0 };
    byBranch[r.branch].hours += r.hours;
    byBranch[r.branch].cost += r.cost;

    byRole[r.role] = byRole[r.role] || { hours: 0, cost: 0 };
    byRole[r.role].hours += r.hours;
    byRole[r.role].cost += r.cost;

    byEmployee[r.employeeId] = byEmployee[r.employeeId] || { hours: 0, cost: 0, name: r.employeeName };
    byEmployee[r.employeeId].hours += r.hours;
    byEmployee[r.employeeId].cost += r.cost;
  }

  // Round aggregations
  for (const key of Object.keys(byDay)) { byDay[key].hours = round2(byDay[key].hours); byDay[key].cost = round2(byDay[key].cost); }
  for (const key of Object.keys(byBranch)) { byBranch[key].hours = round2(byBranch[key].hours); byBranch[key].cost = round2(byBranch[key].cost); }
  for (const key of Object.keys(byRole)) { byRole[key].hours = round2(byRole[key].hours); byRole[key].cost = round2(byRole[key].cost); }
  for (const key of Object.keys(byEmployee)) { byEmployee[key].hours = round2(byEmployee[key].hours); byEmployee[key].cost = round2(byEmployee[key].cost); }

  // Warnings
  if (totalOvertimeHours > 0) {
    warnings.push({ type: "warning", message: `${totalOvertimeHours.toFixed(1)}h overtime detected across ${weeklyHoursMap.size > 0 ? Array.from(weeklyHoursMap.entries()).filter(([, h]) => h > overtimeThresholdWeekly).length : 0} employee(s).` });
  }

  // Budget warnings
  if (budget?.dailyBudget) {
    for (const [day, data] of Object.entries(byDay)) {
      if (data.cost > budget.dailyBudget) {
        warnings.push({ type: "warning", message: `${day}: £${data.cost.toFixed(2)} exceeds daily budget of £${budget.dailyBudget.toFixed(2)}.` });
      }
    }
  }
  if (budget?.weeklyBudget && totalCost > budget.weeklyBudget) {
    warnings.push({ type: "error", message: `Total £${totalCost.toFixed(2)} exceeds weekly budget of £${budget.weeklyBudget.toFixed(2)}.` });
  }
  if (budget?.labourPercentTarget && budget.revenue && budget.revenue > 0) {
    const actual = (totalCost / budget.revenue) * 100;
    if (actual > budget.labourPercentTarget) {
      warnings.push({ type: "warning", message: `Labour at ${actual.toFixed(1)}% of revenue — target is ${budget.labourPercentTarget}%.` });
    }
  }

  // Unassigned shifts
  const unassigned = shifts.filter((s) => !s.employeeId);
  if (unassigned.length > 0) {
    warnings.push({ type: "info", message: `${unassigned.length} unassigned shift(s) in the schedule.` });
  }

  return {
    rows,
    totalHours,
    totalCost,
    totalOvertimeHours,
    totalOvertimeCost,
    avgHourlyCost,
    byDay,
    byBranch,
    byRole,
    byEmployee,
    warnings,
  };
}

/* ─── Comparison ─── */

export interface LabourCostComparison {
  costDiff: number;
  hoursDiff: number;
  overtimeDiff: number;
  byBranch: Record<string, { costA: number; costB: number; diff: number }>;
  byRole: Record<string, { costA: number; costB: number; diff: number }>;
  byEmployee: Record<string, { name: string; costA: number; costB: number; diff: number }>;
}

export function compareLabourCost(a: LabourCostResult, b: LabourCostResult): LabourCostComparison {
  const byBranch: Record<string, { costA: number; costB: number; diff: number }> = {};
  const allBranches = new Set([...Object.keys(a.byBranch), ...Object.keys(b.byBranch)]);
  for (const br of allBranches) {
    const costA = a.byBranch[br]?.cost || 0;
    const costB = b.byBranch[br]?.cost || 0;
    byBranch[br] = { costA, costB, diff: round2(costB - costA) };
  }

  const byRole: Record<string, { costA: number; costB: number; diff: number }> = {};
  const allRoles = new Set([...Object.keys(a.byRole), ...Object.keys(b.byRole)]);
  for (const r of allRoles) {
    const costA = a.byRole[r]?.cost || 0;
    const costB = b.byRole[r]?.cost || 0;
    byRole[r] = { costA, costB, diff: round2(costB - costA) };
  }

  const byEmployee: Record<string, { name: string; costA: number; costB: number; diff: number }> = {};
  const allEmps = new Set([...Object.keys(a.byEmployee), ...Object.keys(b.byEmployee)]);
  for (const e of allEmps) {
    const costA = a.byEmployee[e]?.cost || 0;
    const costB = b.byEmployee[e]?.cost || 0;
    const name = a.byEmployee[e]?.name || b.byEmployee[e]?.name || "Unknown";
    byEmployee[e] = { name, costA, costB, diff: round2(costB - costA) };
  }

  return {
    costDiff: round2(b.totalCost - a.totalCost),
    hoursDiff: round2(b.totalHours - a.totalHours),
    overtimeDiff: round2(b.totalOvertimeHours - a.totalOvertimeHours),
    byBranch,
    byRole,
    byEmployee,
  };
}
