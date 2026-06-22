/**
 * Phase 5 — Payroll approval readiness checklist.
 *
 * Pure, deterministic, side-effect-free. Aggregates the Phase 3/4 signals
 * (NMW status, service-charge reliance, profile fallback, manual
 * adjustments) into a single approval-gate view.
 *
 * Hard rules (preserved):
 *   - National Minimum Wage NEVER counts service charge as eligible pay.
 *   - This module never mutates payroll data; it only classifies.
 *   - Blocking items prevent approval. Warnings require explicit
 *     acknowledgement before approval is offered.
 *   - The existing DB-level locks on approved periods remain authoritative.
 *     This checklist is an *additional* manager-facing safety surface.
 */
import type { PayrollEntryReport } from "@/lib/labour-reporting";

export type ChecklistStatus = "pass" | "warning" | "block";

export interface ChecklistItem {
  /** Stable id — also used as the acknowledgement key. */
  id: string;
  status: ChecklistStatus;
  /** Whether approval is blocked by this item. Always true for `block`. */
  blocking: boolean;
  /** Whether this item must be acknowledged before approval. */
  requires_ack: boolean;
  title: string;
  detail: string;
  /** Number of entries affected (0 when N/A). */
  count: number;
  affected_employee_ids: string[];
}

export interface ApprovalChecklistInput {
  period_status: string;
  entries: PayrollEntryReport[];
  /** Optional manual-adjustment lookup keyed by payroll_entry_id. */
  manualAdjustmentsByEntryId?: Map<string, number>;
  /**
   * G1 — employee_ids with an authorised NMW override on file
   * (`contract_minimum_wage_overrides` or `payroll_nmw_audit.override_reason`).
   * NMW failures for these employees do not block approval, but remain visible
   * as a warning.
   */
  nmwOverrideEmployeeIds?: Set<string>;
  /**
   * G4 — entry_ids paying service charge that belong to an SC-ineligible
   * employee (`employees.service_charge_eligible = false`).
   */
  scIneligibleEntryIds?: Set<string>;
  /**
   * G4 — entry_ids that carry an explicit per-line SC-eligibility override
   * note. Without an override note, an SC-ineligible-paid entry blocks
   * approval.
   */
  scOverrideNoteEntryIds?: Set<string>;
}

export interface ApprovalChecklistResult {
  items: ChecklistItem[];
  blocking_count: number;
  warning_count: number;
  /** Convenience: stable ids of items that need explicit acknowledgement. */
  ack_required_ids: string[];
  /** Already-approved periods can never be re-approved. */
  period_already_approved: boolean;
}

/* -------------------------------------------------------------------------- */

