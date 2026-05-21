/**
 * Phase 5M — Contract Issue, Send and Signature Workflow
 *
 * Validates the pure issue-summary helper and the workflow-status concept:
 *  - generation ≠ issuing ≠ signing ≠ locking
 *  - issue confirmation shows the key contract summary
 *  - soft warnings and manually entered critical fields surface before issue
 *  - the gate from Phase 5L still blocks incomplete contracts
 *  - no payroll / NMW / DB / profile / audit / legal logic is touched
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildContractIssueSummary,
  contractWorkflowStatusLabel,
  type ContractWorkflowStatus,
} from "@/lib/contract-issue-summary";
import { getContractGenerationGate } from "@/lib/contract-generation-gate";
import { buildContractDraftEvidence } from "@/lib/contract-draft-evidence";
import { deriveContractReadiness } from "@/lib/contract-readiness";
import {
  getMissingContractFields,
  type ContractFieldSource,
} from "@/lib/contract-form-review";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const validVariables: Partial<ContractVariables> = {
  employeeName: "Jane Doe",
  homeAddress: "1 High St, London",
  jobTitle: "Server",
  employmentType: "full_time",
  effectiveDate: "2025-01-15",
  workLocation: "Soho",
  baseHourlyRate: "12.5",
  weeklyHours: "40",
  noticePeriod: "two weeks",
  reportingManagerName: "Alex Manager",
  reportingManagerTitle: "Head of FOH",
};

function buildContext(opts: {
  variables?: Partial<ContractVariables>;
  isGenerated?: boolean;
  sources?: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
}) {
  const variables = { ...validVariables, ...(opts.variables ?? {}) };
  const sources = opts.sources ?? {
    employeeName: "employee_profile",
    homeAddress: "onboarding",
    jobTitle: "derived",
    employmentType: "active_terms",
    effectiveDate: "employee_profile",
    workLocation: "active_terms",
    baseHourlyRate: "active_terms",
    weeklyHours: "active_terms",
    noticePeriod: "derived",
  };
  const missing = getMissingContractFields(variables);
  const readiness = deriveContractReadiness({ missing, sources });
  const gate = getContractGenerationGate({
    variables,
    companyLegalName: "UglyOps Ltd",
    companyAddress: "10 Old Street",
    fieldSources: sources,
    manualReviewFields: readiness.manualCriticalFields,
  });
  const evidence = buildContractDraftEvidence({
    employee: { id: "emp-1" },
    contractType: "foh",
    contractValues: variables,
    fieldSources: sources,
    missingFields: missing,
    readinessStatus: readiness.status,
    fromEmployeeCreationFlow: false,
    now: new Date("2025-01-01T00:00:00.000Z"),
  });
  return { variables, gate, evidence };
}

describe("Phase 5M — workflow status labels", () => {
  const map: Record<ContractWorkflowStatus, RegExp> = {
    draft: /draft/i,
    generated: /generated/i,
    issued: /issued/i,
    signed: /signed/i,
    locked: /locked/i,
    voided: /voided/i,
  };
  it("exposes a label for every workflow status", () => {
    for (const [status, re] of Object.entries(map)) {
      expect(contractWorkflowStatusLabel(status as ContractWorkflowStatus)).toMatch(re);
    }
  });

  it("treats generated, issued, signed and locked as distinct concepts", () => {
    const labels = new Set([
      contractWorkflowStatusLabel("generated"),
      contractWorkflowStatusLabel("issued"),
      contractWorkflowStatusLabel("signed"),
      contractWorkflowStatusLabel("locked"),
    ]);
    expect(labels.size).toBe(4);
  });
});

describe("Phase 5M — issue summary", () => {
  it("blocks issuing when the contract has not been generated yet", () => {
    const { gate, evidence, variables } = buildContext({ isGenerated: false });
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: false,
    });
    expect(s.canIssue).toBe(false);
    expect(s.blockingReason).toMatch(/generated/i);
  });

  it("allows issuing once generated and all required fields are present", () => {
    const { gate, evidence, variables } = buildContext({ isGenerated: true });
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(s.canIssue).toBe(true);
    expect(s.blockingReason).toBeNull();
    expect(s.confirmationMessage).toMatch(/about to issue/i);
  });

  it("includes the key contract summary fields", () => {
    const { gate, evidence, variables } = buildContext({ isGenerated: true });
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(s.employeeName).toBe("Jane Doe");
    expect(s.jobTitle).toBe("Server");
    expect(s.startDate).toBe("2025-01-15");
    expect(s.workLocation).toBe("Soho");
    expect(s.paySummary).toMatch(/£12\.5\/hour base/);
    expect(s.paySummary).toMatch(/40 hrs\/week/);
    expect(s.reportingManagerLine).toMatch(/Alex Manager/);
    expect(s.employmentTypeLabel.length).toBeGreaterThan(0);
  });

  it("surfaces soft warnings (e.g. missing reporting manager)", () => {
    const { gate, evidence, variables } = buildContext({
      isGenerated: true,
      variables: { reportingManagerName: "", reportingManagerTitle: "" },
    });
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(s.hasSoftWarnings).toBe(true);
    expect(s.softWarningLabels.join(" ")).toMatch(/reporting manager/i);
    // Soft warnings must not block issuing.
    expect(s.canIssue).toBe(true);
  });

  it("flags manually entered critical fields", () => {
    const sources: Partial<Record<keyof ContractVariables, ContractFieldSource>> = {
      employeeName: "employee_profile",
      homeAddress: "onboarding",
      jobTitle: "derived",
      employmentType: "active_terms",
      effectiveDate: "employee_profile",
      workLocation: "active_terms",
      // Manually edited critical fields:
      baseHourlyRate: "manual",
      weeklyHours: "manual",
      noticePeriod: "derived",
    };
    const { gate, evidence, variables } = buildContext({
      isGenerated: true,
      sources,
    });
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(s.hasManualCriticalFields).toBe(true);
    expect(s.manualCriticalFieldLabels.length).toBeGreaterThanOrEqual(2);
    // Manual fields must not block issuing — they are a review signal only.
    expect(s.canIssue).toBe(true);
  });

  it("blocks issuing when the Phase 5L gate fails (incomplete contract)", () => {
    const { gate, evidence, variables } = buildContext({
      isGenerated: true,
      variables: { baseHourlyRate: "" },
    });
    expect(gate.canGenerate).toBe(false);
    const s = buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(s.canIssue).toBe(false);
    expect(s.blockingReason).toMatch(/cannot be generated/i);
  });

  it("does not mutate its inputs", () => {
    const { gate, evidence, variables } = buildContext({ isGenerated: true });
    const variablesCopy = JSON.parse(JSON.stringify(variables));
    const evidenceCopy = JSON.parse(JSON.stringify(evidence));
    const gateCopy = JSON.parse(JSON.stringify(gate));
    buildContractIssueSummary({
      variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(variables).toEqual(variablesCopy);
    expect(evidence).toEqual(evidenceCopy);
    expect(gate).toEqual(gateCopy);
  });
});

describe("Phase 5M — workflow separation in the dialog", () => {
  const dialogSource = readFileSync(
    join(process.cwd(), "src/components/contracts/ContractFormDialog.tsx"),
    "utf8",
  );

  it("moves to the 'issue' step (not 'sign') immediately after generating", () => {
    // After Generate & Save, the dialog must go to the issue confirmation,
    // never directly to the signing/send panel.
    expect(dialogSource).toMatch(/setStep\("issue"\)/);
    // The only setStep("sign") call should be the issue → sign transition,
    // not part of handleConfirmAndSave.
    const saveBlockIndex = dialogSource.indexOf("handleConfirmAndSave");
    const nextSignSetStep = dialogSource.indexOf(
      'setStep("sign")',
      saveBlockIndex,
    );
    const handlerEnd = dialogSource.indexOf(
      "const handleGenerateLink",
      saveBlockIndex,
    );
    // No setStep("sign") inside handleConfirmAndSave.
    expect(
      nextSignSetStep === -1 || nextSignSetStep > handlerEnd,
    ).toBe(true);
  });

  it("requires an explicit Issue button to advance to the sign step", () => {
    expect(dialogSource).toMatch(/data-testid="issue-contract-button"/);
    expect(dialogSource).toMatch(/issue-confirmation-panel/);
    expect(dialogSource).toMatch(/Issue contract to employee/);
  });

  it("renders the issue summary block before sending", () => {
    expect(dialogSource).toMatch(/data-testid="issue-summary"/);
  });

  it("does not auto-mark a generated contract as signed or locked", () => {
    // No code path in the dialog sets a workflowStatus of 'signed' or
    // 'locked' on its own — signing is owned by the existing signature flow.
    expect(dialogSource).not.toMatch(/workflowStatus.*=.*"signed"/);
    expect(dialogSource).not.toMatch(/workflowStatus.*=.*"locked"/);
  });
});

describe("Phase 5M — safety: pure helper has no forbidden imports", () => {
  const helperSource = readFileSync(
    join(process.cwd(), "src/lib/contract-issue-summary.ts"),
    "utf8",
  );

  it("does not import React, React Query, or Supabase", () => {
    expect(helperSource).not.toMatch(/from ["']react["']/);
    expect(helperSource).not.toMatch(/@tanstack\/react-query/);
    expect(helperSource).not.toMatch(/@\/integrations\/supabase/);
    expect(helperSource).not.toMatch(/supabase\.from/);
  });

  it("does not perform any persistence or fake sending", () => {
    expect(helperSource).not.toMatch(/insert\(|update\(|delete\(/);
    expect(helperSource).not.toMatch(/fetch\(|sendContractEmail|signContract/);
  });
});

describe("Phase 5M — no DB migration introduced in this phase", () => {
  it("contract-issue-summary helper is a TS-only file (no SQL/migration)", () => {
    const helperSource = readFileSync(
      join(process.cwd(), "src/lib/contract-issue-summary.ts"),
      "utf8",
    );
    expect(helperSource).not.toMatch(/CREATE TABLE|ALTER TABLE|CREATE POLICY/i);
  });
});
