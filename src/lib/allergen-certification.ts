/**
 * Ugly Dumpling Allergen Safety — Phase 2 logic (assignment tracking, practical
 * sign-off, certification, validity and reminders).
 *
 * Pure, deterministic functions only. Nothing here writes to the database,
 * publishes a course version, sends anything or issues a certificate by itself.
 *
 * Approved rules implemented here:
 *  • A certificate may only exist once ALL THREE gates are met:
 *      1. every required lesson completed,
 *      2. the assessment passed under the approved rules
 *         (80% and every critical-safety question correct), and
 *      3. the practical observation passed and signed by an authorised manager.
 *  • Until then the learner status is "Assessment passed — awaiting practical sign-off"
 *    (or an earlier stage) and the course is not complete.
 *  • Reminders are calculated, never sent. Automatic sending stays off unless
 *    management switches it on.
 */

import { ALLERGEN_PASS_MARK } from "@/lib/allergen-course";
import {
  PRACTICAL_SIGNOFF_TEMPLATE,
  type ObservationAudience,
  type PracticalObservationItem,
} from "@/data/allergen/allergen-practical-signoff";

/* ───────────────────────── Assignment tracking ───────────────────────── */

export type AllergenAssignmentStatus =
  | "not_started"
  | "lessons_in_progress"
  | "lessons_complete"
  | "assessment_in_progress"
  | "manager_coaching_required"
  | "passed_awaiting_practical"
  | "practical_in_progress"
  | "complete"
  | "withdrawn";

export const ASSIGNMENT_STATUS_LABELS: Record<AllergenAssignmentStatus, string> = {
  not_started: "Not started",
  lessons_in_progress: "Reading the lessons",
  lessons_complete: "Lessons complete — assessment open",
  assessment_in_progress: "Assessment in progress",
  manager_coaching_required: "Manager coaching required",
  passed_awaiting_practical: "Assessment passed — awaiting practical sign-off",
  practical_in_progress: "Practical observation started",
  complete: "Complete — certificate issued",
  withdrawn: "Withdrawn",
};

export interface TrackingInput {
  /** From courseProgress(): mandatory lessons still outstanding. */
  mandatoryOutstanding: string[];
  sectionsComplete: number;
  attempts: { status: string; outcome: string | null; passed: boolean | null }[];
  coachingRecorded: boolean;
  observation: { outcome: string; signedAt: string | null } | null;
  certificateIssued: boolean;
  withdrawn?: boolean;
}

export function assignmentStatus(input: TrackingInput): AllergenAssignmentStatus {
  if (input.withdrawn) return "withdrawn";
  if (input.certificateIssued) return "complete";

  const submitted = input.attempts.filter((a) => a.status === "submitted");
  const passed = submitted.some((a) => a.passed === true);

  if (passed) {
    if (input.observation && input.observation.signedAt) return "passed_awaiting_practical";
    if (input.observation) return "practical_in_progress";
    return "passed_awaiting_practical";
  }

  if (submitted.length >= 2 && !input.coachingRecorded) return "manager_coaching_required";
  if (input.attempts.some((a) => a.status === "in_progress") || submitted.length > 0)
    return "assessment_in_progress";
  if (input.mandatoryOutstanding.length === 0 && input.sectionsComplete > 0) return "lessons_complete";
  if (input.sectionsComplete > 0) return "lessons_in_progress";
  return "not_started";
}

/* ───────────────────────── Practical observation ───────────────────────── */

export interface ObservationItemResult {
  seen: boolean;
  note?: string;
}

export type ObservationResults = Record<string, ObservationItemResult>;

export function observationItemsFor(audience: ObservationAudience): PracticalObservationItem[] {
  if (audience === "both") return PRACTICAL_SIGNOFF_TEMPLATE.items;
  return PRACTICAL_SIGNOFF_TEMPLATE.items.filter(
    (i) => i.audience === audience || i.audience === "both",
  );
}

export interface ObservationMarking {
  itemsTotal: number;
  itemsSeen: number;
  criticalMissed: string[];
  /** Every item seen and no critical observation missed. */
  outcome: "in_progress" | "passed" | "not_yet_competent";
  outstanding: string[];
}

export function markObservation(
  items: PracticalObservationItem[],
  results: ObservationResults,
): ObservationMarking {
  const answered = items.filter((i) => results[i.ref] !== undefined);
  const seen = items.filter((i) => results[i.ref]?.seen === true);
  const criticalMissed = items
    .filter((i) => i.critical && results[i.ref] !== undefined && results[i.ref]?.seen !== true)
    .map((i) => i.ref);
  const outstanding = items.filter((i) => results[i.ref] === undefined).map((i) => i.title);

  let outcome: ObservationMarking["outcome"] = "in_progress";
  if (answered.length === items.length && items.length > 0) {
    outcome = seen.length === items.length ? "passed" : "not_yet_competent";
  }

  return {
    itemsTotal: items.length,
    itemsSeen: seen.length,
    criticalMissed,
    outcome,
    outstanding,
  };
}

/* ───────────────────────── Certification gate ───────────────────────── */

export interface CertificationInput {
  lessonsComplete: number;
  lessonsRequired: number;
  mandatoryOutstanding: string[];
  assessment: {
    passed: boolean;
    scorePercent: number | null;
    criticalMissed: string[];
  } | null;
  observation: {
    outcome: string;
    signedAt: string | null;
    signedByName: string | null;
    signerIsAuthorisedManager: boolean;
  } | null;
  existingValidCertificate?: boolean;
}

export interface CertificationGate {
  eligible: boolean;
  /** Plain-English reasons a certificate cannot be issued yet. */
  blockers: string[];
  status: string;
}

