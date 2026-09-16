/**
 * Incident book taxonomy, conditional questions and deadline rules.
 *
 * Pure helpers only — no data access — so the rules can be tested directly.
 * Nothing here decides legal reportability: RIDDOR circumstances are flagged
 * for a manager to assess, never determined automatically.
 */

export type ConditionalSet = "accident" | "allergen" | "refusal" | "cctv" | null;

export type ConfidentialityLevel =
  | "operational"
  | "restricted_personal"
  | "restricted_medical"
  | "senior_only";

export const CONFIDENTIALITY_LEVELS: { value: ConfidentialityLevel; label: string; help: string }[] = [
  { value: "operational", label: "Standard operational", help: "Any manager in the branch can read it." },
  { value: "restricted_personal", label: "Restricted — personal information", help: "Managers only; keep names out of registers." },
  { value: "restricted_medical", label: "Restricted — medical information", help: "Only managers you have specifically authorised." },
  { value: "senior_only", label: "Senior management only", help: "Only administrators and senior managers you have authorised." },
];

export function confidentialityLabel(v?: string | null) {
  return CONFIDENTIALITY_LEVELS.find((l) => l.value === v)?.label ?? "Standard operational";
}

/** Levels that must be left out of general register exports. */
export function isRestricted(level?: string | null) {
  return level === "restricted_medical" || level === "senior_only";
}

export interface IncidentCategory {
  value: string;
  label: string;
  /** Extra questions shown for this category only. */
  conditional: ConditionalSet;
  /** Recorded because the Fitzrovia premises licence (condition 28) requires it. */
  condition28: boolean;
  /** Starting confidentiality — a manager can raise it, never silently lower it. */
  defaultConfidentiality: ConfidentialityLevel;
}

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  { value: "staff_accident", label: "Staff accident or injury", conditional: "accident", condition28: false, defaultConfidentiality: "restricted_medical" },
  { value: "customer_accident", label: "Customer accident or injury", conditional: "accident", condition28: false, defaultConfidentiality: "restricted_medical" },
  { value: "near_miss", label: "Near miss", conditional: "accident", condition28: false, defaultConfidentiality: "operational" },
  { value: "allergen", label: "Allergen incident", conditional: "allergen", condition28: false, defaultConfidentiality: "restricted_medical" },
  { value: "food_safety", label: "Food safety incident", conditional: "allergen", condition28: false, defaultConfidentiality: "operational" },
  { value: "alcohol_refusal", label: "Refusal of an alcohol sale", conditional: "refusal", condition28: true, defaultConfidentiality: "operational" },
  { value: "underage_sale", label: "Suspected underage sale", conditional: "refusal", condition28: true, defaultConfidentiality: "operational" },
  { value: "intoxicated_customer", label: "Intoxicated customer", conditional: "refusal", condition28: true, defaultConfidentiality: "operational" },
  { value: "crime_reported", label: "Crime reported", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "customer_ejection", label: "Customer ejected from the premises", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "disorder", label: "Disorder or threatening behaviour", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "drugs_weapons", label: "Drugs or offensive weapon seized", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "cctv_fault", label: "CCTV fault", conditional: "cctv", condition28: true, defaultConfidentiality: "operational" },
  { value: "crime_complaint", label: "Complaint concerning crime or disorder", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "police_visit", label: "Police visit", conditional: null, condition28: true, defaultConfidentiality: "restricted_personal" },
  { value: "authority_visit", label: "Council or licensing officer visit", conditional: null, condition28: true, defaultConfidentiality: "operational" },
  { value: "ambulance_attendance", label: "Ambulance attendance", conditional: "accident", condition28: true, defaultConfidentiality: "restricted_medical" },
  { value: "fire_service_attendance", label: "Fire service attendance", conditional: null, condition28: true, defaultConfidentiality: "operational" },
  { value: "property_damage", label: "Property damage", conditional: null, condition28: false, defaultConfidentiality: "operational" },
  { value: "other", label: "Other", conditional: null, condition28: false, defaultConfidentiality: "operational" },
];

