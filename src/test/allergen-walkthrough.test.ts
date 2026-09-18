/**
 * Checks for the ten-minute management acceptance walkthrough and the tightened
 * question safeguard: generic critical questions always scored, dish-dependent
 * questions withheld and reported when their evidence is not confirmed.
 */

import { describe, it, expect } from "vitest";
import {
  ALLERGEN_WALKTHROUGH_STEPS,
  WALKTHROUGH_TOTAL_MINUTES,
  walkthroughCommentRequired,
  walkthroughReadiness,
  walkthroughSignoffOutcome,
} from "@/data/allergen/allergen-walkthrough";
import { ALLERGEN_QUESTION_BANK, CRITICAL_QUESTION_COUNT } from "@/data/allergen/allergen-safety-questions";
import { selectQuestionBank, EXCLUDED_FLAVOUR_NAMES } from "@/lib/allergen-course";

describe("walkthrough structure", () => {
  it("has the thirteen requested stops in order", () => {
    expect(ALLERGEN_WALKTHROUGH_STEPS).toHaveLength(13);
    ALLERGEN_WALKTHROUGH_STEPS.forEach((s, i) => {
      expect(s.order).toBe(i + 1);
      expect(s.look_for.length).toBeGreaterThan(20);
    });
    const refs = ALLERGEN_WALKTHROUGH_STEPS.map((s) => s.ref);
    for (const ref of [
      "opening", "module", "resume", "locked", "question-types", "branch-question",
      "critical-failure", "coaching-lock", "passed", "practical", "gates",
      "certificate", "publish",
    ]) {
      expect(refs).toContain(ref);
    }
  });

  it("takes about ten minutes", () => {
    expect(WALKTHROUGH_TOTAL_MINUTES).toBeGreaterThanOrEqual(9);
    expect(WALKTHROUGH_TOTAL_MINUTES).toBeLessThanOrEqual(15);
  });
});

describe("recording a walkthrough result", () => {
  it("requires a comment for anything other than a plain pass", () => {
    expect(walkthroughCommentRequired("pass")).toBe(false);
    expect(walkthroughCommentRequired("pass_with_comments")).toBe(true);
    expect(walkthroughCommentRequired("fail")).toBe(true);
  });

  it("stores the result on the existing acceptance record", () => {
    expect(walkthroughSignoffOutcome("pass")).toBe("accepted");
    expect(walkthroughSignoffOutcome("pass_with_comments")).toBe("accepted_with_observations");
    expect(walkthroughSignoffOutcome("fail")).toBe("not_accepted");
  });
});

describe("readiness for the controlled pilot", () => {
  it("marks version 2 ready only when both walkthroughs pass", () => {
    expect(walkthroughReadiness({ phone: "pass", computer: "pass" }).readyToPublish).toBe(true);
    expect(walkthroughReadiness({ phone: "pass", computer: "pass_with_comments" }).readyToPublish).toBe(true);
    expect(walkthroughReadiness({ phone: "pass", computer: null }).readyToPublish).toBe(false);
    const failed = walkthroughReadiness({ phone: "fail", computer: "pass" });
    expect(failed.readyToPublish).toBe(false);
    expect(failed.outstanding.join(" ")).toMatch(/repeated/);
  });
});

describe("question safeguard", () => {
  const confirmed = [
    { dish_name: "Satay Chicken", is_confirmed: true, management_decision: "confirm", active_branch_ids: ["b1"] },
    { dish_name: "Nutella", is_confirmed: true, management_decision: "confirm", active_branch_ids: ["b1"] },
  ];

  it("always scores the generic critical-safety questions", () => {
    const bank = selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK, dishes: [], conflicts: [], branchId: "b1", seed: "safeguard",
    });
    const genericCritical = ALLERGEN_QUESTION_BANK.filter((q) => q.critical && !q.flavour);
    for (const q of genericCritical) {
      expect(bank.questions.some((x) => x.id === q.id)).toBe(true);
    }
  });

  it("withholds a critical question whose dish record is unconfirmed, and reports it", () => {
    const bank = selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK, dishes: [], conflicts: [], branchId: "b1", seed: "safeguard",
    });
    const flavourCritical = ALLERGEN_QUESTION_BANK.filter((q) => q.critical && q.flavour);
    for (const q of flavourCritical) {
      expect(bank.questions.some((x) => x.id === q.id)).toBe(false);
    }
    expect((bank.criticalWarnings ?? []).length).toBe(flavourCritical.length);
    for (const w of bank.criticalWarnings ?? []) {
      expect(w.reason.length).toBeGreaterThan(5);
    }
  });

  it("scores a dish-dependent critical question once its record is confirmed and live", () => {
    const bank = selectQuestionBank({
      bank: ALLERGEN_QUESTION_BANK, dishes: confirmed, conflicts: [], branchId: "b1", seed: "safeguard",
    });
    expect(bank.questions.filter((q) => q.critical).length).toBeGreaterThan(
      CRITICAL_QUESTION_COUNT - 3,
    );
    expect((bank.criticalWarnings ?? []).length).toBeLessThan(3);
  });

  it("never scores an excluded, inactive or reference-only product", () => {
    for (const dishes of [[], confirmed]) {
      const bank = selectQuestionBank({
        bank: ALLERGEN_QUESTION_BANK, dishes, conflicts: [], branchId: "b1", seed: "safeguard",
      });
      for (const q of bank.questions) {
        expect(EXCLUDED_FLAVOUR_NAMES).not.toContain(q.flavour ?? "");
      }
    }
  });
});
