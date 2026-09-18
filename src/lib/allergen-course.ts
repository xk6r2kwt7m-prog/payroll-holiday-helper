/**
 * Ugly Dumpling Allergen Safety — learner course logic (Phase 1).
 *
 * Pure, deterministic functions only. Nothing here writes to the database,
 * publishes a course version, assigns training or contacts anybody.
 *
 * Rules implemented, exactly as approved by management:
 *  • Pass mark 80% AND every critical-safety question answered correctly.
 *  • Two independent attempts, then "Manager coaching required"; a manager must
 *    record coaching before a third attempt unlocks.
 *  • Passing produces "Assessment passed — awaiting practical sign-off" only.
 *    No course completion and no certificate are produced in Phase 1.
 *  • A scored flavour question may only be used when the flavour is confirmed
 *    against the approved matrix, is live on that branch's current customer
 *    menu, carries no unresolved conflict, and is not on the excluded list.
 */

/* ───────────────────────── Lesson content ───────────────────────── */

export type AllergenSourceRef =
  | "matrix-jul-2026"
  | "ud-allergy-procedure"
  | "ud-menu-jul-2026"
  | "fsa-allergen-guidance"
  | "eu-reg-1169"
  | "ppds-natashas-law"
  | "nhs-anaphylaxis"
  | "ud-course-v1";

export interface AllergenLessonSection {
  ref: string;
  heading: string;
  /** Short paragraphs written for reading on a phone. */
  paragraphs: string[];
  /** Practical restaurant example shown in its own panel. */
  example?: string;
  /** Mandatory sections must be completed before the assessment opens. */
  mandatory: boolean;
  sources: AllergenSourceRef[];
}

export interface AllergenLesson {
  ref: string;
  order: number;
  title: string;
  summary: string;
  estimated_minutes: number;
  /** A lesson is mandatory when any of its sections are mandatory. */
  mandatory: boolean;
  sections: AllergenLessonSection[];
}

/* ───────────────────────── Assessment ───────────────────────── */

export type AllergenQuestionType = "single" | "multi" | "scenario";

export interface AllergenQuestionOption {
  id: string;
  text: string;
}

export interface AllergenQuestion {
  id: string;
  type: AllergenQuestionType;
  prompt: string;
  options: AllergenQuestionOption[];
  /** Option ids that must be selected — all of them, and nothing else. */
  correct: string[];
  explanation: string;
  sources: AllergenSourceRef[];
  /** Critical-safety questions must all be answered correctly to pass. */
  critical: boolean;
  lesson_ref: string;
  /** Set when the question asks about a specific flavour. */
  flavour?: string;
  /** Scored only where the flavour is live on the learner's current menu. */
  requires_current_menu: boolean;
  active: boolean;
}

/** Flavours management has excluded from scored flavour-declaration questions. */
export const EXCLUDED_FROM_SCORING: { flavour: string; reason: string }[] = [
  {
    flavour: "Tempura Aubergine",
    reason:
      "Needs further evidence — batter recipe, supplier specification and fryer cross-contact not yet approved. May be taught in the peanut-garnish lesson but never scored.",
  },
  {
    flavour: "Corn Fritters",
    reason: "Needs further evidence — batter recipe, packaging, supplier specification and fryer procedure outstanding.",
  },
  {
    flavour: "Laksa Soup",
    reason: "Candlenut evidence outstanding and not shown on the July 2026 customer menus.",
  },
  { flavour: "Sichuan Vegan Pork Dumplings", reason: "Historical record kept for reference only — not current." },
  { flavour: "GF Cucumber Salad", reason: "Historical record kept for reference only — not current." },
  { flavour: "House Chilli Oil", reason: "Historical record kept for reference only — not current." },
  {
    flavour: "Homemade Chilli Sauce",
    reason:
      "Confirmed as a component, but not a standalone item on the July 2026 customer menus. Its ingredients still count whenever it forms part of another confirmed dish.",
  },
];

export const EXCLUDED_FLAVOUR_NAMES = EXCLUDED_FROM_SCORING.map((e) => e.flavour);

/** Minimal shape of a flavour record needed to judge scoring eligibility. */
export interface DishEligibilityInput {
  dish_name: string;
  is_confirmed: boolean;
  management_decision: string | null;
  active_branch_ids: string[] | null;
}

