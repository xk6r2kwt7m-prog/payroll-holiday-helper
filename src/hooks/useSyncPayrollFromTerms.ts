/**
 * Phase 2C — Manual sync of DRAFT/REVIEW payroll entries from
 * `employee_contract_terms`. Approved periods are strictly blocked.
 *
 * For each selected mismatched entry we:
 *   1. Update payroll_entries.hourly_rate (and service_charge if the terms
 *      explicitly opt the employee out of service charge).
 *   2. Insert an audit_log row capturing payroll_period_id, employee_id,
 *      old rate, new terms rate, source contract_id, effective_from, user.
 *
 * Does NOT touch approved periods. Does NOT mutate the employees profile.
 * Does NOT change rota or labour calculations.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { assertPermission } from "@/lib/permission-guard";
import type { TermsRow } from "@/lib/payroll-rate-source";

export interface SyncPlanRow {
  payroll_entry_id: string;
  employee_id: string;
  employee_name: string;
  old_rate: number;
  new_rate: number;
  diff: number;
  terms: Pick<TermsRow, "id" | "contract_id" | "effective_from" | "source_type"> & {
    service_charge_eligible: boolean | null;
  };
  old_service_charge: number;
  new_service_charge: number | null; // null = leave unchanged
}

export interface SyncResult {
  updated: number;
  audited: number;
}

export function useSyncPayrollFromTerms() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      payrollPeriodId,
      periodStatus,
      plan,
    }: {
      payrollPeriodId: string;
      periodStatus: string;
      plan: SyncPlanRow[];
    }): Promise<SyncResult> => {
      if (!tenantId) throw new Error("Tenant not resolved");
      if (periodStatus === "approved") {
        throw new Error("This payroll period is approved and locked. Sync is not available.");
      }
      await assertPermission("view_pay_data", tenantId);
      if (plan.length === 0) return { updated: 0, audited: 0 };

      let updated = 0;
      let audited = 0;

      // Sequential to keep audit ordering clean and not flood with parallel writes
      for (const row of plan) {
        const updates: Record<string, unknown> = { hourly_rate: row.new_rate };
        if (row.new_service_charge !== null && row.new_service_charge !== row.old_service_charge) {
          updates.service_charge = row.new_service_charge;
        }

        const { error: updErr } = await supabase
          .from("payroll_entries")
          .update(updates)
          .eq("id", row.payroll_entry_id);

        if (updErr) {
          if (/locked|approved/i.test(updErr.message)) {
            throw new Error(
              "Payroll period became locked during sync. No further changes were applied.",
            );
          }
          throw updErr;
        }
        updated += 1;

        const { error: auditErr } = await supabase.from("audit_log").insert({
          action: "update",
          table_name: "payroll_entries",
          record_id: row.payroll_entry_id,
          tenant_id: tenantId,
          user_id: user?.id ?? null,
          old_data: {
            hourly_rate: row.old_rate,
            service_charge: row.old_service_charge,
          },
          new_data: {
            hourly_rate: row.new_rate,
            service_charge:
              row.new_service_charge !== null ? row.new_service_charge : row.old_service_charge,
            sync_source: "employment_terms",
            payroll_period_id: payrollPeriodId,
            employee_id: row.employee_id,
            terms_id: row.terms.id,
            source_contract_id: row.terms.contract_id,
            effective_from: row.terms.effective_from,
            source_type: row.terms.source_type,
            confirmed_by: user?.id ?? null,
          },
        });
        if (!auditErr) audited += 1;
      }

      return { updated, audited };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      qc.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      qc.invalidateQueries({ queryKey: ["employment_terms_comparison"] });
    },
  });
}
