/**
 * Management-only learner preview for the draft Ugly Dumpling Allergen Safety
 * course.
 *
 * A preview session is isolated by a preview_key. Every row written from a
 * preview carries is_test = true AND that preview_key, so preview activity can
 * never be mistaken for, or mixed with, a genuine staff record — and the reset
 * control can only ever remove rows that carry both marks.
 */

import type { ObservationAudience } from "@/data/allergen/allergen-practical-signoff";
import type {
  AcceptanceEnvironment,
  AcceptanceResult,
} from "@/data/allergen/allergen-acceptance-checklist";
import {
  ACCEPTANCE_ENVIRONMENTS,
  checksForEnvironment,
  acceptanceCommentRequired,
} from "@/data/allergen/allergen-acceptance-checklist";
import { UD_SITES, type UdSite } from "@/data/allergen/ud-july-2026-menus";

/* ───────────────────────── Preview personas ───────────────────────── */

export interface PreviewPersona {
  key: string;
  site: UdSite;
  audience: Exclude<ObservationAudience, "both">;
  label: string;
  description: string;
}

/** The six management preview options: each site as front of house and as kitchen. */
export const PREVIEW_PERSONAS: PreviewPersona[] = UD_SITES.flatMap((site) => [
  {
    key: `${site.toLowerCase()}-foh`,
    site,
    audience: "foh" as const,
    label: `${site} front of house`,
    description: `Reads the course as a front-of-house team member at ${site}, with ${site}'s current menu questions and the front-of-house observation lines.`,
  },
  {
    key: `${site.toLowerCase()}-kitchen`,
    site,
    audience: "kitchen" as const,
    label: `${site} kitchen`,
    description: `Reads the course as a kitchen team member at ${site}, with ${site}'s current menu questions and the kitchen observation lines.`,
  },
]);

export function previewPersona(key: string): PreviewPersona | null {
  return PREVIEW_PERSONAS.find((p) => p.key === key) ?? null;
}

/** The stored marker for one preview session. Always prefixed so it is obvious. */
export function previewKeyFor(personaKey: string): string {
  return `mgmt-preview:${personaKey}`;
}

export function isPreviewKey(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("mgmt-preview:");
}

/**
 * Guard used before any preview row is removed. A row may only be cleared when
 * it is test activity belonging to a named preview session.
 */
export function canClearPreviewRow(row: { is_test: boolean; preview_key: string | null }): boolean {
  return row.is_test === true && isPreviewKey(row.preview_key);
}

/* ─────────────────── Branch flavour-question validation ─────────────────── */

export interface BranchFlavourExpectation {
  site: UdSite;
  mayInclude: string[];
  mustNotInclude: string[];
}

/**
 * The approved July 2026 menu position, stated as an expectation so the preview
 * can be checked rather than trusted.
 */
export const BRANCH_FLAVOUR_EXPECTATIONS: BranchFlavourExpectation[] = [
  {
    site: "Brixton",
    mayInclude: ["Curry Goat", "Biscoff Banana"],
    mustNotInclude: ["Lamb & Harissa"],
  },
  {
    site: "Carnaby",
    mayInclude: ["Lamb & Harissa"],
    mustNotInclude: ["Curry Goat", "Biscoff Banana"],
  },
  {
    site: "Fitzrovia",
    mayInclude: ["Lamb & Harissa"],
    mustNotInclude: ["Curry Goat", "Biscoff Banana"],
  },
];

export interface BranchValidationFinding {
  site: UdSite;
  flavour: string;
  expectation: "may_include" | "must_not_include";
  present: boolean;
  ok: boolean;
}

export interface BranchValidation {
  site: UdSite;
  scoredFlavours: string[];
  findings: BranchValidationFinding[];
  ok: boolean;
}

/**
 * Compares the flavours actually scored for a site with the approved position.
 * A "may include" flavour that is absent is reported but is not a failure: the
 * flavour record itself may legitimately be unconfirmed or held.
 */
