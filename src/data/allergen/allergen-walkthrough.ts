/**
 * The ten-minute management acceptance walkthrough.
 *
 * Thirteen short stops that show the learner interface once, on a phone and on a
 * computer, without reading the whole course twice. Everything shown is a
 * demonstration built from the approved course records: nothing here changes the
 * genuine course, a genuine assessment, a staff record, an assignment or a
 * certificate, and nothing is sent.
 */

export type WalkthroughStepRef =
  | "opening"
  | "module"
  | "resume"
  | "locked"
  | "question-types"
  | "branch-question"
  | "critical-failure"
  | "coaching-lock"
  | "passed"
  | "practical"
  | "gates"
  | "certificate"
  | "publish";

export interface WalkthroughStep {
  ref: WalkthroughStepRef;
  order: number;
  title: string;
  /** What management is being asked to look at on this stop. */
  look_for: string;
  minutes: number;
}

export const ALLERGEN_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    ref: "opening",
    order: 1,
    title: "Course opening screen",
    look_for:
      "The first thing a member of staff sees: what the course is for, how long it takes, the eight modules and a progress bar starting at nothing.",
    minutes: 1,
  },
  {
    ref: "module",
    order: 2,
    title: "One complete learner module",
    look_for:
      "Read one module end to end. One idea per screen, a service example, the sources named, and a button to mark each section completed.",
    minutes: 2,
  },
  {
    ref: "resume",
    order: 3,
    title: "Progress saving and resuming",
    look_for:
      "Leave the screen part-way through and come back. The sections already marked stay marked and the module does not reset.",
    minutes: 1,
  },
  {
    ref: "locked",
    order: 4,
    title: "Assessment locked before learning is complete",
    look_for:
      "With learning unfinished, the assessment will not open and the screen names exactly what is still to be read.",
    minutes: 1,
  },
  {
    ref: "question-types",
    order: 5,
    title: "Assessment questions",
    look_for:
      "A one-answer question and a \u201cSelect all that apply\u201d question, each with its answer order shuffled and its source shown.",
    minutes: 1,
  },
  {
    ref: "branch-question",
    order: 6,
    title: "A correct site question",
    look_for:
      "A current-menu question for the chosen site, checked against the approved July 2026 menu records before it is scored.",
    minutes: 1,
  },
  {
    ref: "critical-failure",
    order: 7,
    title: "One wrong critical answer fails the attempt",
    look_for:
      "A high score is not enough. One critical-safety question answered wrongly fails the whole attempt.",
    minutes: 1,
  },
  {
    ref: "coaching-lock",
    order: 8,
    title: "Coaching lock after two failed attempts",
    look_for:
      "After two attempts the assessment closes until a manager records coaching. The learner cannot unlock it themselves.",
    minutes: 1,
  },
  {
    ref: "passed",
    order: 9,
    title: "A successful result",
    look_for:
      "A pass reads \u201cAssessment passed \u2014 awaiting practical sign-off\u201d. Passing alone is not a completed course.",
    minutes: 1,
  },
  {
    ref: "practical",
    order: 10,
    title: "Front-of-house and kitchen practical sign-off",
    look_for:
      "The two role-specific observation lists a manager signs, and what happens when a critical line is not seen.",
    minutes: 1,
  },
  {
    ref: "gates",
    order: 11,
    title: "The three certificate gates",
    look_for:
      "Learning finished, assessment passed under the approved rules, and a signed practical pass. All three, or no certificate.",
    minutes: 1,
  },
  {
    ref: "certificate",
    order: 12,
    title: "Certificate preview",
    look_for:
      "Reference, course version, score, assessor and dates, clearly marked as a preview and issued to nobody.",
    minutes: 1,
  },
  {
    ref: "publish",
    order: 13,
    title: "Publish and Send controls",
    look_for:
      "Two separate decisions, both yours. Publishing contacts nobody, and sending the pilot stays switched off.",
    minutes: 1,
  },
];

export const WALKTHROUGH_TOTAL_MINUTES = ALLERGEN_WALKTHROUGH_STEPS.reduce(
  (n, s) => n + s.minutes,
  0,
);

export type WalkthroughOutcome = "pass" | "pass_with_comments" | "fail";

export const WALKTHROUGH_OUTCOME_LABELS: Record<WalkthroughOutcome, string> = {
  pass: "Pass",
  pass_with_comments: "Pass with comments",
  fail: "Fail",
};

/** A comment is required for anything other than a plain pass. */
export function walkthroughCommentRequired(outcome: WalkthroughOutcome): boolean {
  return outcome !== "pass";
}

/** How a walkthrough outcome is stored on the existing acceptance record. */
export function walkthroughSignoffOutcome(
  outcome: WalkthroughOutcome,
): "accepted" | "accepted_with_observations" | "not_accepted" {
  if (outcome === "pass") return "accepted";
  if (outcome === "pass_with_comments") return "accepted_with_observations";
  return "not_accepted";
}

/** Version 2 is only marked ready once both devices have been walked and passed. */
export interface WalkthroughReadiness {
  phonePassed: boolean;
  computerPassed: boolean;
  readyToPublish: boolean;
  outstanding: string[];
}

export function walkthroughReadiness(input: {
  phone: WalkthroughOutcome | null;
  computer: WalkthroughOutcome | null;
}): WalkthroughReadiness {
  const passed = (o: WalkthroughOutcome | null) => o === "pass" || o === "pass_with_comments";
  const outstanding: string[] = [];
  if (!passed(input.phone)) {
    outstanding.push(
      input.phone === "fail"
        ? "The phone walkthrough was recorded as a fail — the problem must be resolved and the walkthrough repeated."
        : "The phone walkthrough has not been completed.",
    );
  }
  if (!passed(input.computer)) {
    outstanding.push(
      input.computer === "fail"
        ? "The computer walkthrough was recorded as a fail — the problem must be resolved and the walkthrough repeated."
        : "The computer walkthrough has not been completed.",
    );
  }
  return {
    phonePassed: passed(input.phone),
    computerPassed: passed(input.computer),
    readyToPublish: outstanding.length === 0,
    outstanding,
  };
}

export const WALKTHROUGH_SCOPE_NOTE =
  "Interface acceptance only. Nothing on this walkthrough changes the genuine course, assessment, staff record, assignment or certificate, and nothing is sent. Marking both walkthroughs as passed marks version 2 ready to publish for the controlled pilot — it does not publish it.";
