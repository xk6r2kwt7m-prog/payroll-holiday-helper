/**
 * Phase A — Payroll UX low-risk cleanup
 *
 * Verifies visible surface changes only:
 *   - Approval evidence merged into checklist as a compact footer (no standalone card)
 *   - Only one canonical "Approve & lock" action (in the checklist)
 *   - Standalone rate-discrepancy card removed from the Payroll page
 *   - Informational terms rows (no_active_terms, backfill_only) render neutral
 *   - Underlying rate-discrepancy detection preserved
 *   - Mobile admin actions collapse behind an "Actions" toggle
 *   - All admin actions remain reachable in DOM
 *
 * These tests intentionally read the source files rather than mount the app
 * so they run without a jsdom render pipeline for this codebase.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const payrollPage = read("src/pages/Payroll.tsx");
const checklist = read("src/components/payroll/PayrollApprovalChecklist.tsx");
const workflow = read("src/components/payroll/PayrollApprovalWorkflow.tsx");
const termsPanel = read("src/components/payroll/EmploymentTermsComparisonPanel.tsx");

describe("Phase A — approval evidence merged into checklist", () => {
  it("does not render the standalone PayrollApprovalEvidence card on the Payroll page", () => {
    // The JSX element must no longer be rendered by the page. The import may
    // remain for backwards compatibility with tests / re-use, but there must
    // be no <PayrollApprovalEvidence ... /> render site.
    expect(payrollPage).not.toMatch(/<PayrollApprovalEvidence[\s>]/);
  });

  it("passes an evidence prop into PayrollApprovalChecklist so the footer can render", () => {
    expect(payrollPage).toMatch(/<PayrollApprovalChecklist[\s\S]*?evidence=\{/);
  });

  it("checklist accepts an optional evidence prop and renders a compact footer", () => {
    expect(checklist).toMatch(/evidence\?:\s*PayrollApprovalEvidence/);
    expect(checklist).toMatch(/data-testid="approval-evidence-footer"/);
  });

  it("footer surfaces the required evidence fields (period, entries, warnings, confirmed)", () => {
    expect(checklist).toMatch(/evidence\.periodName/);
    expect(checklist).toMatch(/evidence\.payrollEntryCount/);
    expect(checklist).toMatch(/evidence\.warningCount/);
    expect(checklist).toMatch(/evidence\.approvalConfirmed/);
    expect(checklist).toMatch(/evidence\.approvalStatusLabel/);
  });
});

describe("Phase A — single canonical approve action", () => {
  it("keeps the Approve & lock button inside the checklist", () => {
    expect(checklist).toMatch(/Approve & lock period/);
  });

  it("removes the duplicate Approve & Lock button from PayrollApprovalWorkflow", () => {
    expect(workflow).not.toMatch(/Approve & Lock/);
    expect(workflow).not.toMatch(/onApprove\(\)/);
  });

  it("keeps Submit / Reopen / Delete controls in the workflow", () => {
    expect(workflow).toMatch(/Submit for Review/);
    expect(workflow).toMatch(/Reopen/);
    expect(workflow).toMatch(/Delete Period/);
  });
});

describe("Phase A — duplicate rate discrepancy card removed", () => {
  it("removes the standalone rate discrepancy card from the Payroll page", () => {
    expect(payrollPage).not.toMatch(/Rate Discrepancy Warning/);
    expect(payrollPage).not.toMatch(/payroll-rate-discrepancies/);
  });

  it("preserves the underlying detection variable used elsewhere", () => {
    // The rateDiscrepancies computation must still exist so other surfaces
    // (checklist / terms panel / row-level warnings) can consume it.
    expect(payrollPage).toMatch(/rateDiscrepancies/);
  });
});

describe("Phase A — informational terms rows are visually neutral", () => {
  it("renders 'No active terms' status badge with neutral (muted) styling", () => {
    // The neutral rendering uses text-muted-foreground / border-border and Info icon,
    // not warning tokens.
    const noActiveBlock = termsPanel.match(
      /row\.status === "no_active_terms"[\s\S]*?return \([\s\S]*?<\/Badge>/,
    );
    expect(noActiveBlock, "no_active_terms status badge block").not.toBeNull();
    const src = noActiveBlock![0];
    expect(src).toMatch(/text-muted-foreground/);
    expect(src).not.toMatch(/text-warning/);
  });

  it("renders 'Backfill only' status badge with neutral styling", () => {
    const backfillBlock = termsPanel.match(
      /row\.status === "backfill_only"[\s\S]*?return \([\s\S]*?<\/Badge>/,
    );
    expect(backfillBlock, "backfill_only status badge block").not.toBeNull();
    expect(backfillBlock![0]).toMatch(/text-muted-foreground/);
    expect(backfillBlock![0]).not.toMatch(/text-warning/);
  });

  it("only rate/department mismatches drive the amber headline", () => {
    // The updated headline logic keys off hasDrift = rate_mismatch OR department_mismatch,
    // not no_active_terms.
    expect(termsPanel).toMatch(
      /hasDrift\s*=\s*summary\.rate_mismatch\s*>\s*0\s*\|\|\s*summary\.department_mismatch\s*>\s*0/,
    );
  });

  it("keeps rate_mismatch as an amber (blocker-adjacent) badge", () => {
    const mismatchBlock = termsPanel.match(
      /row\.status === "rate_mismatch"[\s\S]*?<\/Badge>/,
    );
    expect(mismatchBlock, "rate_mismatch status badge block").not.toBeNull();
    expect(mismatchBlock![0]).toMatch(/text-warning/);
  });
});

describe("Phase A — mobile admin actions menu", () => {
  it("wraps admin actions in a toggleable container with an Actions toggle", () => {
    expect(payrollPage).toMatch(/data-testid="mobile-actions-toggle"/);
    expect(payrollPage).toMatch(/data-testid="payroll-admin-actions-list"/);
    expect(payrollPage).toMatch(/mobileActionsOpen/);
  });

  it("keeps every admin action reachable in the DOM (not removed)", () => {
    // All original action components must still be rendered inside the actions list.
    expect(payrollPage).toMatch(/<SettleLeaverDialog\s*\/>/);
    expect(payrollPage).toMatch(/<AddHolidayPaymentDialog\s*\/>/);
    expect(payrollPage).toMatch(/<CreatePayrollDialog\s*\/>/);
    expect(payrollPage).toMatch(/<ImportPayrollDialog\b/);
    expect(payrollPage).toMatch(/Saved aliases/);
  });

  it("shows the full row from sm: breakpoint upward (not permanently hidden)", () => {
    // The list container must include an sm:flex class so desktop users
    // still see the full action row.
    expect(payrollPage).toMatch(/sm:flex/);
  });
});

describe("Phase A — logic surfaces unchanged", () => {
  it("does not alter the approve write path (still calls handleApprove via checklist)", () => {
    expect(payrollPage).toMatch(/onApproveRequested=\{handleApprove\}/);
  });

  it("does not remove NMW / employment terms / holiday sections", () => {
    expect(payrollPage).toMatch(/<MinimumWageCompliancePanel/);
    expect(payrollPage).toMatch(/<EmploymentTermsComparisonPanel/);
    expect(payrollPage).toMatch(/<PayrollHolidaySection/);
  });

  it("does not touch payroll calculation or import matching logic imports", () => {
    // Sanity check: the page still imports the calculation / matching seams.
    expect(payrollPage).toMatch(/usePayrollMinimumWageCheck/);
    expect(payrollPage).toMatch(/useEmploymentTermsComparison/);
  });
});
