/**
 * Phase 4 — Labour cost reporting data hook.
 *
 * Fetches everything `LabourCostReport` needs in a single coordinated query,
 * then assembles per-period reports via `labour-reporting`. Strictly read-only.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import {
  buildPayrollPeriodReport,
  buildSiteBreakdown,
  computeLabourPercentage,
  type PayrollPeriodReport,
  type SiteBreakdownRow,
  type PayrollLocationRow,
  type PayrollEntryReport,
} from "@/lib/labour-reporting";
import type { TermsRow } from "@/lib/labour-costing";

export interface PeriodWithSite extends PayrollPeriodReport {
  sales_total: number;
  base_labour_pct: number | null;
  with_sc_labour_pct: number | null;
  site_breakdown: SiteBreakdownRow[];
}

export interface LabourCostReportData {
  periods: PeriodWithSite[];
  /** All employees with a fallback in at least one period. */
  fallback_employees: { id: string; name: string }[];
  generated_at: string;
}

export function useLabourCostReport() {
  const { tenantId } = useTenant();
  return useQuery<LabourCostReportData>({
    queryKey: ["labour_cost_report", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      if (!tenantId) {
        return { periods: [], fallback_employees: [], generated_at: new Date().toISOString() };
      }

      // 1. Payroll periods
      const { data: periods, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id, period_name, start_date, end_date, status, sales_total")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false });
      if (pErr) throw pErr;

      // 2. Payroll entries (with employee join for DOB/name)
      const { data: entries, error: eErr } = await supabase
        .from("payroll_entries")
        .select(`
          id, payroll_period_id, employee_id, hourly_rate, service_charge,
          timesheet_hours, performance_bonus, special_bonus, total_pay,
          employees ( id, forename, surname, date_of_birth )
        `)
        .eq("tenant_id", tenantId);
      if (eErr) throw eErr;

      // 3. Payroll entry locations (site breakdown)
      const { data: locations, error: lErr } = await supabase
        .from("payroll_entry_locations")
        .select("payroll_entry_id, employee_id, location_name, hours, payroll_period_id")
        .eq("tenant_id", tenantId);
      if (lErr) throw lErr;

      // 4. Employment terms — pull all terms for the employee set
      const employeeIds = Array.from(
        new Set((entries ?? []).map((e: any) => e.employee_id).filter(Boolean)),
      );
      let termsByEmployee = new Map<string, TermsRow[]>();
      if (employeeIds.length > 0) {
        const { data: termsRows, error: tErr } = await supabase
          .from("employee_contract_terms")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("employee_id", employeeIds)
          .in("status", ["active", "superseded"])
          .order("effective_from", { ascending: false });
        if (tErr) throw tErr;
        for (const t of (termsRows ?? []) as TermsRow[]) {
          const list = termsByEmployee.get(t.employee_id) ?? [];
          list.push(t);
          termsByEmployee.set(t.employee_id, list);
        }
      }

      // 5. Assemble per-period report
      const entriesByPeriod = new Map<string, any[]>();
      for (const e of entries ?? []) {
        const list = entriesByPeriod.get((e as any).payroll_period_id) ?? [];
        list.push(e);
        entriesByPeriod.set((e as any).payroll_period_id, list);
      }
      const locationsByPeriod = new Map<string, PayrollLocationRow[]>();
      for (const l of locations ?? []) {
        const list = locationsByPeriod.get((l as any).payroll_period_id) ?? [];
        list.push({
          payroll_entry_id: (l as any).payroll_entry_id,
          employee_id: (l as any).employee_id,
          location_name: (l as any).location_name,
          hours: Number((l as any).hours) || 0,
        });
        locationsByPeriod.set((l as any).payroll_period_id, list);
      }

      const reports: PeriodWithSite[] = [];
      const fallbackEmpSet = new Map<string, string>();

      for (const p of periods ?? []) {
        const periodEntries = (entriesByPeriod.get(p.id) ?? []).map((e: any) => {
          const emp = e.employees ?? {};
          return {
            id: e.id,
            employee_id: e.employee_id,
            employee_name: `${emp.forename ?? ""} ${emp.surname ?? ""}`.trim() || "Unknown",
            date_of_birth: emp.date_of_birth ?? null,
            timesheet_hours: Number(e.timesheet_hours) || 0,
            hourly_rate: Number(e.hourly_rate) || 0,
            service_charge: e.service_charge,
            performance_bonus: e.performance_bonus,
            special_bonus: e.special_bonus,
            total_pay: e.total_pay,
          };
        });

        const periodReport = buildPayrollPeriodReport(
          {
            id: p.id,
            period_name: p.period_name,
            start_date: p.start_date,
            end_date: p.end_date,
            status: p.status,
          },
          periodEntries,
          termsByEmployee,
        );

        for (const r of periodReport.entries) {
          if (r.terms_source === "profile_fallback") {
            fallbackEmpSet.set(r.employee_id, r.employee_name);
          }
        }

        const pct = computeLabourPercentage(
          periodReport.totals.base_pay_total,
          periodReport.totals.actual_service_charge_paid_total,
          Number(p.sales_total) || 0,
        );

        const siteRows = buildSiteBreakdown(
          periodReport.entries,
          locationsByPeriod.get(p.id) ?? [],
        );

        reports.push({
          ...periodReport,
          sales_total: Number(p.sales_total) || 0,
          base_labour_pct: pct.base_pct,
          with_sc_labour_pct: pct.with_sc_pct,
          site_breakdown: siteRows,
        });
      }

      return {
        periods: reports,
        fallback_employees: [...fallbackEmpSet.entries()].map(([id, name]) => ({ id, name })),
        generated_at: new Date().toISOString(),
      };
    },
  });
}

export type { PayrollEntryReport };