export interface ConflictEligibilityInput {
  subject: string;
  status: string;
}

export interface ScoringEligibility {
  eligible: boolean;
  reason: string;
}

/**
 * Decides whether one flavour may be used for a scored question at a branch.
 * Everything must line up — no assumptions and no silent fallbacks.
 */
export function flavourScoringEligibility(
  flavour: string,
  opts: {
    dishes: DishEligibilityInput[];
    conflicts: ConflictEligibilityInput[];
    branchId?: string | null;
  },
): ScoringEligibility {
  const excluded = EXCLUDED_FROM_SCORING.find((e) => e.flavour === flavour);
  if (excluded) return { eligible: false, reason: excluded.reason };

  const dish = opts.dishes.find((d) => d.dish_name === flavour);
  if (!dish) return { eligible: false, reason: "No flavour record found for this dish." };
  if (!dish.is_confirmed || dish.management_decision === "reference_only") {
    return { eligible: false, reason: "Management has not confirmed this flavour against the approved matrix." };
  }

  const openConflict = opts.conflicts.some(
    (c) => c.status === "open" && c.subject.toLowerCase().includes(flavour.toLowerCase()),
  );
  if (openConflict) {
    return { eligible: false, reason: "An unresolved source disagreement is recorded for this flavour." };
  }

  const active = dish.active_branch_ids ?? [];
  if (!active.length) {
    return { eligible: false, reason: "Not shown on a current customer menu." };
  }
  if (opts.branchId && !active.includes(opts.branchId)) {
    return { eligible: false, reason: "Not on the current customer menu at this site." };
  }
  return { eligible: true, reason: "Confirmed against the approved matrix and live on the current menu." };
}

export interface BankSelection {
  questions: AllergenQuestion[];
  /** Option order per question id, so a resumed attempt looks identical. */
  optionOrder: Record<string, string[]>;
  excluded: { id: string; flavour?: string; reason: string }[];
}

/** Deterministic shuffle so a resumed attempt shows the same answer order. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds the controlled question bank for one learner at one branch.
 * Every critical-safety question is always included. Flavour questions appear
 * only when that flavour passes the eligibility test for the learner's branch.
 */
export function selectQuestionBank(opts: {
  bank: AllergenQuestion[];
  dishes: DishEligibilityInput[];
  conflicts: ConflictEligibilityInput[];
  branchId?: string | null;
  seed: string;
  randomiseOptions?: boolean;
}): BankSelection {
  const excluded: BankSelection["excluded"] = [];
  const questions: AllergenQuestion[] = [];

  for (const q of opts.bank) {
    if (!q.active) {
      excluded.push({ id: q.id, flavour: q.flavour, reason: "Question is switched off." });
      continue;
    }
    if (q.flavour) {
      const verdict = flavourScoringEligibility(q.flavour, {
        dishes: opts.dishes,
        conflicts: opts.conflicts,
        branchId: q.requires_current_menu ? opts.branchId : null,
      });
      if (!verdict.eligible) {
        excluded.push({ id: q.id, flavour: q.flavour, reason: verdict.reason });
        continue;
      }
    }
    questions.push(q);
  }

  const optionOrder: Record<string, string[]> = {};
  for (const q of questions) {
    const ids = q.options.map((o) => o.id);
    optionOrder[q.id] =
      opts.randomiseOptions === false ? ids : seededShuffle(ids, `${opts.seed}:${q.id}`);
  }
  return { questions, optionOrder, excluded };
}

/** True when a question may be published as scored at all. */
export function canPublishScoredQuestion(
  q: AllergenQuestion,
  opts: { dishes: DishEligibilityInput[]; conflicts: ConflictEligibilityInput[] },
): ScoringEligibility {
  if (!q.sources.length) {
    return { eligible: false, reason: "No approved source is attached to this question." };
  }
  if (!q.flavour) return { eligible: true, reason: "General question backed by an approved source." };
  return flavourScoringEligibility(q.flavour, { dishes: opts.dishes, conflicts: opts.conflicts });
}

/* ───────────────────────── Marking ───────────────────────── */

export interface MarkedAnswer {
  question_id: string;
  correct: boolean;
  critical: boolean;
  selected: string[];
  expected: string[];
  explanation: string;
}