export function validateBranchFlavourQuestions(
  site: UdSite,
  scoredFlavours: string[],
): BranchValidation {
  const expectation = BRANCH_FLAVOUR_EXPECTATIONS.find((e) => e.site === site);
  const present = (f: string) => scoredFlavours.includes(f);
  const findings: BranchValidationFinding[] = [];

  for (const flavour of expectation?.mayInclude ?? []) {
    findings.push({ site, flavour, expectation: "may_include", present: present(flavour), ok: true });
  }
  for (const flavour of expectation?.mustNotInclude ?? []) {
    const isPresent = present(flavour);
    findings.push({ site, flavour, expectation: "must_not_include", present: isPresent, ok: !isPresent });
  }

  return {
    site,
    scoredFlavours: Array.from(new Set(scoredFlavours)).sort(),
    findings,
    ok: findings.every((f) => f.ok),
  };
}

/* ─────────────────── Acceptance checklist progress ─────────────────── */

export interface RecordedCheck {
  environment: AcceptanceEnvironment;
  check_ref: string;
  result: AcceptanceResult;
  comment: string | null;
}

export interface EnvironmentChecklistState {
  environment: AcceptanceEnvironment;
  total: number;
  recorded: number;
  pass: number;
  passWithObservation: number;
  fail: number;
  notTested: number;
  missingComments: string[];
  /** Every check recorded, and every failure or untested result explained. */
  readyToSign: boolean;
  outcome: "accepted" | "accepted_with_observations" | "not_accepted" | "incomplete";
}

export function environmentChecklistState(
  environment: AcceptanceEnvironment,
  recorded: RecordedCheck[],
): EnvironmentChecklistState {
  const checks = checksForEnvironment(environment);
  const mine = recorded.filter((r) => r.environment === environment);
  const byRef = new Map(mine.map((r) => [r.check_ref, r]));

  let pass = 0, passWithObservation = 0, fail = 0, notTested = 0;
  const missingComments: string[] = [];

  for (const check of checks) {
    const row = byRef.get(check.ref);
    if (!row) continue;
    if (row.result === "pass") pass += 1;
    if (row.result === "pass_with_observation") passWithObservation += 1;
    if (row.result === "fail") fail += 1;
    if (row.result === "not_tested") notTested += 1;
    if (acceptanceCommentRequired(row.result) && !(row.comment ?? "").trim()) {
      missingComments.push(check.ref);
    }
  }

  const recordedCount = checks.filter((c) => byRef.has(c.ref)).length;
  const complete = recordedCount === checks.length && checks.length > 0;
  const readyToSign = complete && missingComments.length === 0;

  const outcome: EnvironmentChecklistState["outcome"] = !complete
    ? "incomplete"
    : fail > 0
      ? "not_accepted"
      : passWithObservation > 0 || notTested > 0
        ? "accepted_with_observations"
        : "accepted";

  return {
    environment,
    total: checks.length,
    recorded: recordedCount,
    pass,
    passWithObservation,
    fail,
    notTested,
    missingComments,
    readyToSign,
    outcome,
  };
}

export interface AcceptanceOverview {
  environments: EnvironmentChecklistState[];
  totalChecks: number;
  totalRecorded: number;
  failures: number;
  notTested: number;
  /** True only when a person has recorded and explained every check. */
  handsOnComplete: boolean;
}

export function acceptanceOverview(recorded: RecordedCheck[]): AcceptanceOverview {
  const environments = ACCEPTANCE_ENVIRONMENTS.map((e) =>
    environmentChecklistState(e.key, recorded),
  );
  return {
    environments,
    totalChecks: environments.reduce((s, e) => s + e.total, 0),
    totalRecorded: environments.reduce((s, e) => s + e.recorded, 0),
    failures: environments.reduce((s, e) => s + e.fail, 0),
    notTested: environments.reduce((s, e) => s + e.notTested, 0),
    handsOnComplete: environments.every((e) => e.readyToSign),
  };
}

/* ─────────────────── Pilot readiness ─────────────────── */

export interface PilotReadinessInput {
  handsOnComplete: boolean;
  outstandingEvidenceCount: number;
  branchValidationsOk: boolean;
  certificateGatesProven: boolean;
}

export interface PilotReadiness {
  readyForPublication: boolean;
  readyForControlledPilot: boolean;
  blockers: string[];
}

/**
 * Readiness is stated, never assumed. Publication and a six-person pilot both
 * need a person to have completed the hands-on checklist first.
 */
