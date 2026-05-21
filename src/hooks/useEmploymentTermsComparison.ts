/**
 * Phase 2B — Read-only comparison of payroll values vs employee_contract_terms.
 *
 * This hook does NOT mutate anything. It fetches the terms active for each
 * employee on the payroll period start date and reports mismatches so the
 * Admin can see drift between signed contract terms and what payroll is using.
 *
 * Payroll calculations, approvals, and historical entries are untouched.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { Database } from "@/integrations/supabase/types";

export type TermsRow = Database["public"]["Tables"]["employee_contract_terms"]["Row"];

export type TermsSourceType = string; // 'backfill_from_employee_profile' | 'signed_contract' | 'amendment' | 'manual_admin' | ...

export type TermsComparisonStatus =
  | "match"
  | "rate_mismatch"
  | "department_mismatch"
  | "multiple_mismatch"
  | "no_active_terms"
  | "backfill_only";

export interface TermsComparisonRow {
  payroll_entry_id: string;
  employee_id: string;
  employee_name: string;

  // Current payroll-side values
  payroll_rate: number;
  payroll_department: string | null;
  payroll_service_charge: number;
  payroll_hours: number;

  // Active employment terms (as-of period start) — null if none found
  terms: TermsRow | null;

  // Scheduled future terms (effective_from > period start) if any
  scheduledTerms: TermsRow | null;

  // Diffs
  rateDiff: number | null; // payroll - terms
  rateMismatch: boolean;
  departmentMismatch: boolean;
  isBackfillOnly: boolean;
  hasScheduledChange: boolean;
  status: TermsComparisonStatus;
  warnings: string[];
}

export interface TermsComparisonSummary {
  total: number;
  matches: number;
  rate_mismatch: number;
  department_mismatch: number;
  no_active_terms: number;
  backfill_only: number;
  scheduled_pending: number;
}

interface Input {
  periodStartDate?: string | null;
  entries: any[];
}

const RATE_EPSILON = 0.005; // £0.005/hr tolerance to ignore float noise

export function useEmploymentTermsComparison({ periodStartDate, entries }: Input) {
  const { tenantId } = useTenant();

  const employeeIds = useMemo(
    () => Array.from(new Set((entries ?? []).map((e: any) => e.employee_id).filter(Boolean))),
    [entries],
  );

  const { data: termsRows = [], isLoading } = useQuery({
    queryKey: ["employment_terms_comparison", tenantId, periodStartDate, employeeIds.sort().join(",")],
    enabled: !!tenantId && !!periodStartDate && employeeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contract_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .in("employee_id", employeeIds)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TermsRow[];
    },
  });

  return useMemo(() => {
    const empty = {
      rows: [] as TermsComparisonRow[],
      summary: {
        total: 0,
        matches: 0,
        rate_mismatch: 0,
        department_mismatch: 0,
        no_active_terms: 0,
        backfill_only: 0,
        scheduled_pending: 0,
      } as TermsComparisonSummary,
      isLoading,
      canCheck: false,
    };

    if (!periodStartDate || entries.length === 0) return empty;

    // Index terms by employee
    const byEmployee = new Map<string, TermsRow[]>();
    for (const t of termsRows) {
      const list = byEmployee.get(t.employee_id) ?? [];
      list.push(t);
      byEmployee.set(t.employee_id, list);
    }

    const periodStart = periodStartDate;

    const rows: TermsComparisonRow[] = entries.map((e: any) => {
      const empName =
        `${e.employees?.forename ?? ""} ${e.employees?.surname ?? ""}`.trim() || "Unknown";
      const payrollRate = Number(e.hourly_rate) || 0;
      const payrollDept = e.employees?.department ?? null;
      const all = byEmployee.get(e.employee_id) ?? [];

      // active-as-of: effective_from <= period_start AND (effective_to is null or > period_start)
      // AND status in ('active','superseded'); pick most recent effective_from.
      const activeCandidates = all.filter(
        (t) =>
          t.effective_from <= periodStart &&
          (t.effective_to === null || t.effective_to > periodStart) &&
          (t.status === "active" || t.status === "superseded"),
      );
      const terms = activeCandidates[0] ?? null; // already sorted desc

      const scheduled = all.find(
        (t) => t.status === "scheduled" && t.effective_from > periodStart,
      ) ?? null;

      const warnings: string[] = [];
      let rateDiff: number | null = null;
      let rateMismatch = false;
      let departmentMismatch = false;
      let isBackfillOnly = false;
      let status: TermsComparisonStatus = "match";

      if (!terms) {
        status = "no_active_terms";
        warnings.push("No active employment terms found for this period date.");
      } else {
        // Phase 3: compare against base_hourly_rate (legal basic rate), falling back
        // to legacy hourly_rate if base not set. Service charge is excluded from
        // this comparison on purpose — it is a separate pay component.
        const termsBase =
          (terms as any).base_hourly_rate ?? terms.hourly_rate ?? null;
        const termsRate = termsBase !== null ? Number(termsBase) : null;
        if (termsRate !== null) {
          rateDiff = +(payrollRate - termsRate).toFixed(4);
          if (Math.abs(rateDiff) > RATE_EPSILON) {
            rateMismatch = true;
            warnings.push(
              `Payroll rate £${payrollRate.toFixed(2)} differs from active contract basic rate £${termsRate.toFixed(2)}.`,
            );
          }
        }

        if (
          terms.department &&
          payrollDept &&
          terms.department.trim().toLowerCase() !== String(payrollDept).trim().toLowerCase()
        ) {
          departmentMismatch = true;
          warnings.push(
            `Employee profile department "${payrollDept}" differs from active terms "${terms.department}".`,
          );
        }

        if (terms.source_type === "backfill_from_employee_profile") {
          isBackfillOnly = true;
          warnings.push("Terms are backfilled from employee profile, not a signed contract.");
        }

        if (rateMismatch && departmentMismatch) status = "multiple_mismatch";
        else if (rateMismatch) status = "rate_mismatch";
        else if (departmentMismatch) status = "department_mismatch";
        else if (isBackfillOnly) status = "backfill_only";
        else status = "match";
      }

      if (scheduled) {
        warnings.push(
          `Scheduled terms exist (effective ${scheduled.effective_from})${
            scheduled.hourly_rate !== null ? ` — new rate £${Number(scheduled.hourly_rate).toFixed(2)}` : ""
          }.`,
        );
      }

      return {
        payroll_entry_id: e.id,
        employee_id: e.employee_id,
        employee_name: empName,
        payroll_rate: payrollRate,
        payroll_department: payrollDept,
        payroll_service_charge: Number(e.service_charge) || 0,
        payroll_hours: Number(e.timesheet_hours) || 0,
        terms,
        scheduledTerms: scheduled,
        rateDiff,
        rateMismatch,
        departmentMismatch,
        isBackfillOnly,
        hasScheduledChange: !!scheduled,
        status,
        warnings,
      };
    });

    const summary: TermsComparisonSummary = {
      total: rows.length,
      matches: rows.filter((r) => r.status === "match").length,
      rate_mismatch: rows.filter((r) => r.rateMismatch).length,
      department_mismatch: rows.filter((r) => r.departmentMismatch).length,
      no_active_terms: rows.filter((r) => r.status === "no_active_terms").length,
      backfill_only: rows.filter((r) => r.isBackfillOnly).length,
      scheduled_pending: rows.filter((r) => r.hasScheduledChange).length,
    };

    return { rows, summary, isLoading, canCheck: true };
  }, [entries, termsRows, periodStartDate, isLoading]);
}

export const TERMS_SOURCE_LABEL: Record<string, string> = {
  backfill_from_employee_profile: "Backfill (profile)",
  signed_contract: "Signed contract",
  amendment: "Amendment",
  manual_admin: "Manual (admin)",
};

export function labelSourceType(t: string | undefined | null): string {
  if (!t) return "—";
  return TERMS_SOURCE_LABEL[t] ?? t;
}
