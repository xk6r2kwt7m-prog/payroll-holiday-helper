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
import type { PayrollComparisonSummary } from "@/lib/payroll-change-review";

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
  /**
   * Month-on-month comparison summary. When provided, adds non-blocking
   * warning items surfacing rate/SC/hours movement vs the previous period.
   * Never blocks approval — this is a manager-facing awareness surface.
   */
  comparisonSummary?: PayrollComparisonSummary | null;
  /**
   * Number of distinct employees whose *imported* timesheet hours were
   * manually corrected after import (see `countImportedHoursOverrides`).
   * Surfaces a non-blocking, ack-required warning.
   */
  importedHoursOverrideCount?: number;
  importedHoursOverrideEmployeeIds?: string[];
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

  const nmwAll = entries.filter((e) => e.nmw.status === "non_compliant");
  const overrides = nmwOverrideEmployeeIds ?? new Set<string>();
  const nmwBlocking = nmwAll.filter((e) => !overrides.has(e.employee_id));
  const nmwOverridden = nmwAll.filter((e) => overrides.has(e.employee_id));
  items.push(
    nmwBlocking.length > 0
      ? blockItem(
          "nmw_non_compliant",
          "Entries below National Minimum Wage",
          `${nmwBlocking.length} entr${nmwBlocking.length === 1 ? "y is" : "ies are"} below the legal NMW base rate with no authorised override on file. Service charge cannot be used to satisfy NMW. Add a contract minimum-wage override row or correct the rate before approval.`,
          nmwBlocking,
        )
      : passItem(
          "nmw_non_compliant",
          "All entries meet National Minimum Wage",
          "Base hourly pay meets NMW, or a documented override is on file. Service charge is correctly excluded.",
        ),
  );
  if (nmwOverridden.length > 0) {
    items.push(
      warnItem(
        "nmw_override_in_use",
        "NMW overrides are in use",
        `${nmwOverridden.length} entr${nmwOverridden.length === 1 ? "y has" : "ies have"} a sub-NMW rate covered by an authorised override row. Acknowledge before approval.`,
        nmwOverridden,
      ),
    );
  }

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

  // G4 — Service charge paid to SC-ineligible employees
  const scIneligible = scIneligibleEntryIds ?? new Set<string>();
  const scOverrideNotes = scOverrideNoteEntryIds ?? new Set<string>();
  const scIneligibleAll = entries.filter(
    (e) => scIneligible.has(e.entry_id) && e.actual_service_charge_paid > 0,
  );
  const scIneligibleBlocking = scIneligibleAll.filter(
    (e) => !scOverrideNotes.has(e.entry_id),
  );
  const scIneligibleOverridden = scIneligibleAll.filter((e) =>
    scOverrideNotes.has(e.entry_id),
  );
  items.push(
    scIneligibleBlocking.length > 0
      ? blockItem(
          "sc_paid_to_ineligible",
          "Service charge paid to ineligible employees",
          `${scIneligibleBlocking.length} entr${scIneligibleBlocking.length === 1 ? "y pays" : "ies pay"} service charge to an SC-ineligible employee with no per-line override note. Either remove the SC, mark the employee eligible, or attach an override note before approval.`,
          scIneligibleBlocking,
        )
      : passItem(
          "sc_paid_to_ineligible",
          "No SC paid to ineligible employees",
          "Every service-charge payment goes to an SC-eligible employee, or has an explicit per-line override note.",
        ),
  );
  if (scIneligibleOverridden.length > 0) {
    items.push(
      warnItem(
        "sc_eligibility_override_in_use",
        "Service-charge eligibility overrides in use",
        `${scIneligibleOverridden.length} SC payment${scIneligibleOverridden.length === 1 ? "" : "s"} to an ineligible employee carry an explicit per-line override note. Acknowledge before approval.`,
        scIneligibleOverridden,
      ),
    );
  }

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

  // --- month-on-month comparison summary (non-blocking) -------------------
  const cmp = input.comparisonSummary;
  if (cmp && cmp.has_previous_period) {
    if (cmp.rate_changes > 0) {
      items.push({
        id: "comparison_rate_changes",
        status: "warning",
        blocking: false,
        requires_ack: false,
        title: "Pay rate changes vs previous period",
        detail: `${cmp.rate_changes} employee${cmp.rate_changes === 1 ? "'s" : "s'"} hourly rate changed since the last period. Review before approval.`,
        count: cmp.rate_changes,
        affected_employee_ids: [],
      });
    }
    if (cmp.service_charge_changes > 0) {
      items.push({
        id: "comparison_sc_changes",
        status: "warning",
        blocking: false,
        requires_ack: false,
        title: "Service charge changes vs previous period",
        detail: `${cmp.service_charge_changes} employee${cmp.service_charge_changes === 1 ? "'s" : "s'"} service charge amount changed since the last period.`,
        count: cmp.service_charge_changes,
        affected_employee_ids: [],
      });
    }
    if (cmp.zero_hours_with_prior_hours > 0) {
      items.push({
        id: "comparison_zero_hours",
        status: "warning",
        blocking: false,
        requires_ack: true,
        title: "Employees with 0.00h but had hours last period",
        detail: `${cmp.zero_hours_with_prior_hours} employee${cmp.zero_hours_with_prior_hours === 1 ? "" : "s"} recorded 0.00h this period despite working last period. Confirm this is intentional.`,
        count: cmp.zero_hours_with_prior_hours,
        affected_employee_ids: [],
      });
    }
    if (cmp.missing_from_timesheet > 0) {
      items.push({
        id: "comparison_missing_from_timesheet",
        status: "warning",
        blocking: false,
        requires_ack: true,
        title: "Employees missing from imported timesheet",
        detail: `${cmp.missing_from_timesheet} active employee${cmp.missing_from_timesheet === 1 ? " is" : "s are"} missing from the imported timesheet. Verify before approval.`,
        count: cmp.missing_from_timesheet,
        affected_employee_ids: [],
      });
    }
    if (cmp.large_weekly_hours_movement > 0) {
      items.push({
        id: "comparison_hours_movement",
        status: "warning",
        blocking: false,
        requires_ack: false,
        title: "Large weekly-hours movement",
        detail: `${cmp.large_weekly_hours_movement} employee${cmp.large_weekly_hours_movement === 1 ? "" : "s"} moved by more than 25% on weekly-average hours (period length already normalised).`,
        count: cmp.large_weekly_hours_movement,
        affected_employee_ids: [],
      });
    }
    if (cmp.total_notes > 0) {
      items.push({
        id: "comparison_notes_total",
        status: "pass",
        blocking: false,
        requires_ack: false,
        title: "Payroll review notes added",
        detail: `${cmp.total_notes} note${cmp.total_notes === 1 ? "" : "s"} recorded for this period (${cmp.internal_only_notes} internal, ${cmp.pdf_visible_notes} on PDF).`,
        count: cmp.total_notes,
        affected_employee_ids: [],
      });
    }
    if (cmp.pdf_visible_notes > 0) {
      items.push({
        id: "comparison_pdf_notes",
        status: "pass",
        blocking: false,
        requires_ack: false,
        title: "Notes marked for payroll PDF",
        detail: `${cmp.pdf_visible_notes} internal note${cmp.pdf_visible_notes === 1 ? " is" : "s are"} set to appear on the payroll PDF.`,
        count: cmp.pdf_visible_notes,
        affected_employee_ids: [],
      });
    }
  }

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