export interface AttemptResult {
  answered: number;
  total: number;
  correctCount: number;
  scorePercent: number;
  criticalMissed: string[];
  passed: boolean;
  marked: MarkedAnswer[];
}

const PASS_MARK = 80;
export const ALLERGEN_PASS_MARK = PASS_MARK;
export const ALLERGEN_INDEPENDENT_ATTEMPTS = 2;

/** Marks one submitted attempt. 80% and every critical question correct. */
export function markAttempt(
  questions: AllergenQuestion[],
  answers: Record<string, string[]>,
): AttemptResult {
  const marked: MarkedAnswer[] = questions.map((q) => {
    const selected = [...(answers[q.id] ?? [])].sort();
    const expected = [...q.correct].sort();
    const correct =
      selected.length === expected.length && selected.every((s, i) => s === expected[i]);
    return {
      question_id: q.id,
      correct,
      critical: q.critical,
      selected,
      expected,
      explanation: q.explanation,
    };
  });

  const correctCount = marked.filter((m) => m.correct).length;
  const scorePercent = questions.length ? Math.round((correctCount / questions.length) * 1000) / 10 : 0;
  const criticalMissed = marked.filter((m) => m.critical && !m.correct).map((m) => m.question_id);
  return {
    answered: Object.keys(answers).filter((k) => (answers[k] ?? []).length > 0).length,
    total: questions.length,
    correctCount,
    scorePercent,
    criticalMissed,
    passed: scorePercent >= PASS_MARK && criticalMissed.length === 0,
    marked,
  };
}

export type LearnerAssessmentStatus =
  | "not_started"
  | "in_progress"
  | "passed_awaiting_practical"
  | "failed_retry_available"
  | "manager_coaching_required"
  | "third_attempt_unlocked";

export interface AttemptSummary {
  attempt_number: number;
  status: string;
  passed: boolean | null;
}

export interface AttemptGate {
  status: LearnerAssessmentStatus;
  canStartAttempt: boolean;
  nextAttemptNumber: number;
  message: string;
}

/**
 * Attempt rules. Two independent attempts; a third only after a manager has
 * recorded coaching. Passing never marks the course complete in Phase 1.
 */
export function assessmentGate(opts: {
  attempts: AttemptSummary[];
  coachingRecorded: boolean;
  mandatoryLessonsComplete: boolean;
}): AttemptGate {
  const open = opts.attempts.find((a) => a.status === "in_progress");
  const submitted = opts.attempts.filter((a) => a.status === "submitted");
  const passedAttempt = submitted.find((a) => a.passed === true);
  const used = submitted.length;
  const next = used + 1;

  if (passedAttempt) {
    return {
      status: "passed_awaiting_practical",
      canStartAttempt: false,
      nextAttemptNumber: next,
      message: "Assessment passed — awaiting practical sign-off.",
    };
  }
  if (open) {
    return {
      status: "in_progress",
      canStartAttempt: true,
      nextAttemptNumber: open.attempt_number,
      message: "Attempt in progress — your answers are saved as you go.",
    };
  }
  if (!opts.mandatoryLessonsComplete) {
    return {
      status: used ? "failed_retry_available" : "not_started",
      canStartAttempt: false,
      nextAttemptNumber: next,
      message: "Finish every required lesson before the assessment opens.",
    };
  }
  if (used >= ALLERGEN_INDEPENDENT_ATTEMPTS && !opts.coachingRecorded) {
    return {
      status: "manager_coaching_required",
      canStartAttempt: false,
      nextAttemptNumber: next,
      message: "Manager coaching required. A manager must record coaching before a third attempt opens.",
    };
  }
  if (used >= ALLERGEN_INDEPENDENT_ATTEMPTS && opts.coachingRecorded) {
    return {
      status: "third_attempt_unlocked",
      canStartAttempt: true,
      nextAttemptNumber: next,
      message: "Coaching recorded — a further attempt is open.",
    };
  }
  return {
    status: used ? "failed_retry_available" : "not_started",
    canStartAttempt: true,
    nextAttemptNumber: next,
    message: used
      ? `Attempt ${used} did not pass. ${ALLERGEN_INDEPENDENT_ATTEMPTS - used} independent attempt(s) remaining.`
      : "Ready to start the assessment.",
  };
}

