/**
 * Phase 1 tests for the Ugly Dumpling Allergen Safety learner system.
 * Pure logic and content checks — nothing here touches the database,
 * assigns training, records a completion or sends anything.
 */

import { describe, it, expect } from "vitest";
import {
  ALLERGEN_PASS_MARK, ALLERGEN_INDEPENDENT_ATTEMPTS, EXCLUDED_FLAVOUR_NAMES,
  assessmentGate, canPublishScoredQuestion, compareCourseContent, courseProgress,
  flavourScoringEligibility, lessonIsComplete, markAttempt, selectQuestionBank,
  type AllergenQuestion,
} from "@/lib/allergen-course";
import { ALLERGEN_SAFETY_LESSONS } from "@/data/allergen/allergen-safety-lessons";
import { ALLERGEN_QUESTION_BANK, CRITICAL_QUESTION_COUNT } from "@/data/allergen/allergen-safety-questions";
import { PRACTICAL_SIGNOFF_TEMPLATE } from "@/data/allergen/allergen-practical-signoff";
import { APPROVED_WORDING } from "@/data/allergen/allergen-course-sources";

const CARNABY = "3e80394f-cdc4-4f42-8889-9cb9c2f1e8b5";
const BRIXTON = "0488cea1-8961-4ea2-83da-882eaf84e13c";

const dishes = [
  { dish_name: "Satay Chicken", is_confirmed: true, management_decision: "confirm", active_branch_ids: [CARNABY, BRIXTON] },
  { dish_name: "Curry Goat", is_confirmed: true, management_decision: "confirm", active_branch_ids: [BRIXTON] },
  { dish_name: "Lamb & Harissa", is_confirmed: true, management_decision: "confirm", active_branch_ids: [CARNABY] },
  { dish_name: "Nutella", is_confirmed: true, management_decision: "correct", active_branch_ids: [CARNABY, BRIXTON] },
  { dish_name: "Biscoff Banana", is_confirmed: true, management_decision: "correct", active_branch_ids: [BRIXTON] },
  { dish_name: "Prawn & Chive", is_confirmed: true, management_decision: "confirm", active_branch_ids: [CARNABY, BRIXTON] },
  { dish_name: "Tempura Aubergine", is_confirmed: false, management_decision: "needs_evidence", active_branch_ids: [CARNABY, BRIXTON] },
  { dish_name: "Corn Fritters", is_confirmed: false, management_decision: "needs_evidence", active_branch_ids: [BRIXTON] },
  { dish_name: "Laksa Soup", is_confirmed: false, management_decision: "needs_evidence", active_branch_ids: [] },
  { dish_name: "House Chilli Oil", is_confirmed: false, management_decision: "reference_only", active_branch_ids: [] },
];
const conflicts = [
  { subject: "Tempura Aubergine batter — gluten declaration", status: "open" },
  { subject: "Corn Fritters batter — gluten declaration", status: "open" },
];

describe("course content", () => {
  it("has sixteen lessons in order, each with sections and sources", () => {
    expect(ALLERGEN_SAFETY_LESSONS).toHaveLength(16);
    ALLERGEN_SAFETY_LESSONS.forEach((lesson, i) => {
      expect(lesson.order).toBe(i + 1);
      expect(lesson.sections.length).toBeGreaterThan(0);
      expect(lesson.estimated_minutes).toBeGreaterThan(0);
      lesson.sections.forEach((s) => expect(s.sources.length).toBeGreaterThan(0));
    });
  });

  it("writes fifteen critical-safety questions, every one traced to a source", () => {
    const critical = ALLERGEN_QUESTION_BANK.filter((q) => q.critical);
    expect(critical).toHaveLength(CRITICAL_QUESTION_COUNT);
    expect(CRITICAL_QUESTION_COUNT).toBe(15);
    ALLERGEN_QUESTION_BANK.forEach((q) => {
      expect(q.sources.length).toBeGreaterThan(0);
      expect(q.correct.length).toBeGreaterThan(0);
      expect(q.correct.every((c) => q.options.some((o) => o.id === c))).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(ALLERGEN_SAFETY_LESSONS.some((l) => l.ref === q.lesson_ref)).toBe(true);
    });
  });

  it("holds the practical template with the Phase 1 status wording", () => {
    expect(PRACTICAL_SIGNOFF_TEMPLATE.items.length).toBeGreaterThanOrEqual(15);
    expect(PRACTICAL_SIGNOFF_TEMPLATE.status_on_assessment_pass)
      .toBe("Assessment passed — awaiting practical sign-off");
    const audiences = new Set(PRACTICAL_SIGNOFF_TEMPLATE.items.map((i) => i.audience));
    expect(audiences.has("foh")).toBe(true);
    expect(audiences.has("kitchen")).toBe(true);
  });

  it("keeps the approved shared-fryer wording word for word", () => {
    expect(APPROVED_WORDING.shared_dessert_fryer).toContain("All sweet dumplings share the same fryer");
    expect(APPROVED_WORDING.shared_dessert_fryer).toContain("separately validated preparation process");
  });
});

