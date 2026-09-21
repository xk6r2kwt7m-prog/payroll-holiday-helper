import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import {
  evaluatePayrollEntryNmw,
  summariseNmw,
  type NmwResult,
  type NmwSummary,
} from "@/lib/payroll-nmw";
import { isRelevantToPayrollPeriod } from "@/lib/employee-period-relevance";

export interface NmwExcludedRow {
  employee_id: string;
  employee_name: string;
  reason: string;
}

export interface UseNmwInput {
  periodId?: string;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  entries: any[];
  /** Apprenticeship status from active employment terms, per employee id. */
  apprenticeByEmployee?: Record<string, boolean | null | undefined>;
  /** Contracted base rate from active employment terms, per employee id. */
  contractedRateByEmployee?: Record<string, number | null | undefined>;
  holidayPaymentEmployeeIds?: Set<string>;
  adjustmentEmployeeIds?: Set<string>;
}

export interface UseNmwReturn {
  results: NmwResult[];
  summary: NmwSummary;
  canCheck: boolean;
  /** Pay lines left out of the check (former employees / future starters). */
  excluded: NmwExcludedRow[];
}

const EMPTY_SUMMARY: NmwSummary = {
  total: 0,
  compliant: 0,
  at_risk: 0,
  non_compliant: 0,
  insufficient_data: 0,
  hasBlockers: false,
  contract_rate_mismatch: 0,
};

/** Pure, in-memory evaluation. Re-runs whenever entries / period change. */
export function usePayrollMinimumWageCheck({
  periodStartDate,
  periodEndDate,
  entries,
  apprenticeByEmployee,
  contractedRateByEmployee,
  holidayPaymentEmployeeIds,
  adjustmentEmployeeIds,
}: UseNmwInput): UseNmwReturn {
  return useMemo(() => {
    if (!periodStartDate || !entries || entries.length === 0) {
      return { results: [], summary: EMPTY_SUMMARY, canCheck: false, excluded: [] };
    }

    const period = { start_date: periodStartDate, end_date: periodEndDate ?? null };
    const entryEmployeeIds = new Set(
      entries.map((e: any) => e.employee_id).filter(Boolean),
    );

    const results: NmwResult[] = [];
    const excluded: NmwExcludedRow[] = [];

    for (const e of entries as any[]) {
      const emp = e.employees || {};
      const name = `${emp.forename || ""} ${emp.surname || ""}`.trim() || "Unknown";

      // Period-relevance gate. Former employees with nothing due in this
      // period, future starters and rehearsal records are left out of the
      // check, its counts and its warnings — their records stay untouched.
      if (emp.id && periodEndDate) {
        const relevant = isRelevantToPayrollPeriod(
          {
            id: emp.id,
            status: emp.status,
            start_date: emp.start_date,
            end_date: emp.end_date,
            is_test_record: emp.is_test_record,
          },
          period,
          {
            entryEmployeeIds,
            holidayPaymentEmployeeIds,
            adjustmentEmployeeIds,
          },
        );
        if (!relevant) {
          excluded.push({
            employee_id: emp.id,
            employee_name: name,
            reason: emp.is_test_record
              ? "Practice record — never part of payroll"
              : emp.end_date && emp.end_date < (periodStartDate as string)
                ? "Left before this period started — no payment due"
                : "Not employed during this period",
          });
          continue;
        }
      }

      const apprenticeRaw = emp.id ? apprenticeByEmployee?.[emp.id] : undefined;
      const contracted = emp.id ? contractedRateByEmployee?.[emp.id] : undefined;

      results.push(
        evaluatePayrollEntryNmw(
          {
            payroll_entry_id: e.id,
            employee_id: e.employee_id,
            employee_name: name,
            date_of_birth: emp.date_of_birth,
            is_apprentice: apprenticeRaw === true,
            // Status counts as known unless no active terms row exists at all.
            apprentice_status_known: apprenticeRaw !== undefined,
            timesheet_hours: Number(e.timesheet_hours) || 0,
            hourly_rate: Number(e.hourly_rate) || 0,
            service_charge: Number(e.service_charge) || 0,
            performance_bonus: Number(e.performance_bonus) || 0,
            special_bonus: Number(e.special_bonus) || 0,
            contracted_rate:
              contracted === null || contracted === undefined ? null : Number(contracted),
          },
          periodStartDate,
        ),
      );
    }

    return { results, summary: summariseNmw(results), canCheck: true, excluded };
  }, [
    periodStartDate,
    periodEndDate,
    entries,
    apprenticeByEmployee,
    contractedRateByEmployee,
    holidayPaymentEmployeeIds,
    adjustmentEmployeeIds,
  ]);
}

/** Writes a snapshot of the compliance check to payroll_nmw_audit. */
export function useRecordNmwAudit() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payrollPeriodId,
      results,
    }: {
      payrollPeriodId: string;
      results: NmwResult[];
    }) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      if (results.length === 0) return;

      const rows = results.map((r) => ({
        tenant_id: tenantId,
        payroll_period_id: payrollPeriodId,
        payroll_entry_id: r.payroll_entry_id,
        employee_id: r.employee_id,
        age_at_period_start: r.age_at_period_start,
        age_band: r.age_band,
        is_apprentice: r.is_apprentice,
        required_rate: r.required_rate,
        effective_rate: r.effective_rate,
        eligible_pay: r.eligible_pay,
        actual_hours: r.actual_hours,
        status: r.status,
        calculation_basis: r.calculation_basis as unknown as never,
        checked_by: user?.id ?? null,
      }));

      const { error } = await supabase
        .from("payroll_nmw_audit")
        .insert(rows as never);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["payroll_nmw_audit", vars.payrollPeriodId] });
    },
  });
}