/* ───────────────────────── Progress and gating ───────────────────────── */

export interface LessonProgressInput {
  lesson_ref: string;
  completed_sections: string[];
  is_complete: boolean;
}

export interface CourseProgress {
  lessonsComplete: number;
  lessonsTotal: number;
  sectionsComplete: number;
  sectionsTotal: number;
  percent: number;
  mandatoryOutstanding: string[];
  assessmentOpen: boolean;
  estimatedMinutesRemaining: number;
}

export function courseProgress(
  lessons: AllergenLesson[],
  progress: LessonProgressInput[],
): CourseProgress {
  const byRef = new Map(progress.map((p) => [p.lesson_ref, p]));
  let sectionsComplete = 0;
  let sectionsTotal = 0;
  let lessonsComplete = 0;
  let minutesRemaining = 0;
  const mandatoryOutstanding: string[] = [];

  for (const lesson of lessons) {
    const p = byRef.get(lesson.ref);
    const done = lesson.sections.filter((s) => p?.completed_sections.includes(s.ref)).length;
    sectionsComplete += done;
    sectionsTotal += lesson.sections.length;
    const complete = done === lesson.sections.length && lesson.sections.length > 0;
    if (complete) lessonsComplete += 1;
    else minutesRemaining += lesson.estimated_minutes;
    if (lesson.mandatory && !complete) mandatoryOutstanding.push(lesson.title);
  }

  return {
    lessonsComplete,
    lessonsTotal: lessons.length,
    sectionsComplete,
    sectionsTotal,
    percent: sectionsTotal ? Math.round((sectionsComplete / sectionsTotal) * 100) : 0,
    mandatoryOutstanding,
    assessmentOpen: mandatoryOutstanding.length === 0,
    estimatedMinutesRemaining: minutesRemaining,
  };
}

/** A lesson only counts once every section has been actively marked complete. */
export function lessonIsComplete(lesson: AllergenLesson, completedSections: string[]): boolean {
  return lesson.sections.length > 0 && lesson.sections.every((s) => completedSections.includes(s.ref));
}

/* ───────────────────────── Version comparison ───────────────────────── */

export interface VersionChange {
  kind: "added" | "corrected" | "superseded" | "unchanged";
  area: string;
  label: string;
  before?: string;
  after?: string;
  sources: string[];
}

export interface VersionComparison {
  fromVersion: number | null;
  toVersion: number;
  added: VersionChange[];
  corrected: VersionChange[];
  superseded: VersionChange[];
  counts: { added: number; corrected: number; superseded: number; unchanged: number };
}

interface ComparableItem {
  ref: string;
  label: string;
  text: string;
  sources?: string[];
}

/** Compares published content with the proposed draft, area by area. */
export function compareCourseContent(
  published: Record<string, ComparableItem[]>,
  proposed: Record<string, ComparableItem[]>,
  fromVersion: number | null,
  toVersion: number,
): VersionComparison {
  const added: VersionChange[] = [];
  const corrected: VersionChange[] = [];
  const superseded: VersionChange[] = [];
  let unchanged = 0;

  const areas = Array.from(new Set([...Object.keys(published), ...Object.keys(proposed)]));
  for (const area of areas) {
    const before = published[area] ?? [];
    const after = proposed[area] ?? [];
    const beforeByRef = new Map(before.map((i) => [i.ref, i]));
    const afterByRef = new Map(after.map((i) => [i.ref, i]));

    for (const item of after) {
      const prior = beforeByRef.get(item.ref);
      if (!prior) {
        added.push({ kind: "added", area, label: item.label, after: item.text, sources: item.sources ?? [] });
      } else if (prior.text.trim() !== item.text.trim()) {
        corrected.push({
          kind: "corrected", area, label: item.label,
          before: prior.text, after: item.text, sources: item.sources ?? [],
        });
      } else {
        unchanged += 1;
      }
    }
    for (const item of before) {
      if (!afterByRef.has(item.ref)) {
        superseded.push({
          kind: "superseded", area, label: item.label, before: item.text, sources: item.sources ?? [],
        });
      }
    }
  }

  return {
    fromVersion,
    toVersion,
    added,
    corrected,
    superseded,
    counts: { added: added.length, corrected: corrected.length, superseded: superseded.length, unchanged },
  };
}