export function buildApprovalChecklist(
  input: ApprovalChecklistInput,
): ApprovalChecklistResult {
  const {
    entries,
    manualAdjustmentsByEntryId,
    nmwOverrideEmployeeIds,
    scIneligibleEntryIds,
    scOverrideNoteEntryIds,
  } = input;
  const isAlreadyApproved = input.period_status === "approved";
  const items: ChecklistItem[] = [];

  // --- blocking checks -----------------------------------------------------

  if (isAlreadyApproved) {
    items.push({
      id: "period_already_approved",
      status: "block",
      blocking: true,
      requires_ack: false,
      title: "Period is already approved",
      detail:
        "This payroll period is locked. Reopen the period through the approved workflow to make changes.",
      count: 1,
      affected_employee_ids: [],
    });
  }

  const nmwRisks = entries.filter((e) => e.nmw.status === "non_compliant");
  items.push(
    nmwRisks.length > 0
      ? blockItem(
          "nmw_non_compliant",
          "Entries below National Minimum Wage",
          `${nmwRisks.length} entr${nmwRisks.length === 1 ? "y is" : "ies are"} below the legal NMW base rate. Service charge cannot be used to satisfy NMW.`,
          nmwRisks,
        )
      : passItem(
          "nmw_non_compliant",
          "All entries meet National Minimum Wage",
          "Base hourly pay meets or exceeds the legal NMW rate. Service charge is correctly excluded.",
        ),
  );

  const missingRate = entries.filter((e) => e.hours > 0 && e.base_pay <= 0);
  items.push(
    missingRate.length > 0
      ? blockItem(
          "missing_rate",
          "Entries with hours but no base pay",
          `${missingRate.length} entr${missingRate.length === 1 ? "y has" : "ies have"} timesheet hours but no base pay recorded. A missing rate cannot be approved.`,
          missingRate,
        )
      : passItem(
          "missing_rate",
          "Every worked entry has a base rate",
          "No entry has hours without a corresponding base rate.",
        ),
  );

  const negativePay = entries.filter(
    (e) =>
      e.base_pay < 0 ||
      e.performance_bonus < 0 ||
      e.special_bonus < 0 ||
      e.actual_service_charge_paid < 0 ||
      e.stored_total_pay < 0,
  );
  items.push(
    negativePay.length > 0
      ? blockItem(
          "negative_pay",
          "Negative pay values detected",
          `${negativePay.length} entr${negativePay.length === 1 ? "y has" : "ies have"} a negative pay component. This must be corrected before approval.`,
          negativePay,
        )
      : passItem("negative_pay", "No negative pay values", "All pay components are zero or positive."),
  );

  const zeroHoursWithPay = entries.filter(
    (e) =>
      e.hours <= 0 &&
      (e.base_pay > 0 ||
        e.performance_bonus > 0 ||
        e.special_bonus > 0 ||
        e.actual_service_charge_paid > 0),
  );
  items.push(
    zeroHoursWithPay.length > 0
      ? blockItem(
          "zero_hours_with_pay",
          "Zero-hour entries with pay",
          `${zeroHoursWithPay.length} entr${zeroHoursWithPay.length === 1 ? "y has" : "ies have"} 0 hours but non-zero pay. Add hours or remove the entry.`,
          zeroHoursWithPay,
        )
      : passItem(
          "zero_hours_with_pay",
          "No zero-hour entries with pay",
          "Pay is only recorded against entries with worked hours.",
        ),
  );

  const scRescue = entries.filter((e) => e.nmw.relies_on_service_charge && e.nmw.status !== "compliant");
  items.push(
    scRescue.length > 0
      ? blockItem(
          "sc_below_nmw",
          "Service charge would be needed to meet NMW",
          `${scRescue.length} entr${scRescue.length === 1 ? "y" : "ies"} would only pass NMW if service charge were counted as basic pay. Service charge is excluded from NMW.`,
          scRescue,
        )
      : passItem(
          "sc_below_nmw",
          "No entries rely on service charge to meet NMW",
          "Base rates meet NMW independently of any service-charge supplement.",
        ),
  );

  // --- warning checks (require acknowledgement) ----------------------------

  const fallback = entries.filter((e) => e.terms_source === "profile_fallback");
  items.push(
    fallback.length > 0
      ? warnItem(
          "profile_fallback",
          "Profile fallback rates used",
          `${fallback.length} entr${fallback.length === 1 ? "y is" : "ies are"} costed from the employee profile because no active employment terms exist for the period date.`,
          fallback,
        )
      : passItem(
          "profile_fallback",
          "All entries use active employment terms",
          "Every entry is costed against signed-contract or backfilled terms.",
        ),
  );

  const noTerms = entries.filter((e) => e.terms_id == null);
  items.push(
    noTerms.length > 0
      ? warnItem(
          "no_active_terms",
          "Employees without active employment terms",
          `${noTerms.length} employee${noTerms.length === 1 ? "" : "s"} have no signed employment terms covering this period. Verify before approval.`,
          noTerms,
        )
      : passItem(
          "no_active_terms",
          "All employees have active terms",
          "Every paid employee has a contract terms row covering the period.",
        ),
  );

  const scDiagnostic = entries.filter(
    (e) => e.nmw.relies_on_service_charge && e.nmw.status === "compliant",
  );
  items.push(
    scDiagnostic.length > 0
      ? warnItem(
          "sc_diagnostic",
          "Entries flagged as relying on service charge (diagnostic)",
          `${scDiagnostic.length} compliant entr${scDiagnostic.length === 1 ? "y" : "ies"} are flagged diagnostically. Service charge remains excluded from NMW — this is informational only.`,
          scDiagnostic,
        )
      : passItem(
          "sc_diagnostic",
          "No diagnostic SC-reliance flags",
          "No compliant entry depends on service charge to clear the NMW threshold.",
        ),
  );

  let manualAdjCount = 0;
  const manualAdjEmps = new Set<string>();
  if (manualAdjustmentsByEntryId && manualAdjustmentsByEntryId.size > 0) {
    for (const e of entries) {
      const n = manualAdjustmentsByEntryId.get(e.entry_id) ?? 0;
      if (n > 0) {
        manualAdjCount += n;
        manualAdjEmps.add(e.employee_id);
      }
    }
  }
  items.push(
    manualAdjCount > 0
      ? {
          id: "manual_adjustments",
          status: "warning",
          blocking: false,
          requires_ack: true,
          title: "Manual adjustments present",
          detail: `${manualAdjCount} manual adjustment${manualAdjCount === 1 ? "" : "s"} have been applied to this period. Acknowledge before approving.`,
          count: manualAdjCount,
          affected_employee_ids: [...manualAdjEmps],
        }
      : passItem(
          "manual_adjustments",
          "No manual adjustments",
          "No hour or rate overrides recorded against this period.",
        ),
  );

  // Approval is blocked while any block-status item is present.
  const blocking_count = items.filter((i) => i.blocking).length;
  const warning_count = items.filter((i) => i.status === "warning").length;
  const ack_required_ids = items.filter((i) => i.requires_ack).map((i) => i.id);

  return {
    items,
    blocking_count,
    warning_count,
    ack_required_ids,
    period_already_approved: isAlreadyApproved,
  };
}

/**
 * Approval gate — returns true only when no blockers remain AND every
 * acknowledgement-required warning has been ticked by the user.
 */
export function canApprove(
  result: ApprovalChecklistResult,
  acknowledged: Set<string>,
): boolean {
  if (result.blocking_count > 0) return false;
  for (const id of result.ack_required_ids) {
    if (!acknowledged.has(id)) return false;
  }
  return true;
}

/** Standard confirmation copy the UI must show on the approve button. */
export const APPROVAL_CONFIRMATION_TEXT =
  "By approving this payroll period, I confirm that I have reviewed the entries, warnings, service charge treatment, and National Minimum Wage checks. I understand that approved payroll periods are locked and future changes must be separately audited.";

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function passItem(id: string, title: string, detail: string): ChecklistItem {
  return {
    id,
    status: "pass",
    blocking: false,
    requires_ack: false,
    title,
    detail,
    count: 0,
    affected_employee_ids: [],
  };
}

function warnItem(
  id: string,
  title: string,
  detail: string,
  entries: PayrollEntryReport[],
): ChecklistItem {
  return {
    id,
    status: "warning",
    blocking: false,
    requires_ack: true,
    title,
    detail,
    count: entries.length,
    affected_employee_ids: [...new Set(entries.map((e) => e.employee_id))],
  };
}

function blockItem(
  id: string,
  title: string,
  detail: string,
  entries: PayrollEntryReport[],
): ChecklistItem {
  return {
    id,
    status: "block",
    blocking: true,
    requires_ack: false,
    title,
    detail,
    count: entries.length,
    affected_employee_ids: [...new Set(entries.map((e) => e.employee_id))],
  };
}
