/**
 * Phase 5D — Payroll approval evidence model + pure derivation helper.
 *
 * This module defines the typed shape of the read-only approval evidence
 * snapshot shown to managers in the payroll approval area, and a pure
 * derivation helper that builds it from existing in-memory state.
 *
 * Hard rules (preserved):
 *   - Pure, deterministic, side-effect-free. No React, no Supabase,
 *     no mutations, no audit writes.
 *   - Service charge remains excluded from NMW eligible pay. This module
 *     never recomputes NMW; it only reflects checklist state.
 *   - The `approve_and_lock` / `useApprovePayrollPeriod` flow remains the
 *     sole approval write path.
 *
 * TODO (future immutable evidence): this `PayrollApprovalEvidence` object
 * is the intended candidate for an immutable, persisted approval snapshot
 * captured at the moment of approval. Persistence is INTENTIONALLY NOT
 * implemented in this phase — no database tables, columns, migrations,
 * or audit action types are added here. When the audit design is later
 * expanded, the same shape can be serialised against the existing
 * `approve_and_lock` event without rederiving it from live state.
 */
import type { ApprovalChecklistResult } from "@/lib/payroll-approval-checklist";

export type ApprovalEvidenceStatus =
  | "draft_readiness_only"
  | "blocked"
  | "ready_for_approval"
  | "locked";

/** Stable, UI-friendly labels for each status. */
export const APPROVAL_EVIDENCE_STATUS_LABEL: Record<ApprovalEvidenceStatus, string> = {
  draft_readiness_only: "Draft readiness only",
  blocked: "Blocked",
  ready_for_approval: "Ready for approval",
  locked: "Locked / Approved",
};

export interface PayrollApprovalEvidenceInput {
  period: {
    id: string;
    period_name: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
  };
  payrollEntryCount: number;
  checklist: ApprovalChecklistResult | null;
  acknowledgedIds: Set<string> | ReadonlySet<string>;
  approvalConfirmed: boolean;
  /** Externally-derived block reason (e.g. from the parent gate). */
  approvalBlockedReason: string | null;
  /** Optional injected clock for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
}

export interface PayrollApprovalEvidence {
  periodId: string;
  periodName: string;
  /** Human-friendly date range string, or null when dates are missing. */
  periodDateRange: string | null;
  payrollEntryCount: number;
  blockingChecklistCount: number;
  warningCount: number;
  acknowledgementsRequired: number;
  acknowledgedWarningCount: number;
  warningsAcknowledged: boolean;
  approvalConfirmed: boolean;
  approvalBlocked: boolean;
  approvalBlockedReason: string | null;
  approvalStatus: ApprovalEvidenceStatus;
  approvalStatusLabel: string;
  /** UI-only timestamp for "generated at" display. Not for persistence. */
  generatedAtDisplay: string;
}

/* -------------------------------------------------------------------------- */

/**
 * Build the read-only approval evidence snapshot from existing state.
 * Pure: same input → same output (modulo `now`, which is injectable).
 */
export function buildPayrollApprovalEvidence(
  input: PayrollApprovalEvidenceInput,
): PayrollApprovalEvidence {
  const {
    period,
    payrollEntryCount,
    checklist,
    acknowledgedIds,
    approvalConfirmed,
    approvalBlockedReason,
    now = new Date(),
  } = input;

  const blockingChecklistCount = checklist?.blocking_count ?? 0;
  const warningCount = checklist?.warning_count ?? 0;
  const ackRequired = checklist?.ack_required_ids ?? [];
  const acknowledgedWarningCount = ackRequired.filter((id) =>
    acknowledgedIds.has(id),
  ).length;
  const warningsAcknowledged =
    ackRequired.length === 0 || acknowledgedWarningCount === ackRequired.length;

  const approvalBlocked = approvalBlockedReason != null;

  const periodAlreadyApproved =
    period.status === "approved" || !!checklist?.period_already_approved;

  let approvalStatus: ApprovalEvidenceStatus;
  if (periodAlreadyApproved) {
    approvalStatus = "locked";
  } else if (period.status === "draft") {
    approvalStatus = "draft_readiness_only";
  } else if (approvalBlocked) {
    approvalStatus = "blocked";
  } else {
    approvalStatus = "ready_for_approval";
  }

  return {
    periodId: period.id,
    periodName: period.period_name,
    periodDateRange: formatDateRange(period.start_date, period.end_date),
    payrollEntryCount,
    blockingChecklistCount,
    warningCount,
    acknowledgementsRequired: ackRequired.length,
    acknowledgedWarningCount,
    warningsAcknowledged,
    approvalConfirmed,
    approvalBlocked,
    approvalBlockedReason,
    approvalStatus,
    approvalStatusLabel: APPROVAL_EVIDENCE_STATUS_LABEL[approvalStatus],
    generatedAtDisplay: formatTimestamp(now),
  };
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTimestamp(d: Date): string {
  try {
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}
