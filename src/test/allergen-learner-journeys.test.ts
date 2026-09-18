/**
 * Six management test-mode learner journeys: front of house and kitchen at
 * Carnaby, Brixton and Fitzrovia. Fixtures mirror the confirmed flavour records
 * held in the system; no genuine record is created by these checks.
 */

import { describe, expect, it } from "vitest";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TOTAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import {
  assessmentGate,
  courseProgress,
  markAttempt,
  selectQuestionBank,
  type AttemptSummary,
  type DishEligibilityInput,
} from "@/lib/allergen-course";
import {
  certificationGate,
  markObservation,
  observationItemsFor,
} from "@/lib/allergen-certification";

const CARNABY = "3e80394f-cdc4-4f42-8889-9cb9c2f1e8b5";
const BRIXTON = "0488cea1-8961-4ea2-83da-882eaf84e13c";
const FITZROVIA = "498c56f8-ed97-4b56-9ad0-f625ac65b1a3";
const ALL = [CARNABY, BRIXTON, FITZROVIA];

const d = (
  dish_name: string,
  is_confirmed: boolean,
  management_decision: string | null,
  active_branch_ids: string[],
): DishEligibilityInput => ({ dish_name, is_confirmed, management_decision, active_branch_ids });

const DISHES: DishEligibilityInput[] = [
  d("Satay Chicken", true, "confirm", ALL),
  d("Nutella sweet dumpling", true, "correct", ALL),
  d("Pecan sweet dumpling", true, "correct", ALL),
  d("Apple Pie", true, "confirm", ALL),
  d("Prawn & Chive", true, "confirm", ALL),
  d("Spinach & Tofu", true, "confirm", ALL),
  d("Lamb & Harissa", true, "confirm", [CARNABY, FITZROVIA]),
  d("Curry Goat", true, "confirm", [BRIXTON]),
  d("Biscoff Banana", true, "correct", [BRIXTON]),
  d("Corn Fritters", false, "needs_evidence", [BRIXTON]),
  d("Tempura Aubergine", false, "needs_evidence", ALL),
  d("Laksa Soup", false, "needs_evidence", []),
  d("Homemade Chilli Sauce", true, "confirm", []),
  d("GF Cucumber Salad", false, "reference_only", []),
  d("House Chilli Oil", false, "reference_only", []),
  d("Sichuan Vegan Pork Dumplings", false, "reference_only", []),
];

const CONFLICTS = [
  { subject: "Tempura Aubergine batter", status: "open" },
  { subject: "Corn Fritters batter", status: "open" },
];

const branches = [
  { name: "Carnaby", id: CARNABY },
  { name: "Brixton", id: BRIXTON },
  { name: "Fitzrovia", id: FITZROVIA },
];
const audiences = ["foh", "kitchen"] as const;

const allSectionsDone = ALLERGEN_SAFETY_LESSONS.map((l) => ({
  lesson_ref: l.ref,
  completed_sections: l.sections.map((s) => s.ref),
  is_complete: true,
}));