describe("flavour scoring eligibility", () => {
  it("scores a confirmed flavour live at the learner's branch", () => {
    expect(flavourScoringEligibility("Satay Chicken", { dishes, conflicts, branchId: CARNABY }).eligible).toBe(true);
  });

  it("respects branch-only availability", () => {
    expect(flavourScoringEligibility("Curry Goat", { dishes, conflicts, branchId: BRIXTON }).eligible).toBe(true);
    expect(flavourScoringEligibility("Curry Goat", { dishes, conflicts, branchId: CARNABY }).eligible).toBe(false);
    expect(flavourScoringEligibility("Lamb & Harissa", { dishes, conflicts, branchId: BRIXTON }).eligible).toBe(false);
  });

  it("never scores the excluded items", () => {
    for (const name of EXCLUDED_FLAVOUR_NAMES) {
      expect(flavourScoringEligibility(name, { dishes, conflicts, branchId: BRIXTON }).eligible).toBe(false);
    }
  });

  it("blocks publishing a scored question whose flavour is unconfirmed", () => {
    const held = ALLERGEN_QUESTION_BANK.find((q) => q.flavour === "Tempura Aubergine");
    expect(held).toBeTruthy();
    expect(canPublishScoredQuestion(held as AllergenQuestion, { dishes, conflicts }).eligible).toBe(false);
  });
});

describe("question bank selection", () => {
  it("keeps every critical question and filters dish questions by branch", () => {
    const brixton = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "s1" });
    const carnaby = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: CARNABY, seed: "s1" });
    expect(brixton.questions.filter((q) => q.critical)).toHaveLength(CRITICAL_QUESTION_COUNT);
    expect(brixton.questions.some((q) => q.flavour === "Curry Goat")).toBe(true);
    expect(carnaby.questions.some((q) => q.flavour === "Curry Goat")).toBe(false);
    expect(carnaby.questions.some((q) => q.flavour === "Lamb & Harissa")).toBe(true);
    for (const q of brixton.questions) expect(EXCLUDED_FLAVOUR_NAMES).not.toContain(q.flavour ?? "");
  });

  it("randomises answer order but repeats it for the same attempt", () => {
    const a = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "attempt-1" });
    const b = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "attempt-1" });
    const c = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "attempt-2" });
    const first = a.questions[0].id;
    expect(a.optionOrder[first]).toEqual(b.optionOrder[first]);
    const anyDifferent = a.questions.some((q) => a.optionOrder[q.id].join() !== c.optionOrder[q.id].join());
    expect(anyDifferent).toBe(true);
  });

  it("records why each excluded question is left out", () => {
    const sel = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "s" });
    expect(sel.excluded.length).toBeGreaterThan(0);
    sel.excluded.forEach((e) => expect(e.reason.length).toBeGreaterThan(5));
  });
});

describe("marking", () => {
  const bank = selectQuestionBank({ bank: ALLERGEN_QUESTION_BANK, dishes, conflicts, branchId: BRIXTON, seed: "mark" });
  const allCorrect = () =>
    Object.fromEntries(bank.questions.map((q) => [q.id, [...q.correct]])) as Record<string, string[]>;

  it("passes a perfect attempt", () => {
    const r = markAttempt(bank.questions, allCorrect());
    expect(r.scorePercent).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.criticalMissed).toHaveLength(0);
  });

  it("fails an attempt that misses one critical question however high the score", () => {
    const answers = allCorrect();
    const critical = bank.questions.find((q) => q.critical)!;
    const wrong = critical.options.find((o) => !critical.correct.includes(o.id))!;
    answers[critical.id] = [wrong.id];
    const r = markAttempt(bank.questions, answers);
    expect(r.scorePercent).toBeGreaterThanOrEqual(ALLERGEN_PASS_MARK);
    expect(r.criticalMissed).toContain(critical.id);
    expect(r.passed).toBe(false);
  });

  it("marks a multiple-answer question wrong when an answer is missing", () => {
    const multi = ALLERGEN_QUESTION_BANK.find((q) => q.type === "multi" && q.correct.length > 1)!;
    const r = markAttempt([multi], { [multi.id]: [multi.correct[0]] });
    expect(r.marked[0].correct).toBe(false);
  });

  it("fails below the pass mark", () => {
    const answers = allCorrect();
    bank.questions.slice(0, Math.ceil(bank.questions.length * 0.4)).forEach((q) => {
      answers[q.id] = [q.options.find((o) => !q.correct.includes(o.id))!.id];
    });
    const r = markAttempt(bank.questions, answers);
    expect(r.scorePercent).toBeLessThan(ALLERGEN_PASS_MARK);
    expect(r.passed).toBe(false);
  });
});

