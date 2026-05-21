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

export interface UseNmwInput {
  periodId?: string;
  periodStartDate?: string | null;
  entries: any[];
}

export interface UseNmwReturn {
  results: NmwResult[];
  summary: NmwSummary;
  canCheck: boolean;
}

/** Pure, in-memory evaluation. Re-runs whenever entries / period change. */
export function usePayrollMinimumWageCheck({
  periodStartDate,
  entries,
}: UseNmwInput): UseNmwReturn {
  return useMemo(() => {
    if (!periodStartDate || !entries || entries.length === 0) {
      return {
        results: [],
        summary: {
          total: 0,
          compliant: 0,
          at_risk: 0,
          non_compliant: 0,
          insufficient_data: 0,
          hasBlockers: false,
        },
        canCheck: false,
      };
    }

    const results: NmwResult[] = entries.map((e: any) => {
      const emp = e.employees || {};
      return evaluatePayrollEntryNmw(
        {
          payroll_entry_id: e.id,
          employee_id: e.employee_id,
          employee_name: `${emp.forename || ""} ${emp.surname || ""}`.trim() || "Unknown",
          date_of_birth: emp.date_of_birth,
          is_apprentice: false, // TODO: source from active contract terms
          timesheet_hours: Number(e.timesheet_hours) || 0,
          hourly_rate: Number(e.hourly_rate) || 0,
          service_charge: Number(e.service_charge) || 0,
          performance_bonus: Number(e.performance_bonus) || 0,
          special_bonus: Number(e.special_bonus) || 0,
        },
        periodStartDate,
      );
    });

    return { results, summary: summariseNmw(results), canCheck: true };
  }, [periodStartDate, entries]);
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
