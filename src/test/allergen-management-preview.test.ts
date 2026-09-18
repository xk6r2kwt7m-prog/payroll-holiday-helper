/**
 * Management preview and hands-on acceptance rules.
 *
 * These are logic checks only. They deliberately do NOT claim that the course is
 * accessible: only a person completing and signing the checklist columns does that.
 */

import { describe, it, expect } from "vitest";
import {
  PREVIEW_PERSONAS, previewKeyFor, isPreviewKey, canClearPreviewRow,
  validateBranchFlavourQuestions, environmentChecklistState, acceptanceOverview,
  pilotReadiness,
} from "@/lib/allergen-preview";
import {
  ACCEPTANCE_ENVIRONMENTS, ACCEPTANCE_CHECKS, ACCEPTANCE_TOTAL_CHECKS,
  acceptanceCommentRequired, checksForEnvironment,
} from "@/data/allergen/allergen-acceptance-checklist";

describe("preview personas", () => {
  it("covers front of house and kitchen at all three sites", () => {
    expect(PREVIEW_PERSONAS).toHaveLength(6);
    for (const site of ["Carnaby", "Brixton", "Fitzrovia"]) {
      expect(PREVIEW_PERSONAS.filter((p) => p.site === site)).toHaveLength(2);
    }
  });

  it("marks every preview key so it can be told apart from genuine activity", () => {
    const key = previewKeyFor(PREVIEW_PERSONAS[0].key);
    expect(isPreviewKey(key)).toBe(true);
    expect(isPreviewKey(null)).toBe(false);
    expect(isPreviewKey("something-else")).toBe(false);
  });
});

describe("reset safety", () => {
  it("clears only test rows carrying a preview key", () => {
    const key = previewKeyFor(PREVIEW_PERSONAS[0].key);
    expect(canClearPreviewRow({ is_test: true, preview_key: key })).toBe(true);
    expect(canClearPreviewRow({ is_test: false, preview_key: key })).toBe(false);
    expect(canClearPreviewRow({ is_test: true, preview_key: null })).toBe(false);
    expect(canClearPreviewRow({ is_test: true, preview_key: "other" })).toBe(false);
  });
});

describe("branch flavour validation", () => {
  it("fails when a Brixton-only flavour is scored at Carnaby", () => {
    const v = validateBranchFlavourQuestions("Carnaby", ["Curry Goat"]);
    expect(v.ok).toBe(false);
  });

  it("passes when a site scores only flavours allowed there", () => {
    const v = validateBranchFlavourQuestions("Brixton", ["Curry Goat"]);
    expect(v.ok).toBe(true);
  });

  it("does not fail simply because an allowed flavour is absent", () => {
    const v = validateBranchFlavourQuestions("Brixton", []);
    expect(v.ok).toBe(true);
  });
});

describe("acceptance checklist", () => {
  it("requires a comment for a failure or an untested line", () => {
    expect(acceptanceCommentRequired("fail")).toBe(true);
    expect(acceptanceCommentRequired("not_tested")).toBe(true);
    expect(acceptanceCommentRequired("pass")).toBe(false);
    expect(acceptanceCommentRequired("pass_with_observation")).toBe(false);
  });

  it("covers all five environments with at least one check each", () => {
    for (const env of ACCEPTANCE_ENVIRONMENTS) {
      expect(checksForEnvironment(env.key).length).toBeGreaterThan(0);
    }
    expect(ACCEPTANCE_CHECKS.length).toBeGreaterThan(0);
    expect(ACCEPTANCE_TOTAL_CHECKS).toBeGreaterThan(ACCEPTANCE_CHECKS.length);
  });

  it("is not ready to sign while a failure has no comment", () => {
    const checks = checksForEnvironment("smartphone");
    const recorded = checks.map((c, i) => ({
      environment: "smartphone" as const,
      check_ref: c.ref,
      result: i === 0 ? ("fail" as const) : ("pass" as const),
      comment: null,
    }));
    const state = environmentChecklistState("smartphone", recorded);
    expect(state.recorded).toBe(checks.length);
    expect(state.readyToSign).toBe(false);
    expect(state.missingComments).toContain(checks[0].ref);
  });

  it("signs as not accepted when a line failed, with the comment supplied", () => {
    const checks = checksForEnvironment("smartphone");
    const recorded = checks.map((c, i) => ({
      environment: "smartphone" as const,
      check_ref: c.ref,
      result: i === 0 ? ("fail" as const) : ("pass" as const),
      comment: i === 0 ? "Buttons too small to press with a thumb." : null,
    }));
    const state = environmentChecklistState("smartphone", recorded);
    expect(state.readyToSign).toBe(true);
    expect(state.outcome).toBe("not_accepted");
  });

  it("treats an empty checklist as incomplete, never as accepted", () => {
    const overview = acceptanceOverview([]);
    expect(overview.handsOnComplete).toBe(false);
    expect(overview.environments.every((e) => e.outcome === "incomplete")).toBe(true);
  });
});

describe("pilot readiness", () => {
  it("blocks publication and a pilot until a person has finished the checklist", () => {
    const r = pilotReadiness({
      handsOnComplete: false,
      outstandingEvidenceCount: 2,
      branchValidationsOk: true,
      certificateGatesProven: true,
    });
    expect(r.readyForPublication).toBe(false);
    expect(r.readyForControlledPilot).toBe(false);
  });

  it("allows a controlled pilot but not full publication while evidence is outstanding", () => {
    const r = pilotReadiness({
      handsOnComplete: true,
      outstandingEvidenceCount: 2,
      branchValidationsOk: true,
      certificateGatesProven: true,
    });
    expect(r.readyForControlledPilot).toBe(true);
    expect(r.readyForPublication).toBe(false);
  });
});
