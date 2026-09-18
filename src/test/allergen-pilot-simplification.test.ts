/**
 * Checks for the simplified pilot format: eight modules, 42-minute target,
 * an 18-question maximum keeping every critical control, the pilot gate and
 * the three-person pilot group.
 */

import { describe, it, expect } from "vitest";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TOTAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import {
  ALLERGEN_COURSE_MODULES,
  ALLERGEN_MODULE_COUNT,
  moduleLessons,
  moduleForLesson,
  moduleMinutes,
  moduleProgressState,
} from "@/data/allergen/allergen-course-modules";
import {
  ALLERGEN_QUESTION_BANK,
  CRITICAL_QUESTION_COUNT,
} from "@/data/allergen/allergen-safety-questions";
import {
  ALLERGEN_MAX_SCORED_QUESTIONS,
  ALLERGEN_MENU_QUESTION_SLOTS,
  selectQuestionBank,
} from "@/lib/allergen-course";
import { controlledPilotGate, validatePilotSelection } from "@/lib/allergen-preview";

const dishes = [
  { dish_name: "Satay Chicken", is_confirmed: true, management_decision: "approved", active_branch_ids: ["b1"] },
  { dish_name: "Nutella", is_confirmed: true, management_decision: "approved", active_branch_ids: ["b1"] },
  { dish_name: "Nutella sweet dumpling", is_confirmed: true, management_decision: "approved", active_branch_ids: ["b1"] },
  { dish_name: "Tempura Aubergine", is_confirmed: false, management_decision: "evidence_requested", active_branch_ids: ["b1"] },
  { dish_name: "Corn Fritters", is_confirmed: false, management_decision: "evidence_requested", active_branch_ids: ["b1"] },
];

describe("eight learner modules", () => {
  it("presents the course as eight modules", () => {
    expect(ALLERGEN_MODULE_COUNT).toBe(8);
  });

  it("covers every approved lesson exactly once", () => {
    const refs = ALLERGEN_COURSE_MODULES.flatMap((m) => m.lesson_refs);
    expect(refs.length).toBe(ALLERGEN_SAFETY_LESSONS.length);
    expect(new Set(refs).size).toBe(refs.length);
    for (const lesson of ALLERGEN_SAFETY_LESSONS) {
      expect(moduleForLesson(lesson.ref)).not.toBeNull();
    }
  });

  it("keeps the learning time inside the 35-45 minute target", () => {
    expect(ALLERGEN_COURSE_TOTAL_MINUTES).toBeGreaterThanOrEqual(35);
    expect(ALLERGEN_COURSE_TOTAL_MINUTES).toBeLessThanOrEqual(45);
    const summed = ALLERGEN_COURSE_MODULES.reduce((n, m) => n + moduleMinutes(m), 0);
    expect(summed).toBe(ALLERGEN_COURSE_TOTAL_MINUTES);
  });

  it("reports module progress from the saved section rows", () => {
    const module = ALLERGEN_COURSE_MODULES[0];
    const lessons = moduleLessons(module);
    const completed: Record<string, string[]> = {};
    for (const l of lessons) completed[l.ref] = l.sections.map((s) => s.ref);
    const state = moduleProgressState(module, completed);
    expect(state.complete).toBe(true);
    expect(state.sectionsComplete).toBe(state.sectionsTotal);

    const none = moduleProgressState(module, {});
    expect(none.complete).toBe(false);
    expect(none.sectionsComplete).toBe(0);
  });
});

describe("shortened assessment", () => {
  const selection = selectQuestionBank({
    bank: ALLERGEN_QUESTION_BANK,
    dishes,
    conflicts: [],
    branchId: "b1",
    seed: "test",
  });

  it("scores no more than 18 questions", () => {
    expect(selection.questions.length).toBeLessThanOrEqual(ALLERGEN_MAX_SCORED_QUESTIONS);
  });

  it("keeps every critical-safety question", () => {
    expect(CRITICAL_QUESTION_COUNT).toBe(15);
    expect(selection.questions.filter((q) => q.critical).length).toBe(15);
  });

  it("scores at most three current-menu questions", () => {
    expect(selection.questions.filter((q) => !q.critical).length).toBeLessThanOrEqual(
      ALLERGEN_MENU_QUESTION_SLOTS,
    );
  });

  it("never scores the dishes whose evidence is outstanding", () => {
    const scoredFlavours = selection.questions.map((q) => q.flavour).filter(Boolean);
    expect(scoredFlavours).not.toContain("Tempura Aubergine");
    expect(scoredFlavours).not.toContain("Corn Fritters");
  });
});

describe("controlled pilot gate", () => {
  const complete = {
    automatedChecksPassing: true,
    phoneWalkthroughSigned: true,
    computerWalkthroughSigned: true,
    progressSavingConfirmed: true,
    branchQuestionsConfirmed: true,
    certificateControlsConfirmed: true,
    knownSeriousProblems: [],
  };

  it("is ready on the six simplified checks alone", () => {
    const gate = controlledPilotGate(complete);
    expect(gate.ready).toBe(true);
    expect(gate.blockers).toHaveLength(0);
    expect(gate.openActionsBeforeFullRollout.length).toBeGreaterThan(0);
  });

  it("blocks when a walkthrough is unsigned", () => {
    expect(controlledPilotGate({ ...complete, phoneWalkthroughSigned: false }).ready).toBe(false);
  });

  it("blocks when a serious problem is already recorded", () => {
    const gate = controlledPilotGate({ ...complete, knownSeriousProblems: ["screen reader — focus-order"] });
    expect(gate.ready).toBe(false);
  });
});

describe("three-person pilot group", () => {
  const person = (name: string, site: string, audience: "foh" | "kitchen") => ({
    employee_id: name,
    name,
    site,
    audience,
  });

  it("accepts one person per site with both roles covered", () => {
    const result = validatePilotSelection([
      person("A", "Carnaby", "foh"),
      person("B", "Brixton", "kitchen"),
      person("C", "Fitzrovia", "foh"),
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects a group missing a site", () => {
    const result = validatePilotSelection([
      person("A", "Carnaby", "foh"),
      person("B", "Carnaby", "kitchen"),
      person("C", "Fitzrovia", "foh"),
    ]);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toContain("Brixton");
  });

  it("rejects a group with no kitchen member of staff", () => {
    const result = validatePilotSelection([
      person("A", "Carnaby", "foh"),
      person("B", "Brixton", "foh"),
      person("C", "Fitzrovia", "foh"),
    ]);
    expect(result.ok).toBe(false);
  });
});
