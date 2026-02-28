import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditSeverity = "pass" | "warning" | "error";

export interface AuditFinding {
  id: string;
  category: "calculation" | "holiday" | "totals" | "duplicates" | "consistency";
  severity: AuditSeverity;
  title: string;
  detail: string;
  employeeName?: string;
  periodName?: string;
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
    healthScore: number; // 0-100
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
const TOLERANCE = 0.02; // £0.02 tolerance for rounding
const HOURS_TOLERANCE = 0.05; // 0.05 hours tolerance

async function runFullAudit(): Promise<AuditResult> {
  const findings: AuditFinding[] = [];
  let totalChecks = 0;

  // ============================================
  // 1. PAYROLL CALCULATION VERIFICATION
  // ============================================
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

    // Check: total_pay = (hours × rate) + (hours × service_charge) + perf_bonus + special_bonus
    const expectedTotal = Math.round(
      (Number(entry.timesheet_hours) * Number(entry.hourly_rate))
      + (Number(entry.timesheet_hours) * Number(entry.service_charge || 0))
      + Number(entry.performance_bonus || 0)
      + Number(entry.special_bonus || 0)
    * 100) / 100;

    // Fix: recalculate properly
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
        employeeName: empName,
        periodName,
        expected: expectedRounded,
        actual: actualTotal,
        difference: diff,
      });
    }

    // Check: holiday accrual = 12.07% of COALESCE(imported_hours, timesheet_hours)
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
        employeeName: empName,
        periodName,
        expected: expectedAccrual,
        actual: actualAccrual,
        difference: accrualDiff,
      });
    }
  }

  // ============================================
  // 2. PERIOD-LEVEL TOTALS AUDIT
  // ============================================
  const { data: periods, error: periodsErr } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("start_date", { ascending: false });

  if (periodsErr) throw periodsErr;

  for (const period of periods || []) {
    totalChecks++;

    // Sum payroll entries for this period
    const periodEntries = (entries || []).filter((e: any) => e.payroll_period_id === period.id);
    const entriesTotal = periodEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const entriesRounded = Math.round(entriesTotal * 100) / 100;

    // Sum holiday payments for this period
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
        title: `Holiday total mismatch on period`,
        detail: `"${period.period_name}": sum of holiday payments = £${holidaysRounded.toFixed(2)} but stored holidays_total = £${storedHolidays.toFixed(2)}`,
        periodName: period.period_name,
        expected: holidaysRounded,
        actual: storedHolidays,
        difference: holDiff,
      });
    }

    // Check grand_total = entries + holidays
    const expectedGrand = Math.round((entriesRounded + holidaysRounded) * 100) / 100;
    const storedGrand = Number(period.grand_total || 0);
    const grandDiff = Math.abs(expectedGrand - storedGrand);
    if (grandDiff > TOLERANCE) {
      findings.push({
        id: `grand-total-${period.id}`,
        category: "totals",
        severity: grandDiff > 10 ? "error" : "warning",
        title: `Grand total mismatch on period`,
        detail: `"${period.period_name}": entries (£${entriesRounded.toFixed(2)}) + holidays (£${holidaysRounded.toFixed(2)}) = £${expectedGrand.toFixed(2)} but stored grand_total = £${storedGrand.toFixed(2)}`,
        periodName: period.period_name,
        expected: expectedGrand,
        actual: storedGrand,
        difference: grandDiff,
      });
    }
  }

  // ============================================
  // 3. HOLIDAY BALANCE RECONCILIATION
  // ============================================
  const { data: balances } = await supabase
    .from("holiday_balances")
    .select(`
      *,
      employees (id, forename, surname, department, status)
    `)
    .order("leave_year_start", { ascending: false });

  // For each balance, verify accrued = sum of accruals from payroll entries in that year
  for (const bal of balances || []) {
    totalChecks++;
    const emp = (bal as any).employees;
    if (!emp) continue;
    const empName = `${emp.forename} ${emp.surname}`;
    const yearStart = bal.leave_year_start;
    const yearEnd = bal.leave_year_end;

    // Sum accruals from payroll entries whose period falls within this leave year
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
        employeeName: empName,
        expected: sumAccruedRounded,
        actual: storedAccrued,
        difference: accruedDiff,
      });
    }

    // Check hours_taken matches sum of holiday_payments for this employee in this leave year
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
        employeeName: empName,
        expected: sumTakenRounded,
        actual: storedTaken,
        difference: takenDiff,
      });
    }
  }

  // ============================================
  // 4. CROSS-PERIOD DUPLICATE DETECTION
  // ============================================
  // Check for employees appearing in periods with overlapping dates
  const sortedPeriods = [...(periods || [])].sort((a, b) => a.start_date.localeCompare(b.start_date));
  
  for (let i = 0; i < sortedPeriods.length; i++) {
    for (let j = i + 1; j < sortedPeriods.length; j++) {
      const p1 = sortedPeriods[i];
      const p2 = sortedPeriods[j];

      // Check date overlap
      if (p1.end_date >= p2.start_date && p1.start_date <= p2.end_date) {
        totalChecks++;
        // Find employees in both periods
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
            detail: `"${p1.period_name}" (${p1.start_date} to ${p1.end_date}) overlaps with "${p2.period_name}" (${p2.start_date} to ${p2.end_date}). ${dupes.length} employee(s) in both: ${dupeNames}`,
            periodName: `${p1.period_name} / ${p2.period_name}`,
          });
        }
      }
    }
  }

  // Check for same employee appearing twice in a single period
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
        periodName: period.period_name,
      });
    }
  }

  // ============================================
  // COMPILE RESULTS
  // ============================================
  const errors = findings.filter(f => f.severity === "error").length;
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
      healthScore,
    },
    categories: {
      calculation: categorize("calculation"),
      holiday: categorize("holiday"),
      totals: categorize("totals"),
      duplicates: categorize("duplicates"),
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
        employeeName: empName,
        periodName: period.period_name,
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
        employeeName: empName,
        periodName: period.period_name,
        expected: expectedAccrual,
        actual: actualAccrual,
        difference: accrualDiff,
      });
    }
  }

  // 2. Period totals
  const entriesTotal = (entries || []).reduce((s: number, e: any) => s + Number(e.total_pay), 0);
  const { data: holPayments } = await supabase
    .from("holiday_payments")
    .select("total")
    .eq("payroll_period_id", periodId);
  const holidaysSum = (holPayments || []).reduce((s, p) => s + Number(p.total), 0);

  const storedHolidays = Number(period.holidays_total || 0);
  if (Math.abs(holidaysSum - storedHolidays) > TOLERANCE) {
    findings.push({
      id: `hol-total-${periodId}`,
      category: "totals",
      severity: "error",
      title: `Holiday total mismatch`,
      detail: `Sum of payments: £${holidaysSum.toFixed(2)}, stored: £${storedHolidays.toFixed(2)}`,
      periodName: period.period_name,
      expected: holidaysSum,
      actual: storedHolidays,
    });
  }

  const expectedGrand = Math.round((entriesTotal + holidaysSum) * 100) / 100;
  const storedGrand = Number(period.grand_total || 0);
  if (Math.abs(expectedGrand - storedGrand) > TOLERANCE) {
    findings.push({
      id: `grand-total-${periodId}`,
      category: "totals",
      severity: "error",
      title: `Grand total mismatch`,
      detail: `Entries (£${entriesTotal.toFixed(2)}) + Holidays (£${holidaysSum.toFixed(2)}) = £${expectedGrand.toFixed(2)}, stored: £${storedGrand.toFixed(2)}`,
      periodName: period.period_name,
      expected: expectedGrand,
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
        employeeName: emp ? `${emp.forename} ${emp.surname}` : undefined,
        periodName: period.period_name,
      });
    }
    seen.add(id);
  }

  return findings;
}

export function usePayrollAudit(enabled = true) {
  return useQuery({
    queryKey: ["payroll_audit"],
    queryFn: runFullAudit,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function usePeriodAudit(periodId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["payroll_audit", "period", periodId],
    queryFn: () => runPeriodAudit(periodId!),
    enabled: enabled && !!periodId,
    staleTime: 1000 * 60 * 2,
  });
}
