/**
 * Compliance audit vocabulary and change comparison.
 *
 * Pure helpers only — no database access — so the wording and the
 * before/after comparison can be tested on their own.
 */

export type ComplianceAuditEvent =
  | "document_created"
  | "document_edited"
  | "file_replaced"
  | "version_issued"
  | "document_approved"
  | "document_rejected"
  | "document_archived"
  | "document_restored"
  | "branch_assignment_changed"
  | "role_assignment_changed"
  | "expiry_or_review_date_changed"
  | "branch_confirmed"
  | "incident_created"
  | "incident_submitted"
  | "incident_viewed"
  | "incident_amended"
  | "incident_status_changed"
  | "incident_assigned"
  | "incident_closed"
  | "incident_evidence_added"
  | "incident_confidentiality_changed"
  | "licence_recorded"
  | "licence_edited"
  | "licence_condition_created"
  | "licence_condition_edited"
  | "licence_condition_checked"
  | "training_reissued";

export const COMPLIANCE_AUDIT_LABELS: Record<ComplianceAuditEvent, string> = {
  document_created: "Document created",
  document_edited: "Document edited",
  file_replaced: "File replaced",
  version_issued: "New version issued",
  document_approved: "Document approved",
  document_rejected: "Document rejected",
  document_archived: "Document archived",
  document_restored: "Document restored",
  branch_assignment_changed: "Branch assignment changed",
  role_assignment_changed: "Role assignment changed",
  expiry_or_review_date_changed: "Expiry or review date changed",
  branch_confirmed: "Branch confirmed",
  incident_created: "Incident report started",
  incident_submitted: "Incident submitted",
  incident_viewed: "Incident opened",
  incident_amended: "Incident amended",
  incident_status_changed: "Incident status changed",
  incident_assigned: "Incident assigned",
  incident_closed: "Incident closed",
  incident_evidence_added: "Evidence added",
  incident_confidentiality_changed: "Confidentiality changed",
  licence_recorded: "Premises licence recorded",
  licence_edited: "Premises licence edited",
  licence_condition_created: "Licence condition added",
  licence_condition_edited: "Licence condition edited",
  licence_condition_checked: "Licence condition checked",
  training_reissued: "Training re-issued",
};

/** Audit actions supported by the shared audit log. */
export type AuditAction = "create" | "update" | "delete" | "approve" | "reject" | "import";

export function auditActionForEvent(event: ComplianceAuditEvent): AuditAction {
  if (
    event === "document_created" || event === "incident_created" ||
    event === "licence_recorded" || event === "licence_condition_created"
  ) return "create";
  if (event === "document_approved" || event === "branch_confirmed") return "approve";
  if (event === "document_rejected") return "reject";
  return "update";
}

export interface FieldChange {
  field: string;
  label: string;
  previous: string;
  next: string;
}

/** Plain-English names for the fields we audit. */
export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  category: "Category",
  description: "Description",
  file_path: "File",
  version: "Version",
  status: "Library status",
  approval_status: "Approval status",
  approval_note: "Approval note",
  applies_to_all_branches: "Applies to all branches",
  branches: "Branches",
  branch_ids: "Branches",
  applies_to_all_roles: "Applies to all staff",
  roles: "Roles",
  requires_signature: "Signature required",
  include_in_induction: "Included in induction",
  must_display: "Displayed at site",
  inspection_required: "Needed for inspection",
  alcohol_related: "Alcohol related",
  expires_at: "Expiry date",
  issue_date: "Issue date",
  review_date: "Review date",
  owner_name: "Owner name",
  owner_job_title: "Owner job title",
  issuing_authority: "Issuing authority",
  reference_number: "Reference number",
  requirement_classification: "Requirement classification",
  incident_date: "Date of the incident",
  incident_time: "Time of the incident",
  location_detail: "Where it happened",
  people_involved: "People involved",
  immediate_action: "Immediate action taken",
  manager_notified: "Manager notified",
  manager_notified_name: "Manager notified",
  evidence_available: "Evidence available",
  confidentiality: "Confidentiality",
  findings: "Findings",
  root_cause: "Root cause",
  immediate_controls: "Immediate controls",
  riddor_flagged: "RIDDOR review flagged",
  riddor_assessment: "RIDDOR assessment",
  insurance_notified: "Insurer notified",
  authority_notified: "Authority notified",
  authority_reference: "Authority reference",
  training_required: "Training required",
  outcome: "Final outcome",
  responsible_job_title: "Responsible job title",
  responsible_person: "Responsible person",
  action_deadline: "Completion deadline",
  review_notes: "Initial review",
  licence_number: "Premises licence number",
  licence_holder: "Licence holder",
  dps_name: "Designated premises supervisor",
  dps_licence_number: "DPS personal licence number",
  condition_number: "Condition number",
  legal_wording: "Original legal wording",
  staff_instruction: "Plain-English staff instruction",
  frequency: "How often",
  evidence_required: "Evidence required",
  last_check: "Last check",
  next_check: "Next check",
};

function present(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = [...((a as unknown[]) ?? [])].map(String).sort();
    const right = [...((b as unknown[]) ?? [])].map(String).sort();
    return left.length === right.length && left.every((v, i) => v === right[i]);
  }
  const norm = (v: unknown) => (v === null || v === undefined || v === "" ? null : v);
  return norm(a) === norm(b);
}

/**
 * Lists what actually changed between two records, using only the keys present
 * in `next`. Untouched fields are never recorded, so nothing is overwritten
 * silently and the history stays readable.
 */
export function diffFields(
  previous: Record<string, any> | null | undefined,
  next: Record<string, any>
): FieldChange[] {
  const prev = previous ?? {};
  return Object.keys(next)
    .filter((key) => key !== "updated_at" && key !== "id" && key !== "tenant_id")
    .filter((key) => !sameValue(prev[key], next[key]))
    .map((key) => ({
      field: key,
      label: FIELD_LABELS[key] ?? key.replace(/_/g, " "),
      previous: present(prev[key]),
      next: present(next[key]),
    }));
}

/** Extra events implied by an edit, so branch/role/date changes are named explicitly. */
export function derivedEvents(changes: FieldChange[]): ComplianceAuditEvent[] {
  const events: ComplianceAuditEvent[] = [];
  const fields = new Set(changes.map((c) => c.field));
  if (fields.has("branches") || fields.has("branch_ids") || fields.has("applies_to_all_branches")) {
    events.push("branch_assignment_changed");
  }
  if (fields.has("roles") || fields.has("applies_to_all_roles")) {
    events.push("role_assignment_changed");
  }
  if (fields.has("expires_at") || fields.has("review_date") || fields.has("issue_date")) {
    events.push("expiry_or_review_date_changed");
  }
  return events;
}
