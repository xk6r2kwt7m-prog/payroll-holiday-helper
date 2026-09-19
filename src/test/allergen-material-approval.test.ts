import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { controlledPilotGate } from "@/lib/allergen-preview";

const base = {
  automatedChecksPassing: true,
  phoneWalkthroughSigned: false,
  computerWalkthroughSigned: false,
  progressSavingConfirmed: false,
  branchQuestionsConfirmed: true,
  certificateControlsConfirmed: false,
  knownSeriousProblems: [] as string[],
};

describe("approving the allergen training material", () => {
  it("blocks the pilot while nothing is approved and no walkthrough is signed", () => {
    expect(controlledPilotGate(base).ready).toBe(false);
  });

  it("opens publishing once the administrator approves the material", () => {
    const gate = controlledPilotGate({ ...base, materialApprovedByAdministrator: true });
    expect(gate.ready).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it("still blocks on failing automated checks, wrong site questions or a known failure", () => {
    expect(
      controlledPilotGate({ ...base, materialApprovedByAdministrator: true, automatedChecksPassing: false }).ready,
    ).toBe(false);
    expect(
      controlledPilotGate({ ...base, materialApprovedByAdministrator: true, branchQuestionsConfirmed: false }).ready,
    ).toBe(false);
    expect(
      controlledPilotGate({
        ...base,
        materialApprovedByAdministrator: true,
        knownSeriousProblems: ["smartphone — lesson-resume"],
      }).ready,
    ).toBe(false);
  });

  it("keeps the deferred walkthroughs listed as open work", () => {
    const gate = controlledPilotGate({ ...base, materialApprovedByAdministrator: true });
    expect(gate.openActionsBeforeFullRollout.length).toBeGreaterThan(0);
  });

  it("records the approval without sending anything", () => {
    const hook = readFileSync("src/hooks/useAllergenMaterialApproval.ts", "utf8");
    expect(hook).toContain("allergen_material_approvals");
    expect(hook).toContain("allergen_material_approved");
    expect(hook).not.toContain("send-notification");
    expect(hook).not.toContain("functions.invoke");
  });

  it("requires a name and passing automated checks before approving", () => {
    const ui = readFileSync("src/components/compliance/allergen/AllergenPilotControl.tsx", "utf8");
    expect(ui).toContain("!approverName.trim() || !automatedChecksPassing");
    expect(ui).toContain("Approve the training material");
  });
});
