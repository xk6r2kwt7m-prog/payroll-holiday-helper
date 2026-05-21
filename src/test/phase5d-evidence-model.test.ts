/**
 * Phase 5D — Approval evidence model + helper tests.
 *
 * Covers:
 *   - pure helper produces the correct evidence for each status
 *     (draft / blocked / warnings-not-ack / confirmation-missing /
 *      ready / locked / already-approved)
 *   - the component renders from the evidence model and stays purely
 *     presentational (no logic, no Supabase, no mutation, no audit)
 *   - existing safety invariants are intact: NMW/SC unchanged, single
 *     approval write path, permissions still gated by isAdmin, TODO
 *     preserved.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPayrollApprovalEvidence,
  APPROVAL_EVIDENCE_STATUS_LABEL,
  type PayrollApprovalEvidenceInput,
} from "@/lib/payroll-approval-evidence";
import type { ApprovalChecklistResult } from "@/lib/payroll-approval-checklist";

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");
const payrollPage = read("pages/Payroll.tsx");
const evidenceComponent = read("components/payroll/PayrollApprovalEvidence.tsx");
const evidenceLib = read("lib/payroll-approval-evidence.ts");

const FIXED_NOW = new Date("2026-05-21T10:00:00Z");

function checklist(overrides: Partial<ApprovalChecklistResult> = {}): ApprovalChecklistResult {
  return {
    items: [],
    blocking_count: 0,
    warning_count: 0,
    ack_required_ids: [],
    period_already_approved: false,
    ...overrides,
  };
}

function input(
  overrides: Partial<PayrollApprovalEvidenceInput> = {},
): PayrollApprovalEvidenceInput {
  return {
    period: {
      id: "p1",
      period_name: "Week 21 2026",
      status: "pending",
      start_date: "2026-05-18",
      end_date: "2026-05-24",
    },
    payrollEntryCount: 12,
    checklist: checklist(),
    acknowledgedIds: new Set<string>(),
    approvalConfirmed: true,
    approvalBlockedReason: null,
    now: FIXED_NOW,
    ...overrides,
  };
}

describe("Phase 5D — buildPayrollApprovalEvidence (pure helper)", () => {
  it("returns draft_readiness_only for draft periods", () => {
    const e = buildPayrollApprovalEvidence(
      input({ period: { ...input().period, status: "draft" } }),
    );
    expect(e.approvalStatus).toBe("draft_readiness_only");
    expect(e.approvalStatusLabel).toBe(APPROVAL_EVIDENCE_STATUS_LABEL.draft_readiness_only);
  });

  it("returns blocked when an external approval block reason is provided", () => {
    const e = buildPayrollApprovalEvidence(
      input({ approvalBlockedReason: "Something to fix" }),
    );
    expect(e.approvalBlocked).toBe(true);
    expect(e.approvalStatus).toBe("blocked");
    expect(e.approvalBlockedReason).toBe("Something to fix");
  });

  it("treats unacknowledged warnings as blocked (via reason from parent)", () => {
    const e = buildPayrollApprovalEvidence(
      input({
        checklist: checklist({
          warning_count: 2,
          ack_required_ids: ["a", "b"],
        }),
        acknowledgedIds: new Set(["a"]),
        approvalBlockedReason:
          "Warnings on the approval checklist must be reviewed and acknowledged before approval.",
      }),
    );
    expect(e.warningCount).toBe(2);
    expect(e.acknowledgementsRequired).toBe(2);
    expect(e.acknowledgedWarningCount).toBe(1);
    expect(e.warningsAcknowledged).toBe(false);
    expect(e.approvalStatus).toBe("blocked");
  });

  it("treats missing confirmation as blocked (via reason from parent)", () => {
    const e = buildPayrollApprovalEvidence(
      input({
        approvalConfirmed: false,
        approvalBlockedReason:
          "The approval confirmation must be ticked on the checklist before approval.",
      }),
    );
    expect(e.approvalConfirmed).toBe(false);
    expect(e.approvalStatus).toBe("blocked");
  });

  it("returns ready_for_approval when pending, no block, warnings acked, confirmed", () => {
    const e = buildPayrollApprovalEvidence(
      input({
        checklist: checklist({
          warning_count: 1,
          ack_required_ids: ["x"],
        }),
        acknowledgedIds: new Set(["x"]),
        approvalConfirmed: true,
        approvalBlockedReason: null,
      }),
    );
    expect(e.warningsAcknowledged).toBe(true);
    expect(e.approvalBlocked).toBe(false);
    expect(e.approvalStatus).toBe("ready_for_approval");
  });

  it("returns locked for approved periods", () => {
    const e = buildPayrollApprovalEvidence(
      input({ period: { ...input().period, status: "approved" } }),
    );
    expect(e.approvalStatus).toBe("locked");
  });

  it("returns locked when checklist marks the period already approved", () => {
    const e = buildPayrollApprovalEvidence(
      input({ checklist: checklist({ period_already_approved: true }) }),
    );
    expect(e.approvalStatus).toBe("locked");
  });

  it("treats warningsAcknowledged as true when there are no ack-required items", () => {
    const e = buildPayrollApprovalEvidence(input());
    expect(e.acknowledgementsRequired).toBe(0);
    expect(e.warningsAcknowledged).toBe(true);
  });

  it("preserves period identity, entry count and date range", () => {
    const e = buildPayrollApprovalEvidence(input());
    expect(e.periodId).toBe("p1");
    expect(e.periodName).toBe("Week 21 2026");
    expect(e.payrollEntryCount).toBe(12);
    expect(e.periodDateRange).toMatch(/May/);
  });

  it("returns null date range when dates are missing", () => {
    const e = buildPayrollApprovalEvidence(
      input({
        period: { id: "p2", period_name: "Ad-hoc", status: "pending" },
      }),
    );
    expect(e.periodDateRange).toBeNull();
  });

  it("produces a UI-only generatedAtDisplay from the injected clock", () => {
    const e = buildPayrollApprovalEvidence(input({ now: FIXED_NOW }));
    expect(typeof e.generatedAtDisplay).toBe("string");
    expect(e.generatedAtDisplay.length).toBeGreaterThan(0);
  });
});

describe("Phase 5D — evidence model & helper purity", () => {
  it("library has no React / Supabase / mutation imports", () => {
    expect(evidenceLib).not.toMatch(/from ["']react["']/);
    expect(evidenceLib).not.toMatch(/from ["'][^"']*supabase/i);
    expect(evidenceLib).not.toMatch(/useMutation|useQuery|useState|useEffect/);
    expect(evidenceLib).not.toMatch(/audit_log/);
  });


  it("contains the future-persistence TODO and explicit non-implementation note", () => {
    expect(evidenceLib).toMatch(/TODO/);
    expect(evidenceLib).toMatch(/immutable/i);
    expect(evidenceLib).toMatch(/INTENTIONALLY NOT/i);
  });
});

describe("Phase 5D — PayrollApprovalEvidence component is presentational", () => {
  it("accepts a single `evidence` prop typed as the model", () => {
    expect(evidenceComponent).toMatch(/interface Props \{\s*evidence: Evidence;?\s*\}/);
    expect(evidenceComponent).toMatch(/from "@\/lib\/payroll-approval-evidence"/);
  });

  it("contains no Supabase / mutation / audit / permission logic", () => {
    expect(evidenceComponent).not.toMatch(/supabase/i);
    expect(evidenceComponent).not.toMatch(/useMutation|useQuery/);
    expect(evidenceComponent).not.toMatch(/audit_log|approve_and_lock/);
    expect(evidenceComponent).not.toMatch(/isAdmin|canApprove/);
  });

  it("renders the four key fields from the evidence model", () => {
    expect(evidenceComponent).toMatch(/evidence-entry-count/);
    expect(evidenceComponent).toMatch(/evidence-warning-count/);
    expect(evidenceComponent).toMatch(/evidence-ack-progress/);
    expect(evidenceComponent).toMatch(/evidence-confirmed/);
    expect(evidenceComponent).toMatch(/evidence-status-label/);
  });
});

describe("Phase 5D — Payroll page wires the helper into the component", () => {
  it("imports buildPayrollApprovalEvidence", () => {
    expect(payrollPage).toMatch(/from "@\/lib\/payroll-approval-evidence"/);
    expect(payrollPage).toMatch(/buildPayrollApprovalEvidence\(/);
  });

  it("passes the built evidence object as a single prop", () => {
    const block = payrollPage.match(/<PayrollApprovalEvidence[\s\S]*?\/>/)?.[0] ?? "";
    expect(block).toMatch(/evidence=\{buildPayrollApprovalEvidence\(/);
  });
});

describe("Phase 5D — safety invariants preserved", () => {
  it("does not change service-charge / NMW logic in Phase 5D surfaces", () => {
    for (const src of [evidenceLib, evidenceComponent]) {
      expect(src).not.toMatch(/NMW.*service[_ ]?charge.*eligible/i);
      expect(src).not.toMatch(/combined_hourly_rate|combinedHourlyRate/);
    }
  });

  it("does not introduce a new audit action", () => {
    const all = evidenceLib + evidenceComponent;
    expect(all).not.toMatch(/acknowledge_warning|ack_warning|warning_ack/i);
  });

  it("approve_and_lock / useApprovePayrollPeriod remains the only approval write path", () => {
    expect(payrollPage).toMatch(/useApprovePayrollPeriod|approvePeriod/);
    expect(payrollPage).not.toMatch(/useApprovePeriodV2|approvePayrollV2/);
  });

  it("permissions remain isAdmin with the Phase 5B TODO preserved", () => {
    expect(payrollPage).toMatch(/canApproveRole=\{isAdmin\}/);
    expect(payrollPage).toMatch(/TODO:.*payroll-authorised permission/);
  });
});
