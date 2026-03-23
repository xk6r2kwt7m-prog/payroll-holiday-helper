import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditSeverity = "pass" | "warning" | "error";

export interface AuditFinding {
  id: string;
  category: "calculation" | "holiday" | "totals" | "duplicates" | "consistency";
  severity: AuditSeverity;
  title: string;
  detail: string;
  explanation?: string;
  suggestedAction?: string;
  actionType?: "recalculate_totals" | "go_to_holiday" | "go_to_details" | "manual_review";
  blocking?: boolean; // defaults to true for errors
  employeeName?: string;
  periodName?: string;
  periodId?: string;
  expected?: number;
  actual?: number;
  difference?: number;
}

export interface AuditResult {
  findings: AuditFinding[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
    blockingErrors: number;
    healthScore: number;
  };
  categories: {
    calculation: { passed: number; warnings: number; errors: number };
    holiday: { passed: number; warnings: number; errors: number };
    totals: { passed: number; warnings: number; errors: number };
    duplicates: { passed: number; warnings: number; errors: number };
    consistency: { passed: number; warnings: number; errors: number };
  };
  timestamp: string;
}

const ACCRUAL_RATE = 0.1207;
const TOLERANCE = 0.02;
const HOURS_TOLERANCE = 0.05;

async function runFullAudit(): Promise<AuditResult> {
  const findings: AuditFinding[] = [];
  let totalChecks = 0;

  // 1. PAYROLL CALCULATION VERIFICATION
  const { data: entries, error: entriesErr } = await supabase
    .from("payroll_entries")
    .select(`
      *,
      employees (id, forename, surname, department, hourly_rate, service_charge),
      payroll_periods (id, period_name, status)
    `)
    .order("created_at", { ascending: false });

  if (entriesErr) throw entriesErr;

  for (const entry of entries || []) {
    totalChecks++;
    const emp = (entry as any).employees;
    const period = (entry as any).payroll_periods;
    const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
    const periodName = period?.period_name || "Unknown Period";

    const calcTotal =
      (Number(entry.timesheet_hours) * Number(entry.hourly_rate))
      + (Number(entry.timesheet_hours) * Number(entry.service_charge || 0))
      + Number(entry.performance_bonus || 0)
      + Number(entry.special_bonus || 0);
    const expectedRounded = Math.round(calcTotal * 100) / 100;
    const actualTotal = Number(entry.total_pay);
    const diff = Math.abs(expectedRounded - actualTotal);

    if (diff > TOLERANCE) {
      findings.push({
        id: `calc-${entry.id}`,
        category: "calculation",
        severity: diff > 1 ? "error" : "warning",
        title: `Total pay mismatch`,
        detail: `${empName} in "${periodName}": expected £${expectedRounded.toFixed(2)} but stored £${actualTotal.toFixed(2)} (diff: £${diff.toFixed(2)})`,
        explanation: "The stored total pay does not match the recalculated value from hours × rate + service charge + bonuses.",
        suggestedAction: "Recalculate this entry's total pay or review the hours/rate manually.",
        actionType: "go_to_details",
        blocking: diff > 1,
        employeeName: empName,
        periodName,
        periodId: period?.id,
        expected: expectedRounded,
        actual: actualTotal,
        difference: diff,
      });
    }

    // Holiday accrual check
    totalChecks++;
    const accrualBase = entry.imported_hours != null ? Number(entry.imported_hours) : Number(entry.timesheet_hours);
    const expectedAccrual = Math.round(accrualBase * ACCRUAL_RATE * 100) / 100;
    const actualAccrual = Number(entry.holiday_accrued_hours || 0);
    const accrualDiff = Math.abs(expectedAccrual - actualAccrual);

    if (accrualDiff > HOURS_TOLERANCE) {
      findings.push({
        id: `accrual-${entry.id}`,
        category: "holiday",
        severity: accrualDiff > 0.5 ? "error" : "warning",
        title: `Holiday accrual mismatch`,
        detail: `${empName} in "${periodName}": expected ${expectedAccrual.toFixed(2)}h (${accrualBase} × 12.07%) but stored ${actualAccrual.toFixed(2)}h`,
        explanation: "The holiday accrual hours do not match the expected 12.07% of worked hours.",
        suggestedAction: "Review the employee's accrual calculation or check if a custom rate applies.",
        actionType: "go_to_holiday",
        blocking: false,
        employeeName: empName,
        periodName,
        periodId: (entry as any).payroll_periods?.id,
        expected: expectedAccrual,
        actual: actualAccrual,
        difference: accrualDiff,
      });
    }
  }

  // 2. PERIOD-LEVEL TOTALS AUDIT
  const { data: periods, error: periodsErr } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("start_date", { ascending: false });

  if (periodsErr) throw periodsErr;

  for (const period of periods || []) {
    // Sum payroll entries (worked payroll)
    const periodEntries = (entries || []).filter((e: any) => e.payroll_period_id === period.id);
    const entriesTotal = periodEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const entriesRounded = Math.round(entriesTotal * 100) / 100;

    // Sum holiday payments
    const { data: holPayments } = await supabase
      .from("holiday_payments")
      .select("total")
      .eq("payroll_period_id", period.id);

    const holidaysSum = (holPayments || []).reduce((s, p) => s + Number(p.total), 0);
    const holidaysRounded = Math.round(holidaysSum * 100) / 100;

    // Check holidays_total
    totalChecks++;
    const storedHolidays = Number(period.holidays_total || 0);
    const holDiff = Math.abs(holidaysRounded - storedHolidays);
    if (holDiff > TOLERANCE) {
      findings.push({
        id: `hol-total-${period.id}`,
        category: "totals",
        severity: holDiff > 5 ? "error" : "warning",
        title: `Holiday total mismatch`,
        detail: `"${period.period_name}": sum of holiday payments = £${holidaysRounded.toFixed(2)} but stored holidays_total = £${storedHolidays.toFixed(2)}`,
        explanation: "The stored holiday total on this period does not match the sum of individual holiday payment records.",
        suggestedAction: "Use 'Recalculate Totals' to sync the stored value with the actual holiday payments.",
        actionType: "recalculate_totals",
        blocking: true,
        periodName: period.period_name,
        periodId: period.id,
        expected: holidaysRounded,
        actual: storedHolidays,
        difference: holDiff,
      });
    }

    // Check worked payroll total (grand_total stores entries-only via DB trigger)
    totalChecks++;
    const storedGrand = Number(period.grand_total || 0);
    const grandDiff = Math.abs(entriesRounded - storedGrand);
    if (grandDiff > TOLERANCE) {
      findings.push({
        id: `worked-total-${period.id}`,
        category: "totals",
        severity: grandDiff > 10 ? "error" : "warning",
        title: `Worked payroll total mismatch`,
        detail: `"${period.period_name}": sum of payroll entries = £${entriesRounded.toFixed(2)} but stored total = £${storedGrand.toFixed(2)}`,
        explanation: "The stored worked payroll total does not match the sum of individual payroll entries. This can happen if entries were modified outside the normal flow.",
        suggestedAction: "Use 'Recalculate Totals' to resync the period totals from the underlying entries.",
        actionType: "recalculate_totals",
        blocking: true,
        periodName: period.period_name,
        periodId: period.id,
        expected: entriesRounded,
        actual: storedGrand,
        difference: grandDiff,
      });
    }
  }

  // 3. HOLIDAY BALANCE RECONCILIATION
  const { data: balances } = await supabase
    .from("holiday_balances")
    .select(`*, employees (id, forename, surname, department, status)`)
    .order("leave_year_start", { ascending: false });

  for (const bal of balances || []) {
    totalChecks++;
    const emp = (bal as any).employees;
    if (!emp) continue;
    const empName = `${emp.forename} ${emp.surname}`;
    const yearStart = bal.leave_year_start;
    const yearEnd = bal.leave_year_end;

    const yearEntries = (entries || []).filter((e: any) => {
      const period = e.payroll_periods;
      if (!period || e.employee_id !== bal.employee_id) return false;
      return period.start_date >= yearStart && period.end_date <= yearEnd;
    });

    const sumAccrued = yearEntries.reduce((s: number, e: any) => s + Number(e.holiday_accrued_hours || 0), 0);
    const sumAccruedRounded = Math.round(sumAccrued * 100) / 100;
    const storedAccrued = Number(bal.hours_accrued || 0);
    const accruedDiff = Math.abs(sumAccruedRounded - storedAccrued);

    if (accruedDiff > HOURS_TOLERANCE) {
      findings.push({
        id: `bal-accrued-${bal.id}`,
        category: "holiday",
        severity: accruedDiff > 2 ? "error" : "warning",
        title: `Balance accrued mismatch`,
        detail: `${empName} (${yearStart} to ${yearEnd}): sum of payroll accruals = ${sumAccruedRounded.toFixed(2)}h but balance shows ${storedAccrued.toFixed(2)}h`,
        explanation: "The holiday balance snapshot does not match the sum of accruals from payroll entries for this leave year.",
        suggestedAction: "Review the employee's holiday balance and accrual entries.",
        actionType: "go_to_holiday",
        blocking: false,
        employeeName: empName,
        expected: sumAccruedRounded,
        actual: storedAccrued,
        difference: accruedDiff,
      });
    }

    totalChecks++;
    const { data: empHolPayments } = await supabase
      .from("holiday_payments")
      .select("hours")
      .eq("employee_id", bal.employee_id)
      .eq("leave_year_start", yearStart)
      .eq("leave_year_end", yearEnd);

    const sumTaken = (empHolPayments || []).reduce((s, p) => s + Number(p.hours), 0);
    const sumTakenRounded = Math.round(sumTaken * 100) / 100;
    const storedTaken = Number(bal.hours_taken || 0);
    const takenDiff = Math.abs(sumTakenRounded - storedTaken);

    if (takenDiff > HOURS_TOLERANCE) {
      findings.push({
        id: `bal-taken-${bal.id}`,
        category: "holiday",
        severity: takenDiff > 2 ? "error" : "warning",
        title: `Balance taken mismatch`,
        detail: `${empName} (${yearStart} to ${yearEnd}): sum of holiday payments = ${sumTakenRounded.toFixed(2)}h but balance shows ${storedTaken.toFixed(2)}h`,
        explanation: "The 'hours taken' in the holiday balance does not match the sum of holiday payment records.",
        suggestedAction: "Review the employee's holiday payments and balance record.",
        actionType: "go_to_holiday",
        blocking: false,
        employeeName: empName,
        expected: sumTakenRounded,
        actual: storedTaken,
        difference: takenDiff,
      });
    }
  }

  // 4. CROSS-PERIOD DUPLICATE DETECTION
  const sortedPeriods = [...(periods || [])].sort((a, b) => a.start_date.localeCompare(b.start_date));

  for (let i = 0; i < sortedPeriods.length; i++) {
    for (let j = i + 1; j < sortedPeriods.length; j++) {
      const p1 = sortedPeriods[i];
      const p2 = sortedPeriods[j];

      if (p1.end_date >= p2.start_date && p1.start_date <= p2.end_date) {
        totalChecks++;
        const p1Entries = (entries || []).filter((e: any) => e.payroll_period_id === p1.id);
        const p2Entries = (entries || []).filter((e: any) => e.payroll_period_id === p2.id);

        const p1Employees = new Set(p1Entries.map((e: any) => e.employee_id));
        const dupes = p2Entries.filter((e: any) => p1Employees.has(e.employee_id));

        if (dupes.length > 0) {
          const dupeNames = dupes.map((d: any) => {
            const emp = d.employees;
            return emp ? `${emp.forename} ${emp.surname}` : "Unknown";
          }).join(", ");

          findings.push({
            id: `dupe-${p1.id}-${p2.id}`,
            category: "duplicates",
            severity: "error",
            title: `Overlapping periods with shared employees`,
            detail: `"${p1.period_name}" overlaps with "${p2.period_name}". ${dupes.length} employee(s) in both: ${dupeNames}`,
            explanation: "These two payroll periods have overlapping date ranges and share employees, which could cause double-payment.",
            suggestedAction: "Review the period date ranges and remove duplicate entries.",
            actionType: "go_to_details",
            blocking: true,
            periodName: `${p1.period_name} / ${p2.period_name}`,
          });
        }
      }
    }
  }

  // Same-period duplicates
  for (const period of periods || []) {
    totalChecks++;
    const periodEntries = (entries || []).filter((e: any) => e.payroll_period_id === period.id);
    const empIds = periodEntries.map((e: any) => e.employee_id);
    const seen = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const id of empIds) {
      if (seen.has(id)) duplicateIds.add(id);
      seen.add(id);
    }

    if (duplicateIds.size > 0) {
      const dupeNames = [...duplicateIds].map(id => {
        const entry = periodEntries.find((e: any) => e.employee_id === id);
        const emp = (entry as any)?.employees;
        return emp ? `${emp.forename} ${emp.surname}` : id;
      }).join(", ");

      findings.push({
        id: `dupe-single-${period.id}`,
        category: "duplicates",
        severity: "error",
        title: `Duplicate employee entries in period`,
        detail: `"${period.period_name}": ${duplicateIds.size} employee(s) appear more than once: ${dupeNames}`,
        explanation: "An employee has been added to this payroll period more than once, which will cause incorrect totals.",
        suggestedAction: "Remove the duplicate entry from Payroll Details.",
        actionType: "go_to_details",
        blocking: true,
        periodName: period.period_name,
        periodId: period.id,
      });
    }
  }

  // 5. HOURS CONSISTENCY CHECK
  const WEEKLY_HOURS_WARN_THRESHOLD = 0.40;
  const WEEKLY_HOURS_ERROR_THRESHOLD = 0.80;
  const MIN_HISTORY_PERIODS = 1;

  const employeeHistory: Record<string, { periodId: string; weeklyHours: number; periodName: string; totalHours: number }[]> = {};

  for (const period of periods || []) {
    const periodEntries = (entries || []).filter((e: any) => e.payroll_period_id === period.id);
    const periodWeeks = Number(period.period_weeks) || 4;

    for (const entry of periodEntries) {
      const empId = entry.employee_id;
      const totalHours = Number(entry.timesheet_hours);
      const weeklyHours = totalHours / periodWeeks;

      if (!employeeHistory[empId]) employeeHistory[empId] = [];
      employeeHistory[empId].push({ periodId: period.id, weeklyHours, periodName: period.period_name, totalHours });
    }
  }

  for (const [empId, history] of Object.entries(employeeHistory)) {
    if (history.length <= MIN_HISTORY_PERIODS) continue;

    for (const current of history) {
      totalChecks++;
      const others = history.filter(h => h.periodId !== current.periodId);
      if (others.length === 0) continue;

      const avgWeekly = others.reduce((s, h) => s + h.weeklyHours, 0) / others.length;
      if (avgWeekly < 1) continue;

      const deviation = Math.abs(current.weeklyHours - avgWeekly) / avgWeekly;
      const empEntry = (entries || []).find((e: any) => e.employee_id === empId);
      const emp = (empEntry as any)?.employees;
      const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";

      if (deviation >= WEEKLY_HOURS_ERROR_THRESHOLD) {
        findings.push({
          id: `consistency-${empId}-${current.periodId}`,
          category: "consistency",
          severity: "error",
          title: `Major hours deviation`,
          detail: `${empName} in "${current.periodName}": ${current.weeklyHours.toFixed(1)} hrs/wk vs historical avg ${avgWeekly.toFixed(1)} hrs/wk (${(deviation * 100).toFixed(0)}% change)`,
          explanation: "This employee's hours are significantly different from their historical average. This could indicate a data entry error or a genuine change in working pattern.",
          suggestedAction: "Verify the timesheet hours are correct for this period.",
          actionType: "go_to_details",
          blocking: false,
          employeeName: empName,
          periodName: current.periodName,
          expected: avgWeekly,
          actual: current.weeklyHours,
          difference: current.weeklyHours - avgWeekly,
        });
      } else if (deviation >= WEEKLY_HOURS_WARN_THRESHOLD) {
        findings.push({
          id: `consistency-${empId}-${current.periodId}`,
          category: "consistency",
          severity: "warning",
          title: `Unusual hours change`,
          detail: `${empName} in "${current.periodName}": ${current.weeklyHours.toFixed(1)} hrs/wk vs historical avg ${avgWeekly.toFixed(1)} hrs/wk (${(deviation * 100).toFixed(0)}% change)`,
          explanation: "This employee's hours deviate from their average. Could be extra shifts or reduced hours.",
          suggestedAction: "Review if this is expected — no action needed if the hours are correct.",
          actionType: "manual_review",
          blocking: false,
          employeeName: empName,
          periodName: current.periodName,
          expected: avgWeekly,
          actual: current.weeklyHours,
          difference: current.weeklyHours - avgWeekly,
        });
      }
    }
  }

  // COMPILE RESULTS
  const errors = findings.filter(f => f.severity === "error").length;
  const blockingErrors = findings.filter(f => f.severity === "error" && f.blocking !== false).length;
  const warnings = findings.filter(f => f.severity === "warning").length;
  const passed = totalChecks - errors - warnings;

  const healthScore = totalChecks > 0
    ? Math.max(0, Math.round(((passed - errors * 2) / totalChecks) * 100))
    : 100;

  const categorize = (cat: AuditFinding["category"]) => {
    const catFindings = findings.filter(f => f.category === cat);
    const catErrors = catFindings.filter(f => f.severity === "error").length;
    const catWarnings = catFindings.filter(f => f.severity === "warning").length;
    const catTotal = cat === "calculation"
      ? (entries || []).length
      : cat === "totals"
      ? (periods || []).length * 2
      : cat === "duplicates"
      ? (periods || []).length + (periods || []).length * ((periods || []).length - 1) / 2
      : cat === "consistency"
      ? Object.values(employeeHistory).reduce((s, h) => s + (h.length > MIN_HISTORY_PERIODS ? h.length : 0), 0)
      : (balances || []).length * 2;
    return {
      passed: Math.max(0, Number(catTotal) - catErrors - catWarnings),
      warnings: catWarnings,
      errors: catErrors,
    };
  };

  return {
    findings,
    summary: {
      totalChecks,
      passed,
      warnings,
      errors,
      blockingErrors,
      healthScore,
    },
    categories: {
      calculation: categorize("calculation"),
      holiday: categorize("holiday"),
      totals: categorize("totals"),
      duplicates: categorize("duplicates"),
      consistency: categorize("consistency"),
    },
    timestamp: new Date().toISOString(),
  };
}