export function certificationGate(input: CertificationInput): CertificationGate {
  const blockers: string[] = [];

  if (input.mandatoryOutstanding.length > 0 || input.lessonsComplete < input.lessonsRequired) {
    blockers.push(
      `Required lessons not finished (${input.lessonsComplete} of ${input.lessonsRequired}).`,
    );
  }

  if (!input.assessment || !input.assessment.passed) {
    blockers.push("The assessment has not been passed under the approved rules.");
  } else {
    if ((input.assessment.scorePercent ?? 0) < ALLERGEN_PASS_MARK) {
      blockers.push(`The assessment score is below the ${ALLERGEN_PASS_MARK}% pass mark.`);
    }
    if (input.assessment.criticalMissed.length > 0) {
      blockers.push("A critical-safety question was answered incorrectly.");
    }
  }

  if (!input.observation) {
    blockers.push("No practical observation has been recorded.");
  } else {
    if (input.observation.outcome !== "passed") {
      blockers.push("The practical observation has not been passed.");
    }
    if (!input.observation.signedAt || !input.observation.signedByName) {
      blockers.push("The practical observation has not been signed.");
    } else if (!input.observation.signerIsAuthorisedManager) {
      blockers.push("The practical observation was not signed by an authorised manager.");
    }
  }

  if (input.existingValidCertificate) {
    blockers.push("A valid certificate already exists — supersede it before issuing another.");
  }

  const eligible = blockers.length === 0;
  const status = eligible
    ? "Ready to certify"
    : input.assessment?.passed && blockers.length > 0
      ? PRACTICAL_SIGNOFF_TEMPLATE.status_on_assessment_pass
      : "Not yet eligible";

  return { eligible, blockers, status };
}

/* ───────────────────────── Validity and reminders ───────────────────────── */

export interface RenewalSettings {
  validity_months: number;
  reminder_days_before: number[];
  overdue_reminder_days: number[];
  automatic_sending_enabled: boolean;
  new_version_action: "manager_decides" | "stay_valid" | "supersede" | "require_retraining";
}

export const DEFAULT_RENEWAL_SETTINGS: RenewalSettings = {
  validity_months: 12,
  reminder_days_before: [60, 30, 7],
  overdue_reminder_days: [1, 14],
  automatic_sending_enabled: false,
  new_version_action: "manager_decides",
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function expiryFor(validFrom: string, validityMonths: number): string {
  const d = new Date(`${validFrom}T00:00:00Z`);
  const target = new Date(d);
  target.setUTCMonth(target.getUTCMonth() + validityMonths);
  // Guard against month-end overflow (e.g. 31 Jan + 1 month).
  if (target.getUTCDate() !== d.getUTCDate()) target.setUTCDate(0);
  return toIsoDate(target);
}

export type CertificateStanding = "valid" | "expiring_soon" | "expired" | "revoked" | "superseded";

export function certificateStanding(
  cert: { status: string; expires_on: string | null },
  today: string,
  earliestReminderDays = 60,
): CertificateStanding {
  if (cert.status === "revoked") return "revoked";
  if (cert.status === "superseded") return "superseded";
  if (!cert.expires_on) return "valid";
  const days = daysBetween(today, cert.expires_on);
  if (days < 0) return "expired";
  if (days <= earliestReminderDays) return "expiring_soon";
  return "valid";
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIsoStr}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export interface PlannedReminder {
  date: string;
  kind: "before_expiry" | "after_expiry";
  label: string;
  /** Always false unless management has switched automatic sending on. */
  automatic: boolean;
  due: boolean;
}

/**
 * Works out when a renewal reminder would fall. It plans only — nothing here
 * sends an email, a link or a notification.
 */
export function reminderSchedule(
  expiresOn: string | null,
  settings: RenewalSettings,
  today: string,
): PlannedReminder[] {
  if (!expiresOn) return [];
  const plan: PlannedReminder[] = [];

  for (const days of [...settings.reminder_days_before].sort((a, b) => b - a)) {
    const d = new Date(`${expiresOn}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    const date = toIsoDate(d);
    plan.push({
      date,
      kind: "before_expiry",
      label: `${days} days before the certificate expires`,
      automatic: settings.automatic_sending_enabled,
      due: daysBetween(today, date) <= 0,
    });
  }

  for (const days of [...settings.overdue_reminder_days].sort((a, b) => a - b)) {
    const d = new Date(`${expiresOn}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    const date = toIsoDate(d);
    plan.push({
      date,
      kind: "after_expiry",
      label: `${days} day${days === 1 ? "" : "s"} after the certificate has expired`,
      automatic: settings.automatic_sending_enabled,
      due: daysBetween(today, date) <= 0,
    });
  }

  return plan;
}

/** Sequential, human-readable certificate reference. Test rows are marked. */
export function certificateNumber(sequence: number, year: number, isTest: boolean): string {
  const ref = `UD-ALL-${year}-${String(sequence).padStart(4, "0")}`;
  return isTest ? `TEST-${ref}` : ref;
}

/** What a newly published course version does to certificates already issued. */
export function newVersionEffect(settings: RenewalSettings): {
  action: RenewalSettings["new_version_action"];
  description: string;
} {
  const map: Record<RenewalSettings["new_version_action"], string> = {
    manager_decides:
      "Existing certificates are listed for a manager to decide, one by one. Nothing changes on its own.",
    stay_valid: "Existing certificates stay valid until their own expiry date.",
    supersede: "Existing certificates are marked superseded and the learner is listed for retraining.",
    require_retraining:
      "Existing certificates are marked superseded and a fresh assignment is required before service.",
  };
  return { action: settings.new_version_action, description: map[settings.new_version_action] };
}