export function pilotReadiness(input: PilotReadinessInput): PilotReadiness {
  const blockers: string[] = [];
  if (!input.handsOnComplete) {
    blockers.push("The hands-on acceptance checklist has not been completed and signed by a person.");
  }
  if (!input.branchValidationsOk) {
    blockers.push("A site's scored flavour questions do not match the approved menu records.");
  }
  if (!input.certificateGatesProven) {
    blockers.push("The three certificate gates have not been demonstrated in the preview.");
  }
  const readyForControlledPilot = blockers.length === 0;
  const readyForPublication = readyForControlledPilot && input.outstandingEvidenceCount === 0;
  if (input.outstandingEvidenceCount > 0) {
    blockers.push(
      `${input.outstandingEvidenceCount} active menu product(s) still have outstanding allergen evidence — a controlled pilot may run with them unscored, full rollout may not.`,
    );
  }
  return { readyForPublication, readyForControlledPilot, blockers };
}

/* ─────────────────── Controlled pilot gate (simplified) ─────────────────── */

/**
 * Management has simplified what a controlled pilot requires. Keyboard,
 * screen-reader and interrupted-connection testing stay open actions before full
 * rollout, and only block the pilot when a serious problem is already recorded.
 * Outstanding dish evidence does not block the pilot, because those dishes are
 * excluded from every scored question — it still blocks their confirmation.
 */
export interface ControlledPilotInput {
  automatedChecksPassing: boolean;
  phoneWalkthroughSigned: boolean;
  computerWalkthroughSigned: boolean;
  progressSavingConfirmed: boolean;
  branchQuestionsConfirmed: boolean;
  certificateControlsConfirmed: boolean;
  /** Recorded failures in any environment, including the deferred ones. */
  knownSeriousProblems: string[];
}

export interface ControlledPilotGate {
  ready: boolean;
  blockers: string[];
  openActionsBeforeFullRollout: string[];
}

export const PILOT_DEFERRED_ACTIONS = [
  "Keyboard-only walkthrough, recorded and signed.",
  "Screen-reader walkthrough, recorded and signed.",
  "Interrupted-connection walkthrough, recorded and signed.",
  "Tempura Aubergine and Corn Fritters evidence approved before either dish is confirmed or scored.",
];

export function controlledPilotGate(input: ControlledPilotInput): ControlledPilotGate {
  const blockers: string[] = [];
  if (!input.automatedChecksPassing) blockers.push("The automated checks are not passing.");
  if (!input.phoneWalkthroughSigned) blockers.push("The management phone walkthrough has not been signed.");
  if (!input.computerWalkthroughSigned) blockers.push("The management computer walkthrough has not been signed.");
  if (!input.progressSavingConfirmed) blockers.push("Progress saving has not been confirmed.");
  if (!input.branchQuestionsConfirmed) blockers.push("The site questions have not been confirmed as correct.");
  if (!input.certificateControlsConfirmed) blockers.push("The certificate controls have not been confirmed.");
  for (const problem of input.knownSeriousProblems) {
    blockers.push(`A serious problem is already recorded: ${problem}`);
  }
  return { ready: blockers.length === 0, blockers, openActionsBeforeFullRollout: PILOT_DEFERRED_ACTIONS };
}

/* ─────────────────── Three-person pilot group ─────────────────── */

export interface PilotCandidate {
  employee_id: string;
  name: string;
  site: string;
  audience: "foh" | "kitchen";
}

export interface PilotSelectionState {
  chosen: PilotCandidate[];
  sitesCovered: string[];
  ok: boolean;
  problems: string[];
}

export const PILOT_GROUP_SIZE = 3;

/**
 * Three people: one from each site, with at least one front-of-house and at
 * least one kitchen member of staff. Nothing is sent by selecting anybody.
 */
export function validatePilotSelection(chosen: PilotCandidate[]): PilotSelectionState {
  const problems: string[] = [];
  const sites = Array.from(new Set(chosen.map((c) => c.site)));

  if (chosen.length !== PILOT_GROUP_SIZE) {
    problems.push(`Choose exactly ${PILOT_GROUP_SIZE} people — ${chosen.length} chosen so far.`);
  }
  for (const site of UD_SITES) {
    if (!sites.includes(site)) problems.push(`No one chosen from ${site}.`);
  }
  if (!chosen.some((c) => c.audience === "foh")) problems.push("At least one front-of-house member of staff is required.");
  if (!chosen.some((c) => c.audience === "kitchen")) problems.push("At least one kitchen member of staff is required.");

  return { chosen, sitesCovered: sites, ok: problems.length === 0, problems };
}