// Run audit for a specific period (used by approval gate)
export async function runPeriodAudit(periodId: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const { data: period } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();

  if (!period) return findings;

  const { data: entries } = await supabase
    .from("payroll_entries")
    .select(`*, employees (id, forename, surname, department)`)
    .eq("payroll_period_id", periodId);

  // 1. Verify each entry's calculation
  for (const entry of entries || []) {
    const emp = (entry as any).employees;
    const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";

    const calcTotal =
      (Number(entry.timesheet_hours) * Number(entry.hourly_rate))
      + (Number(entry.timesheet_hours) * Number(entry.service_charge || 0))
      + Number(entry.performance_bonus || 0)
      + Number(entry.special_bonus || 0);
    const expected = Math.round(calcTotal * 100) / 100;
    const actual = Number(entry.total_pay);
    const diff = Math.abs(expected - actual);

    if (diff > TOLERANCE) {
      findings.push({
        id: `calc-${entry.id}`,
        category: "calculation",
        severity: diff > 1 ? "error" : "warning",
        title: `Total pay mismatch: ${empName}`,
        detail: `Expected £${expected.toFixed(2)}, stored £${actual.toFixed(2)} (diff: £${diff.toFixed(2)})`,
        explanation: "Stored total does not match recalculated value.",
        suggestedAction: "Recalculate totals or review this entry.",
        actionType: "recalculate_totals",
        blocking: diff > 1,
        employeeName: empName,
        periodName: period.period_name,
        periodId: period.id,
        expected,
        actual,
        difference: diff,
      });
    }

    // Accrual check
    const accrualBase = entry.imported_hours != null ? Number(entry.imported_hours) : Number(entry.timesheet_hours);
    const expectedAccrual = Math.round(accrualBase * ACCRUAL_RATE * 100) / 100;
    const actualAccrual = Number(entry.holiday_accrued_hours || 0);
    const accrualDiff = Math.abs(expectedAccrual - actualAccrual);

    if (accrualDiff > HOURS_TOLERANCE) {
      findings.push({
        id: `accrual-${entry.id}`,
        category: "holiday",
        severity: accrualDiff > 0.5 ? "error" : "warning",
        title: `Holiday accrual mismatch: ${empName}`,
        detail: `Expected ${expectedAccrual.toFixed(2)}h, stored ${actualAccrual.toFixed(2)}h`,
        explanation: "Holiday accrual does not match 12.07% of worked hours.",
        suggestedAction: "Review accrual calculation.",
        actionType: "go_to_holiday",
        blocking: false,
        employeeName: empName,
        periodName: period.period_name,
        periodId: period.id,
        expected: expectedAccrual,
        actual: actualAccrual,
        difference: accrualDiff,
      });
    }
  }

  // 2. Period totals — check worked payroll and holiday separately
  const entriesTotal = (entries || []).reduce((s: number, e: any) => s + Number(e.total_pay), 0);
  const entriesRounded = Math.round(entriesTotal * 100) / 100;

  const { data: holPayments } = await supabase
    .from("holiday_payments")
    .select("total")
    .eq("payroll_period_id", periodId);
  const holidaysSum = (holPayments || []).reduce((s, p) => s + Number(p.total), 0);
  const holidaysRounded = Math.round(holidaysSum * 100) / 100;

  const storedHolidays = Number(period.holidays_total || 0);
  if (Math.abs(holidaysRounded - storedHolidays) > TOLERANCE) {
    findings.push({
      id: `hol-total-${periodId}`,
      category: "totals",
      severity: "error",
      title: `Holiday total mismatch`,
      detail: `Sum of holiday payments: £${holidaysRounded.toFixed(2)}, stored: £${storedHolidays.toFixed(2)}`,
      explanation: "The stored holiday total does not match the sum of holiday payment records for this period.",
      suggestedAction: "Use 'Recalculate Totals' to resync.",
      actionType: "recalculate_totals",
      blocking: true,
      periodName: period.period_name,
      periodId: period.id,
      expected: holidaysRounded,
      actual: storedHolidays,
    });
  }

  // Worked payroll total (grand_total = entries only, per DB trigger)
  const storedGrand = Number(period.grand_total || 0);
  if (Math.abs(entriesRounded - storedGrand) > TOLERANCE) {
    findings.push({
      id: `worked-total-${periodId}`,
      category: "totals",
      severity: "error",
      title: `Worked payroll total mismatch`,
      detail: `Sum of entries: £${entriesRounded.toFixed(2)}, stored: £${storedGrand.toFixed(2)}`,
      explanation: "The stored worked payroll total does not match the sum of payroll entries.",
      suggestedAction: "Use 'Recalculate Totals' to resync.",
      actionType: "recalculate_totals",
      blocking: true,
      periodName: period.period_name,
      periodId: period.id,
      expected: entriesRounded,
      actual: storedGrand,
    });
  }

  // 3. Duplicate employee check
  const empIds = (entries || []).map((e: any) => e.employee_id);
  const seen = new Set<string>();
  for (const id of empIds) {
    if (seen.has(id)) {
      const entry = (entries || []).find((e: any) => e.employee_id === id);
      const emp = (entry as any)?.employees;
      findings.push({
        id: `dupe-${periodId}-${id}`,
        category: "duplicates",
        severity: "error",
        title: `Duplicate employee entry`,
        detail: `${emp ? `${emp.forename} ${emp.surname}` : id} appears more than once`,
        explanation: "This employee has multiple entries in the same payroll period.",
        suggestedAction: "Remove the duplicate entry.",
        actionType: "go_to_details",
        blocking: true,
        employeeName: emp ? `${emp.forename} ${emp.surname}` : undefined,
        periodName: period.period_name,
        periodId: period.id,
      });
    }
    seen.add(id);
  }

  return findings;
}

