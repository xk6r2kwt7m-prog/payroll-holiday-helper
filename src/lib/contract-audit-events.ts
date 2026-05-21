/**
 * Phase 5N — Pure helper that builds typed audit event payloads for
 * contract lifecycle events. Persistence is intentionally out of scope
 * in this phase.
 *
 * TODO(phase-future): wire `buildContractAuditEvent` into a controlled
 * audit-write helper (e.g. `contract_lifecycle_audit` table) once the
 * schema is explicitly approved. Until then this helper only builds the
 * payload; nothing is written.
 *
 * Important: only contract-lifecycle events are emitted (generated,
 * issued, signed, locked, superseded, voided). Field-level UI typing
 * MUST NOT produce audit events — that would create noisy logs.
 *
 * Strictly read-only:
 * - No React, Supabase, React Query
 * - No mutation of inputs
 * - No side effects
 */
import type { ContractDraftEvidence } from "@/lib/contract-draft-evidence";
import type { ContractWorkflowStatus } from "@/lib/contract-status-transitions";

export type ContractAuditEventType =
  | "contract_generated"
  | "contract_issued"
  | "contract_signed"
  | "contract_locked"
  | "contract_superseded"
  | "contract_voided";

export interface ContractAuditEvent {
  eventType: ContractAuditEventType;
  contractId: string;
  employeeId: string | null;
  actorUserId: string | null;
  previousStatus: ContractWorkflowStatus;
  newStatus: ContractWorkflowStatus;
  occurredAtIso: string;
  /** Optional Phase 5K evidence snapshot for generated/issued events. */
  evidenceSummary?: Pick<
    ContractDraftEvidence,
    | "readinessStatus"
    | "autoFilledCount"
    | "manuallyEnteredCriticalFields"
    | "missingCriticalFields"
    | "reportingManagerStatus"
    | "payDetailsStatus"
  > | null;
  /** Optional human-readable reason (amendment / supersede / void). */
  reason?: string | null;
}

export interface BuildContractAuditEventInput {
  eventType: ContractAuditEventType;
  contractId: string;
  employeeId: string | null;
  actorUserId: string | null;
  previousStatus: ContractWorkflowStatus;
  newStatus: ContractWorkflowStatus;
  evidence?: ContractDraftEvidence | null;
  reason?: string | null;
  /** Optional fixed timestamp for tests. Defaults to `new Date()`. */
  now?: Date;
}

/**
 * UI-only edits (typing into a field, toggling a preview) MUST NOT generate
 * audit events. Only the typed lifecycle events listed in
 * `ContractAuditEventType` are valid.
 */
const VALID_EVENT_TYPES: ReadonlySet<ContractAuditEventType> = new Set([
  "contract_generated",
  "contract_issued",
  "contract_signed",
  "contract_locked",
  "contract_superseded",
  "contract_voided",
]);

export function isValidContractAuditEventType(
  eventType: string,
): eventType is ContractAuditEventType {
  return VALID_EVENT_TYPES.has(eventType as ContractAuditEventType);
}

export function buildContractAuditEvent(
  input: BuildContractAuditEventInput,
): ContractAuditEvent {
  if (!isValidContractAuditEventType(input.eventType)) {
    throw new Error(
      `Invalid contract audit event type: "${input.eventType}". UI-only edits must not be audited.`,
    );
  }
  if (!input.contractId || String(input.contractId).trim() === "") {
    throw new Error("contractId is required for contract audit events.");
  }

  const now = input.now ?? new Date();

  const evidenceSummary =
    input.evidence && includeEvidence(input.eventType)
      ? {
          readinessStatus: input.evidence.readinessStatus,
          autoFilledCount: input.evidence.autoFilledCount,
          manuallyEnteredCriticalFields:
            input.evidence.manuallyEnteredCriticalFields,
          missingCriticalFields: input.evidence.missingCriticalFields,
          reportingManagerStatus: input.evidence.reportingManagerStatus,
          payDetailsStatus: input.evidence.payDetailsStatus,
        }
      : null;

  return {
    eventType: input.eventType,
    contractId: input.contractId,
    employeeId: input.employeeId ?? null,
    actorUserId: input.actorUserId ?? null,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    occurredAtIso: now.toISOString(),
    evidenceSummary,
    reason: input.reason ?? null,
  };
}

/** Evidence summary is most useful at the moment a contract is prepared. */
function includeEvidence(eventType: ContractAuditEventType): boolean {
  return (
    eventType === "contract_generated" ||
    eventType === "contract_issued" ||
    eventType === "contract_signed"
  );
}
