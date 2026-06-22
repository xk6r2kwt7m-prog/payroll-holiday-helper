/**
 * G1 + G4 — live data sources for the payroll approval checklist.
 *
 *  G1 — NMW override resolution
 *       Pulls employee_ids that have either:
 *         (a) a `contract_minimum_wage_overrides` row, OR
 *         (b) a `payroll_nmw_audit` row for THIS period with a non-empty
 *             `override_reason`.
 *       These employees do not block payroll approval on NMW grounds,
 *       but surface a warning that requires explicit acknowledgement.
 *
 *  G4 — Service-charge eligibility resolution
 *       - scIneligibleEntryIds: entries where the linked employee has
 *         `service_charge_eligible = false` AND a non-zero service charge
 *         was paid on the entry.
 *       - scOverrideNoteEntryIds: entries with a `payroll_adjustments`
 *         row of field_name = 'service_charge_eligibility_override' and
 *         a non-empty note. Per-line override unlocks the block.
 *
 *  Read-only. Never mutates payroll data.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface ApprovalGuardrailsInput {
  /** Entries already loaded for the selected period (with joined employees). */
  entries: Array<{
    id: string;
    employee_id: string;
    service_charge?: number | null;
    employees?: { service_charge_eligible?: boolean | null } | null;
  }>;
  periodId?: string;
}

export interface ApprovalGuardrailsResult {
  nmwOverrideEmployeeIds: Set<string>;
  scIneligibleEntryIds: Set<string>;
  scOverrideNoteEntryIds: Set<string>;
  isLoading: boolean;
}

export const SC_ELIGIBILITY_OVERRIDE_FIELD = "service_charge_eligibility_override";

export function usePayrollApprovalGuardrails({
  entries,
  periodId,
}: ApprovalGuardrailsInput): ApprovalGuardrailsResult {
  const { tenantId } = useTenant();

  const employeeIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.employee_id).filter(Boolean))),
    [entries],
  );

  // G1 — NMW overrides
  const { data: contractOverrides = [], isLoading: loadingContractOverrides } = useQuery({
    queryKey: ["nmw_contract_overrides", tenantId, employeeIds.sort().join(",")],
    queryFn: async () => {
      if (!tenantId || employeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contract_minimum_wage_overrides")
        .select("employee_id")
        .eq("tenant_id", tenantId)
        .in("employee_id", employeeIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && employeeIds.length > 0,
  });

  const { data: nmwAuditOverrides = [], isLoading: loadingAuditOverrides } = useQuery({
    queryKey: ["nmw_audit_overrides", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from("payroll_nmw_audit")
        .select("employee_id, override_reason")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId);
      if (error) throw error;
      return (data ?? []).filter(
        (r: any) => r.override_reason && String(r.override_reason).trim().length > 0,
      );
    },
    enabled: !!tenantId && !!periodId,
  });

  // G4 — SC override notes (period-scoped adjustments)
  const { data: scOverrideAdjustments = [], isLoading: loadingScOverrides } = useQuery({
    queryKey: ["sc_eligibility_overrides", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("payroll_entry_id, note")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .eq("field_name", SC_ELIGIBILITY_OVERRIDE_FIELD);
      if (error) throw error;
      return (data ?? []).filter(
        (r: any) => r.note && String(r.note).trim().length > 0,
      );
    },
    enabled: !!tenantId && !!periodId,
  });

  return useMemo(() => {
    const nmwOverrideEmployeeIds = new Set<string>();
    for (const r of contractOverrides as Array<{ employee_id: string }>) {
      if (r.employee_id) nmwOverrideEmployeeIds.add(r.employee_id);
    }
    for (const r of nmwAuditOverrides as Array<{ employee_id: string }>) {
      if (r.employee_id) nmwOverrideEmployeeIds.add(r.employee_id);
    }

    const scIneligibleEntryIds = new Set<string>();
    for (const e of entries) {
      const eligible = e.employees?.service_charge_eligible;
      const sc = Number(e.service_charge ?? 0);
      // Treat null as "eligible" to avoid false-positives on legacy rows.
      if (eligible === false && sc > 0) {
        scIneligibleEntryIds.add(e.id);
      }
    }

    const scOverrideNoteEntryIds = new Set<string>();
    for (const r of scOverrideAdjustments as Array<{ payroll_entry_id: string }>) {
      if (r.payroll_entry_id) scOverrideNoteEntryIds.add(r.payroll_entry_id);
    }

    return {
      nmwOverrideEmployeeIds,
      scIneligibleEntryIds,
      scOverrideNoteEntryIds,
      isLoading:
        loadingContractOverrides || loadingAuditOverrides || loadingScOverrides,
    };
  }, [
    contractOverrides,
    nmwAuditOverrides,
    scOverrideAdjustments,
    entries,
    loadingContractOverrides,
    loadingAuditOverrides,
    loadingScOverrides,
  ]);
}

/**
 * Pure resolver — same logic as the hook above but extracted for tests.
 * Used by `phase-guardrails-g1-g4-wiring.test.ts` to assert the data
 * mapping without spinning up React or the network.
 */
export interface GuardrailRawInputs {
  entries: ApprovalGuardrailsInput["entries"];
  contractOverrides: Array<{ employee_id: string }>;
  nmwAuditRows: Array<{ employee_id: string; override_reason: string | null }>;
  scOverrideAdjustments: Array<{
    payroll_entry_id: string;
    field_name: string;
    note: string | null;
  }>;
}

export function resolveGuardrailSets(input: GuardrailRawInputs): {
  nmwOverrideEmployeeIds: Set<string>;
  scIneligibleEntryIds: Set<string>;
  scOverrideNoteEntryIds: Set<string>;
} {
  const nmwOverrideEmployeeIds = new Set<string>();
  for (const r of input.contractOverrides) {
    if (r.employee_id) nmwOverrideEmployeeIds.add(r.employee_id);
  }
  for (const r of input.nmwAuditRows) {
    if (r.employee_id && r.override_reason && r.override_reason.trim().length > 0) {
      nmwOverrideEmployeeIds.add(r.employee_id);
    }
  }

  const scIneligibleEntryIds = new Set<string>();
  for (const e of input.entries) {
    const eligible = e.employees?.service_charge_eligible;
    const sc = Number(e.service_charge ?? 0);
    if (eligible === false && sc > 0) {
      scIneligibleEntryIds.add(e.id);
    }
  }

  const scOverrideNoteEntryIds = new Set<string>();
  for (const r of input.scOverrideAdjustments) {
    if (
      r.field_name === SC_ELIGIBILITY_OVERRIDE_FIELD &&
      r.payroll_entry_id &&
      r.note &&
      r.note.trim().length > 0
    ) {
      scOverrideNoteEntryIds.add(r.payroll_entry_id);
    }
  }

  return { nmwOverrideEmployeeIds, scIneligibleEntryIds, scOverrideNoteEntryIds };
}