export function findCategory(value?: string | null): IncidentCategory | undefined {
  return INCIDENT_CATEGORIES.find((c) => c.value === value);
}

export function categoryLabel(value?: string | null) {
  return findCategory(value)?.label ?? value ?? "Incident";
}

/** True when the premises licence requires this incident to be recorded. */
export function requiresLicenceRecord(category?: string | null) {
  return findCategory(category)?.condition28 ?? false;
}

export function defaultConfidentiality(category?: string | null): ConfidentialityLevel {
  return findCategory(category)?.defaultConfidentiality ?? "operational";
}

/* ─────────────── Conditional questions ─────────────── */

export type FieldType = "text" | "textarea" | "yesno" | "select" | "date" | "number";

export interface ConditionalField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  help?: string;
}

const ACCIDENT_FIELDS: ConditionalField[] = [
  { key: "person_type", label: "Who was injured?", type: "select", options: ["Staff", "Customer", "Contractor", "Visitor"] },
  { key: "injury_nature", label: "Nature of the injury", type: "text" },
  { key: "first_aid_given", label: "Was first aid given?", type: "yesno" },
  { key: "first_aider", label: "First aider's name", type: "text" },
  { key: "medical_assistance", label: "Other medical assistance given", type: "text" },
  { key: "ambulance_called", label: "Was an ambulance called?", type: "yesno" },
  { key: "hospital", label: "Did the person go to hospital?", type: "yesno" },
  { key: "witnesses", label: "Witnesses", type: "text" },
  { key: "absence_expected", label: "Is time off work expected?", type: "yesno" },
  { key: "absence_days", label: "Days off work (actual, if known)", type: "number" },
  { key: "riddor_review", label: "Does this need a RIDDOR review?", type: "yesno", help: "A manager decides whether it is legally reportable — the app only flags it." },
];

const ALLERGEN_FIELDS: ConditionalField[] = [
  { key: "allergen", label: "Allergen or hazard involved", type: "text" },
  { key: "item", label: "Food or drink involved", type: "text" },
  { key: "order_number", label: "Order or receipt number", type: "text" },
  { key: "pos_evidence", label: "Is the till record available?", type: "yesno" },
  { key: "kitchen_ticket", label: "Is the kitchen ticket available?", type: "yesno" },
  { key: "matrix_checked", label: "Was the allergen matrix checked?", type: "yesno" },
  { key: "food_isolated", label: "Was the food isolated?", type: "yesno" },
  { key: "symptoms", label: "Symptoms reported", type: "textarea" },
  { key: "emergency_services", label: "Were emergency services called?", type: "yesno" },
  { key: "manager_notified", label: "Manager notified", type: "text" },
  { key: "kitchen_notified", label: "Kitchen notified", type: "text" },
];

const REFUSAL_FIELDS: ConditionalField[] = [
  { key: "reason", label: "Reason for refusal", type: "text" },
  { key: "id_requested", label: "Was ID requested?", type: "yesno" },
  { key: "id_type", label: "Type of ID shown", type: "select", options: ["None", "Passport", "Driving licence", "PASS card", "Other"] },
  { key: "id_outcome", label: "Was the ID accepted?", type: "select", options: ["Accepted", "Rejected", "Not shown"] },
  { key: "apparent_age", label: "Apparent age", type: "text" },
  { key: "alcohol_involved", label: "Drink involved", type: "text" },
  { key: "customer_reaction", label: "How did the customer react?", type: "textarea" },
  { key: "police_involved", label: "Were the police involved?", type: "yesno" },
];

const CCTV_FIELDS: ConditionalField[] = [
  { key: "camera", label: "Camera or area affected", type: "text" },
  { key: "fault_found_at", label: "When was the fault found?", type: "text" },
  { key: "recording_available", label: "Is recording still available?", type: "yesno" },
  { key: "period_protected", label: "Has the CCTV period been protected?", type: "yesno" },
  { key: "contractor_notified", label: "Was the CCTV contractor notified?", type: "yesno" },
  { key: "authority_reference", label: "Police or authority reference", type: "text" },
];