export function usePayrollAudit(enabled = true, tenantId?: string | null) {
  return useQuery({
    queryKey: ["payroll_audit", tenantId],
    queryFn: runFullAudit,
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function usePeriodAudit(periodId: string | undefined, enabled = true, tenantId?: string | null) {
  return useQuery({
    queryKey: ["payroll_audit", tenantId, "period", periodId],
    queryFn: () => runPeriodAudit(periodId!),
    enabled: enabled && !!periodId && !!tenantId,
    staleTime: 1000 * 60 * 2,
  });
}

// Hook to recalculate period totals
export function useRecalculatePeriodTotals() {
  const queryClient = useQueryClient();

  return async (periodId: string) => {
    // Sum entries
    const { data: entries } = await supabase
      .from("payroll_entries")
      .select("total_pay")
      .eq("payroll_period_id", periodId);

    const entriesTotal = (entries || []).reduce((s, e) => s + Number(e.total_pay), 0);
    const entriesRounded = Math.round(entriesTotal * 100) / 100;

    // Sum holiday payments
    const { data: holPayments } = await supabase
      .from("holiday_payments")
      .select("total")
      .eq("payroll_period_id", periodId);

    const holidaysTotal = (holPayments || []).reduce((s, p) => s + Number(p.total), 0);
    const holidaysRounded = Math.round(holidaysTotal * 100) / 100;

    // Update period
    const { error } = await supabase
      .from("payroll_periods")
      .update({
        grand_total: entriesRounded,
        holidays_total: holidaysRounded,
      } as any)
      .eq("id", periodId);

    if (error) throw error;

    // Invalidate audit queries
    queryClient.invalidateQueries({ queryKey: ["payroll_audit"] });
    queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
  };
}
