/**
 * Ugly Dumpling Allergen Safety — pre-publication management acceptance items.
 *
 * Proposals only. Nothing in this file is active: the certificate policy is not
 * applied, no reminder is scheduled or sent, and the outstanding evidence
 * requests stay open until management approves the evidence.
 */

export interface OutstandingEvidenceRequest {
  dish: string;
  status: "open";
  onCurrentMenu: boolean;
  required: string[];
  effect: string;
}

/** Open evidence requests. Neither dish may be described as confirmed. */
export const OUTSTANDING_EVIDENCE_REQUESTS: OutstandingEvidenceRequest[] = [
  {
    dish: "Tempura Aubergine",
    status: "open",
    onCurrentMenu: true,
    required: [
      "Current batter recipe",
      "Flour packaging",
      "Supplier specification",
      "Fryer used",
      "Gluten cross-contact assessment",
      "Peanut and tree-nut cross-contact assessment",
    ],
    effect:
      "Allergen record incomplete — not confirmed. Taught in the peanut-garnish lesson; excluded from every scored flavour question.",
  },
  {
    dish: "Corn Fritters",
    status: "open",
    onCurrentMenu: true,
    required: [
      "Current batter recipe",
      "Ingredient packaging",
      "Supplier specification",
      "Fryer used",
      "Cross-contact assessment",
    ],
    effect: "Allergen record incomplete — not confirmed. Excluded from every scored flavour question.",
  },
];

export const OUTSTANDING_EVIDENCE_WARNING =
  "Active menu products still have outstanding allergen evidence. Their allergen records must not be described as confirmed until management approves the evidence.";

/* ─────────────── Proposed certificate policy (not active) ─────────────── */

export interface PolicyClause {
  label: string;
  detail: string;
}

export const PROPOSED_CERTIFICATE_POLICY: PolicyClause[] = [
  { label: "Validity", detail: "12 months from the date of issue." },
  {
    label: "Issue conditions",
    detail:
      "Issued only after every required lesson is completed, the assessment is passed at 80% with every critical-safety question correct, and the practical observation is passed and signed by an authorised manager.",
  },
  { label: "Reference", detail: "Unique certificate reference per tenant (UD-ALL-YYYY-0001; test records are prefixed TEST-)." },
  { label: "Recorded facts", detail: "Course version studied, assessment score, lessons completed, practical assessor and their role." },
  { label: "Dates", detail: "Issue date, valid-from date and expiry/review date all recorded." },
  { label: "History", detail: "Historical certificates are preserved. Issued facts cannot be rewritten." },
  { label: "Revocation", detail: "A reason is required and is recorded in the audit trail." },
  { label: "Superseding", detail: "A superseded certificate must link to the replacement certificate." },
  { label: "Minor updates", detail: "A minor course update does not invalidate an existing certificate." },
  { label: "Major safety updates", detail: "A major safety update may require retraining and supersede the existing certificate." },
];

/* ─────────────── Proposed reminders (automatic sending off) ─────────────── */

export interface ProposedReminder {
  key: string;
  trigger: string;
  recipient: string;
  channel: string;
  wording: string;
}

export const PROPOSED_REMINDERS: ProposedReminder[] = [
  {
    key: "assigned",
    trigger: "Course assigned",
    recipient: "The member of staff (copy to their manager)",
    channel: "In-app notification; email only if the administrator approves sending",
    wording:
      "Allergen Safety training has been added to your training list. It takes about 50 minutes and you can stop and continue later. Please complete it by {due_date}.",
  },
  {
    key: "due-7",
    trigger: "Seven days before the completion deadline",
    recipient: "The member of staff",
    channel: "In-app notification",
    wording: "Your Allergen Safety training is due on {due_date}. You have {sections_left} sections left.",
  },
  {
    key: "due-0",
    trigger: "On the deadline",
    recipient: "The member of staff; summary to the manager",
    channel: "In-app notification",
    wording: "Your Allergen Safety training is due today. Please finish it before your next shift.",
  },
  {
    key: "overdue",
    trigger: "Overdue",
    recipient: "The manager, and the member of staff",
    channel: "In-app notification",
    wording: "Allergen Safety training is overdue for {employee_name} at {site}. Please arrange time for them to complete it.",
  },
  {
    key: "expiry-60",
    trigger: "60 days before certificate expiry",
    recipient: "The manager",
    channel: "In-app notification",
    wording: "{employee_name}'s Allergen Safety certificate expires on {expiry_date}. Plan their refresher.",
  },
  {
    key: "expiry-30",
    trigger: "30 days before expiry",
    recipient: "The member of staff and their manager",
    channel: "In-app notification",
    wording: "Your Allergen Safety certificate expires on {expiry_date}. Your refresher is now available.",
  },
  {
    key: "expiry-7",
    trigger: "Seven days before expiry",
    recipient: "The member of staff and their manager",
    channel: "In-app notification",
    wording: "Your Allergen Safety certificate expires on {expiry_date}. Please complete the refresher this week.",
  },
  {
    key: "expired",
    trigger: "After expiry",
    recipient: "The manager",
    channel: "In-app notification",
    wording:
      "{employee_name}'s Allergen Safety certificate expired on {expiry_date}. Retraining is required; record the outcome once complete.",
  },
];

export const REMINDER_POLICY_STATE =
  "Proposed only. Automatic sending is switched off — reminders are listed for the administrator, and nothing reaches staff without separate approval.";