export function conditionalFields(category?: string | null): ConditionalField[] {
  switch (findCategory(category)?.conditional) {
    case "accident": return ACCIDENT_FIELDS;
    case "allergen": return ALLERGEN_FIELDS;
    case "refusal": return REFUSAL_FIELDS;
    case "cctv": return CCTV_FIELDS;
    default: return [];
  }
}

/** Circumstances worth a RIDDOR check. Advisory only — never a legal decision. */
export function riddorWorthChecking(category?: string | null, details?: Record<string, any> | null): boolean {
  const cat = findCategory(category);
  if (!cat || cat.conditional !== "accident") return false;
  const d = details ?? {};
  return (
    d.riddor_review === true ||
    d.hospital === true ||
    d.ambulance_called === true ||
    (typeof d.absence_days === "number" && d.absence_days >= 7) ||
    (typeof d.absence_days === "string" && Number(d.absence_days) >= 7)
  );
}

/* ─────────────── Required fields ─────────────── */

export const REQUIRED_FIELDS = [
  "branch", "incident_date", "incident_time", "location_detail", "category", "description",
] as const;

export function missingRequired(form: Record<string, any>): string[] {
  const labels: Record<string, string> = {
    branch: "Branch",
    incident_date: "Date of the incident",
    incident_time: "Time of the incident",
    location_detail: "Exactly where it happened",
    category: "What kind of incident",
    description: "What happened",
  };
  return REQUIRED_FIELDS.filter((k) => {
    const v = form[k];
    return v === undefined || v === null || String(v).trim() === "";
  }).map((k) => labels[k]);
}

export function canSubmit(form: Record<string, any>): boolean {
  return missingRequired(form).length === 0;
}

/* ─────────────── 24-hour licence deadline ─────────────── */

export type DeadlineState = "none" | "ok" | "warning" | "urgent" | "overdue";

/** Deadline for recording a licence-required incident: 24 hours from the incident. */
export function incidentDeadline(
  incidentDate?: string | null,
  incidentTime?: string | null
): Date | null {
  if (!incidentDate) return null;
  const time = /^\d{2}:\d{2}/.test(incidentTime ?? "") ? incidentTime!.slice(0, 5) : "00:00";
  const start = new Date(`${incidentDate}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Warning at 12 hours, urgent at 20 hours, overdue after 24 hours —
 * measured from the incident itself, not from when someone started typing.
 */
export function deadlineState(
  opts: {
    category?: string | null;
    status?: string | null;
    incident_date?: string | null;
    incident_time?: string | null;
  },
  now: Date = new Date()
): DeadlineState {
  if (!requiresLicenceRecord(opts.category)) return "none";
  if (opts.status && opts.status !== "draft") return "ok";
  const due = incidentDeadline(opts.incident_date, opts.incident_time);
  if (!due) return "none";
  const elapsedHours = (now.getTime() - (due.getTime() - 24 * 60 * 60 * 1000)) / 3_600_000;
  if (elapsedHours >= 24) return "overdue";
  if (elapsedHours >= 20) return "urgent";
  if (elapsedHours >= 12) return "warning";
  return "ok";
}

export function deadlineMessage(state: DeadlineState): string | null {
  switch (state) {
    case "warning": return "This must be recorded within 24 hours of the incident — 12 hours have passed.";
    case "urgent": return "Urgent: less than 4 hours left to record this incident.";
    case "overdue": return "Overdue: this licence-required incident was not recorded within 24 hours.";
    default: return null;
  }
}

/* ─────────────── Status ─────────────── */

export const INCIDENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "investigating", label: "Investigation" },
  { value: "closed", label: "Closed" },
] as const;

export function statusLabel(v?: string | null) {
  return INCIDENT_STATUSES.find((s) => s.value === v)?.label ?? "Draft";
}

export function statusTone(v?: string | null): "muted" | "warning" | "success" | "primary" {
  switch (v) {
    case "closed": return "success";
    case "submitted": return "warning";
    case "under_review":
    case "investigating": return "primary";
    default: return "muted";
  }
}

/** Submitted reports are never editable in place — corrections become amendments. */
export function isLocked(status?: string | null) {
  return !!status && status !== "draft";
}