describe("attempt gate", () => {
  const closed = { mandatoryLessonsComplete: false, coachingRecorded: false, attempts: [] };

  it("keeps the assessment shut until every required lesson is done", () => {
    const g = assessmentGate(closed);
    expect(g.canStartAttempt).toBe(false);
  });

  it("allows two independent attempts", () => {
    expect(ALLERGEN_INDEPENDENT_ATTEMPTS).toBe(2);
    const afterOne = assessmentGate({
      mandatoryLessonsComplete: true, coachingRecorded: false,
      attempts: [{ attempt_number: 1, status: "submitted", passed: false }],
    });
    expect(afterOne.canStartAttempt).toBe(true);
    expect(afterOne.nextAttemptNumber).toBe(2);
  });

  it("locks a third attempt until a manager records coaching", () => {
    const twoFails = [
      { attempt_number: 1, status: "submitted", passed: false },
      { attempt_number: 2, status: "submitted", passed: false },
    ];
    const locked = assessmentGate({ mandatoryLessonsComplete: true, coachingRecorded: false, attempts: twoFails });
    expect(locked.status).toBe("manager_coaching_required");
    expect(locked.canStartAttempt).toBe(false);
    const unlocked = assessmentGate({ mandatoryLessonsComplete: true, coachingRecorded: true, attempts: twoFails });
    expect(unlocked.canStartAttempt).toBe(true);
    expect(unlocked.nextAttemptNumber).toBe(3);
  });

  it("reports a pass as awaiting practical sign-off and never as complete", () => {
    const g = assessmentGate({
      mandatoryLessonsComplete: true, coachingRecorded: false,
      attempts: [{ attempt_number: 1, status: "submitted", passed: true }],
    });
    expect(g.status).toBe("passed_awaiting_practical");
    expect(g.canStartAttempt).toBe(false);
    expect(g.message.toLowerCase()).toContain("practical");
  });
});

describe("lesson progress and gating", () => {
  it("gives no credit for opening a lesson and saves part-finished reading", () => {
    const lesson = ALLERGEN_SAFETY_LESSONS[0];
    expect(lessonIsComplete(lesson, [])).toBe(false);
    expect(lessonIsComplete(lesson, [lesson.sections[0].ref])).toBe(lesson.sections.length === 1);
    expect(lessonIsComplete(lesson, lesson.sections.map((s) => s.ref))).toBe(true);
  });

  it("opens the assessment only once every required lesson is complete", () => {
    const none = courseProgress(ALLERGEN_SAFETY_LESSONS, []);
    expect(none.assessmentOpen).toBe(false);
    expect(none.percent).toBe(0);
    expect(none.mandatoryOutstanding.length).toBeGreaterThan(0);

    const all = courseProgress(
      ALLERGEN_SAFETY_LESSONS,
      ALLERGEN_SAFETY_LESSONS.map((l) => ({
        lesson_ref: l.ref, completed_sections: l.sections.map((s) => s.ref), is_complete: true,
      })),
    );
    expect(all.assessmentOpen).toBe(true);
    expect(all.percent).toBe(100);
    expect(all.estimatedMinutesRemaining).toBe(0);
  });
});

describe("version comparison", () => {
  it("separates added, corrected and superseded material with its sources", () => {
    const cmp = compareCourseContent(
      { lessons: [{ ref: "a", label: "A", text: "old" }, { ref: "gone", label: "Gone", text: "dropped" }] },
      { lessons: [{ ref: "a", label: "A", text: "new", sources: ["matrix-jul-2026"] }, { ref: "b", label: "B", text: "fresh", sources: ["matrix-jul-2026"] }] },
      1, 2,
    );
    expect(cmp.fromVersion).toBe(1);
    expect(cmp.toVersion).toBe(2);
    expect(cmp.counts.added).toBe(1);
    expect(cmp.counts.corrected).toBe(1);
    expect(cmp.counts.superseded).toBe(1);
    expect(cmp.corrected[0].before).toBe("old");
    expect(cmp.corrected[0].sources).toContain("matrix-jul-2026");
  });
});
