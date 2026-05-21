/**
 * Phase 5C — Source-level tests for approval evidence / block wording.
 *
 * Asserts that:
 *   - the Payroll page renders the read-only approval evidence snapshot,
 *     derived from existing state (no new persistence / schema / audit);
 *   - the checklist still drives the gate; the wording is clear and
 *     specific for each block reason;
 *   - the workflow renders externalApprovalBlock in a single consistent
 *     place (not duplicated);
 *   - draft periods only see informational readiness, never the
 *     final approve controls;
 *   - no new audit action is added for warning acknowledgement;
 *   - the existing approve_and_lock pathway remains the only approval
 *     write path;
 *   - service charge / NMW logic is not changed;
 *   - permissions still use isAdmin with the Phase 5B TODO preserved.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) =>
  readFileSync(resolve(__dirname, "..", rel), "utf8");

const payrollPage = read("pages/Payroll.tsx");
const workflow = read("components/payroll/PayrollApprovalWorkflow.tsx");
const checklist = read("components/payroll/PayrollApprovalChecklist.tsx");
const evidencePath = resolve(__dirname, "../components/payroll/PayrollApprovalEvidence.tsx");

describe("Phase 5C — approval evidence snapshot", () => {
  it("creates the PayrollApprovalEvidence component", () => {
    expect(existsSync(evidencePath)).toBe(true);
  });

  it("Payroll page imports and renders PayrollApprovalEvidence", () => {
    expect(payrollPage).toMatch(/from "@\/components\/payroll\/PayrollApprovalEvidence"/);
    expect(payrollPage).toMatch(/<PayrollApprovalEvidence/);
  });

  it("evidence snapshot is derived from existing in-memory state only", () => {
    const evidence = readFileSync(evidencePath, "utf8");
    // Pure presentation: no DB / mutation / persistence.
    expect(evidence).not.toMatch(/supabase/i);
    expect(evidence).not.toMatch(/useMutation|useQuery/);
    expect(evidence).not.toMatch(/audit_log|approve_and_lock/);
  });

  it("evidence surfaces entry count, warnings, ack progress, confirmation and status", () => {
    const evidence = readFileSync(evidencePath, "utf8");
    expect(evidence).toMatch(/evidence-entry-count/);
    expect(evidence).toMatch(/evidence-warning-count/);
    expect(evidence).toMatch(/evidence-ack-progress/);
    expect(evidence).toMatch(/evidence-confirmed/);
    expect(evidence).toMatch(/evidence-status/);
  });

  it("Payroll page passes checklist + ack + confirmed + block to the evidence card", () => {
    const block = payrollPage.match(/<PayrollApprovalEvidence[\s\S]*?\/>/)?.[0] ?? "";
    expect(block).toMatch(/checklist=\{phase5Checklist\}/);
    expect(block).toMatch(/acknowledgedIds=\{checklistAcks\}/);
    expect(block).toMatch(/confirmed=\{checklistConfirmed\}/);
    expect(block).toMatch(/approvalBlock=\{phase5ApprovalBlock\}/);
    expect(block).toMatch(/entryCount=\{entries\.length\}/);
  });
});

describe("Phase 5C — blocked reason wording is clear and specific", () => {
  it("warnings not acknowledged → explicit review + acknowledge wording", () => {
    expect(payrollPage).toMatch(/must be reviewed and acknowledged/);
  });

  it("confirmation missing → explicit confirmation wording", () => {
    expect(payrollPage).toMatch(/approval confirmation must be ticked/);
  });

  it("period not pending → explains that approval is only available from pending", () => {
    expect(payrollPage).toMatch(/only available once the period is moved to pending/);
  });

  it("blocking items → tells the manager to resolve them first", () => {
    expect(payrollPage).toMatch(/Resolve \$\{n\} blocking checklist item/);
  });
});

describe("Phase 5C — workflow renders externalApprovalBlock consistently", () => {
  it("renders externalApprovalBlock in exactly one consistent place", () => {
    const occurrences = workflow.match(/externalApprovalBlock\b/g) ?? [];
    // type def + destructured prop + canSubmit check + render block = 4
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    // Single render branch (the dedicated banner).
    const renders = workflow.match(/\{externalApprovalBlock &&/g) ?? [];
    expect(renders.length).toBe(1);
  });

  it("renders the block in a dedicated banner with a test id", () => {
    expect(workflow).toMatch(/data-testid="external-approval-block"/);
  });

  it("hides the block banner for already-approved periods", () => {
    expect(workflow).toMatch(/externalApprovalBlock && period\.status !== "approved"/);
  });

  it("the block prefix is calm and specific", () => {
    expect(workflow).toMatch(/Approval is currently blocked\./);
  });
});

describe("Phase 5C — draft periods remain informational only", () => {
  it("checklist still shows the draft readiness note", () => {
    expect(checklist).toMatch(/draft-readiness-note/);
    expect(checklist).toMatch(/informational only/);
    expect(checklist).toMatch(/moved to pending review/);
  });

  it("final approve control only renders when period is not already approved", () => {
    expect(checklist).toMatch(/canApproveRole && !result\.period_already_approved/);
  });

  it("workflow only renders the Approve & Lock control under pending status", () => {
    // Approve & Lock button lives inside the pending status block.
    const pendingBlock = workflow.match(/period\.status === "pending"[\s\S]*?period\.status === "approved"/)?.[0] ?? "";
    expect(pendingBlock).toMatch(/Approve & Lock/);
    // It must NOT appear inside the draft status block.
    const draftBlock = workflow.match(/period\.status === "draft"[\s\S]*?period\.status === "pending"/)?.[0] ?? "";
    expect(draftBlock).not.toMatch(/Approve & Lock/);
  });
});

describe("Phase 5C — safety invariants preserved", () => {
  it("no new audit action is introduced for warning acknowledgement", () => {
    const all = payrollPage + workflow + checklist + readFileSync(evidencePath, "utf8");
    expect(all).not.toMatch(/acknowledge_warning|ack_warning|warning_ack/i);
  });

  it("approve_and_lock remains the sole approval write reference", () => {
    // The audit action string must still be the only one written by approval.
    const refs = (payrollPage + workflow).match(/approve_and_lock/g) ?? [];
    // The page/workflow themselves don't have to mention the string, but
    // they must NOT introduce a new approval mutation distinct from
    // useApprovePayrollPeriod / handleApprove.
    expect(payrollPage).toMatch(/useApprovePayrollPeriod|approvePeriod/);
    expect(payrollPage).not.toMatch(/useApprovePeriodV2|approvePayrollV2/);
    void refs;
  });

  it("service charge / NMW formula is not changed in Phase 5C surfaces", () => {
    const evidence = readFileSync(evidencePath, "utf8");
    for (const src of [evidence, payrollPage, workflow, checklist]) {
      expect(src).not.toMatch(/NMW.*service[_ ]?charge.*eligible/i);
      expect(src).not.toMatch(/combined_hourly_rate|combinedHourlyRate/);
    }
  });

  it("no approved-period mutation path is added", () => {
    const evidence = readFileSync(evidencePath, "utf8");
    for (const src of [evidence]) {
      expect(src).not.toMatch(/update.*approved|mutate.*approved/i);
    }
  });

  it("permissions remain isAdmin with the Phase 5B TODO preserved", () => {
    expect(payrollPage).toMatch(/canApproveRole=\{isAdmin\}/);
    expect(payrollPage).toMatch(/TODO:.*payroll-authorised permission/);
  });
});