for (const branch of branches) {
  for (const audience of audiences) {
    describe(`${audience === "foh" ? "Front of house" : "Kitchen"} learner at ${branch.name} (test mode)`, () => {
      it("sees the course, its length and one section at a time", () => {
        const start = courseProgress(ALLERGEN_SAFETY_LESSONS, []);
        expect(start.lessonsTotal).toBe(16);
        expect(start.percent).toBe(0);
        expect(start.estimatedMinutesRemaining).toBe(ALLERGEN_COURSE_TOTAL_MINUTES);
        expect(start.assessmentOpen).toBe(false);
      });

      it("keeps progress after leaving part-way and resumes at the right place", () => {
        const half = ALLERGEN_SAFETY_LESSONS.slice(0, 8).map((l) => ({
          lesson_ref: l.ref,
          completed_sections: l.sections.map((s) => s.ref),
          is_complete: true,
        }));
        const mid = courseProgress(ALLERGEN_SAFETY_LESSONS, half);
        expect(mid.lessonsComplete).toBe(8);
        expect(mid.percent).toBeGreaterThan(30);
        expect(mid.assessmentOpen).toBe(false);
        expect(mid.mandatoryOutstanding.length).toBe(8);

        // A lesson only counts when every section was actively marked complete.
        const partial = [
          {
            lesson_ref: ALLERGEN_SAFETY_LESSONS[8].ref,
            completed_sections: [ALLERGEN_SAFETY_LESSONS[8].sections[0].ref],
            is_complete: false,
          },
        ];
        expect(courseProgress(ALLERGEN_SAFETY_LESSONS, [...half, ...partial]).lessonsComplete).toBe(8);
      });

      it("opens the assessment only once every required lesson is complete", () => {
        const before = assessmentGate({
          attempts: [],
          coachingRecorded: false,
          mandatoryLessonsComplete: false,
        });
        expect(before.canStartAttempt).toBe(false);

        const after = assessmentGate({
          attempts: [],
          coachingRecorded: false,
          mandatoryLessonsComplete: true,
        });
        expect(after.canStartAttempt).toBe(true);
        expect(after.nextAttemptNumber).toBe(1);
        expect(courseProgress(ALLERGEN_SAFETY_LESSONS, allSectionsDone).assessmentOpen).toBe(true);
      });

      it("receives the correct site questions and never an excluded flavour", () => {
        const bank = selectQuestionBank({
          bank: ALLERGEN_QUESTION_BANK,
          dishes: DISHES,
          conflicts: CONFLICTS,
          branchId: branch.id,
          seed: `test:${branch.id}:${audience}`,
        });
        const flavours = bank.questions.map((q) => q.flavour).filter(Boolean) as string[];

        for (const f of ["Tempura Aubergine", "Corn Fritters", "Laksa Soup", "Homemade Chilli Sauce", "GF Cucumber Salad", "House Chilli Oil", "Sichuan Vegan Pork Dumplings"]) {
          expect(flavours).not.toContain(f);
        }
        if (branch.id === BRIXTON) expect(flavours).not.toContain("Lamb & Harissa");
        else {
          expect(flavours).not.toContain("Curry Goat");
          expect(flavours).not.toContain("Biscoff Banana");
        }
        expect(bank.questions.filter((q) => q.critical).length).toBeGreaterThanOrEqual(14);
      });

      it("fails when a critical question is missed, even with a high score", () => {
        const bank = selectQuestionBank({
          bank: ALLERGEN_QUESTION_BANK,
          dishes: DISHES,
          conflicts: CONFLICTS,
          branchId: branch.id,
          seed: "marking",
        });
        const critical = bank.questions.find((q) => q.critical)!;
        const answers: Record<string, string[]> = {};
        for (const q of bank.questions) answers[q.id] = [...q.correct];
        answers[critical.id] = [critical.options.find((o) => !critical.correct.includes(o.id))!.id];

        const result = markAttempt(bank.questions, answers);
        expect(result.scorePercent).toBeGreaterThan(80);
        expect(result.criticalMissed).toContain(critical.id);
        expect(result.passed).toBe(false);
      });

      it("locks after two failures until a manager records coaching", () => {
        const failed: AttemptSummary[] = [
          { attempt_number: 1, status: "submitted", passed: false },
          { attempt_number: 2, status: "submitted", passed: false },
        ];
        const locked = assessmentGate({ attempts: failed, coachingRecorded: false, mandatoryLessonsComplete: true });
        expect(locked.status).toBe("manager_coaching_required");
        expect(locked.canStartAttempt).toBe(false);

        const unlocked = assessmentGate({ attempts: failed, coachingRecorded: true, mandatoryLessonsComplete: true });
        expect(unlocked.canStartAttempt).toBe(true);
        expect(unlocked.nextAttemptNumber).toBe(3);
      });

      it("reaches 'assessment passed — awaiting practical sign-off' on a full pass", () => {
        const bank = selectQuestionBank({
          bank: ALLERGEN_QUESTION_BANK,
          dishes: DISHES,
          conflicts: CONFLICTS,
          branchId: branch.id,
          seed: "pass",
        });
        const answers: Record<string, string[]> = {};
        for (const q of bank.questions) answers[q.id] = [...q.correct];
        const pass = markAttempt(bank.questions, answers);
        expect(pass.passed).toBe(true);

        const gate = assessmentGate({
          attempts: [{ attempt_number: 1, status: "submitted", passed: true }],
          coachingRecorded: false,
          mandatoryLessonsComplete: true,
        });
        expect(gate.status).toBe("passed_awaiting_practical");
        expect(gate.canStartAttempt).toBe(false);
      });

      it("completes the right observation for the role and then meets all three certificate gates", () => {
        const items = observationItemsFor(audience);
        expect(items.length).toBeGreaterThan(0);
        for (const i of items) {
          expect(i.audience === audience || i.audience === "both").toBe(true);
        }

        const results = Object.fromEntries(items.map((i) => [i.ref, { seen: true }]));
        const marking = markObservation(items, results);
        expect(marking.outcome).toBe("passed");

        const gate = certificationGate({
          lessonsComplete: 16,
          lessonsRequired: 16,
          mandatoryOutstanding: [],
          assessment: { passed: true, scorePercent: 92, criticalMissed: [] },
          observation: {
            outcome: "passed",
            signedAt: "2026-09-18T10:00:00Z",
            signedByName: "A Manager",
            signerIsAuthorisedManager: true,
          },
        });
        expect(gate.blockers).toEqual([]);
        expect(gate.eligible).toBe(true);
      });
    });
  }
}
