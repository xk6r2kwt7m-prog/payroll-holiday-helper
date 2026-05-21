/**
 * Phase 5A — Wiring tests for the live payroll approval flow.
 *
 * These tests assert at source-level that:
 *   - the Payroll page imports and renders PayrollApprovalChecklist
 *   - the checklist drives the workflow's external approval gate
 *   - the existing useApprovePayrollPeriod / handleApprove flow is the
 *     ONLY approval pathway (no second mutation was introduced)
 *   - manual adjustments are wired via usePayrollAdjustments
 *
 * Source-level checks are deliberate: rendering the full Payroll page
 * requires Supabase + React-Query + Auth context, which is far heavier
 * than needed to prove the wiring contract is in place.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const payrollPage = readFileSync(
  resolve(__dirname, "../pages/Payroll.tsx"),
  "utf8",
);
const workflow = readFileSync(
  resolve(__dirname, "../components/payroll/PayrollApprovalWorkflow.tsx"),
  "utf8",
);
const checklist = readFileSync(
  resolve(__dirname, "../components/payroll/PayrollApprovalChecklist.tsx"),
  "utf8",
);

describe("Phase 5A — checklist wired into Payroll page", () => {
  it("imports PayrollApprovalChecklist and its supporting utilities", () => {
    expect(payrollPage).toMatch(/from "@\/components\/payroll\/PayrollApprovalChecklist"/);
    expect(payrollPage).toMatch(/from "@\/lib\/payroll-approval-checklist"/);
    expect(payrollPage).toMatch(/from "@\/lib\/labour-reporting"/);
  });

  it("renders PayrollApprovalChecklist with the live period and entries", () => {
    expect(payrollPage).toMatch(/<PayrollApprovalChecklist/);
    expect(payrollPage).toMatch(/period_status=\{selectedPeriod\.status\}/);
    expect(payrollPage).toMatch(/entries=\{phase5Report\.entries\}/);
  });

  it("wires canApproveRole to the existing isAdmin permission", () => {
    expect(payrollPage).toMatch(/canApproveRole=\{isAdmin\}/);
  });

  it("routes onApproveRequested to the existing handleApprove mutation", () => {
    expect(payrollPage).toMatch(/onApproveRequested=\{handleApprove\}/);
  });

  it("wires manual adjustments from usePayrollAdjustments", () => {
    expect(payrollPage).toMatch(/usePayrollAdjustments/);
    expect(payrollPage).toMatch(/manualAdjustmentsByEntryId=\{manualAdjustmentsByEntryId\}/);
  });

  it("passes the checklist-derived block to PayrollApprovalWorkflow", () => {
    expect(payrollPage).toMatch(/externalApprovalBlock=\{phase5ApprovalBlock\}/);
  });
});

describe("Phase 5A — workflow honours external approval gate", () => {
  it("accepts an externalApprovalBlock prop", () => {
    expect(workflow).toMatch(/externalApprovalBlock\??:\s*string \| null/);
  });

  it("combines the external block into canSubmitOrApprove", () => {
    expect(workflow).toMatch(/canSubmitOrApprove[^\n]*!externalApprovalBlock/);
  });

  it("renders the external block reason when set", () => {
    expect(workflow).toMatch(/externalApprovalBlock && \(/);
  });
});

describe("Phase 5A — single approval pathway preserved", () => {
  it("Payroll page still uses useApprovePayrollPeriod (existing mutation)", () => {
    expect(payrollPage).toMatch(/useApprovePayrollPeriod/);
  });

  it("does not introduce a duplicate approve_and_lock audit write", () => {
    // The single approve_and_lock audit write lives in usePayroll.ts.
    expect(payrollPage).not.toMatch(/approve_and_lock/);
    expect(checklist).not.toMatch(/approve_and_lock/);
    expect(workflow).not.toMatch(/approve_and_lock/);
  });

  it("checklist does not write to supabase directly", () => {
    expect(checklist).not.toMatch(/supabase\./);
  });
});

describe("Phase 5A — gating rules", () => {
  it("approved periods never expose an active approve button on the checklist", () => {
    // Component branches: `canApproveRole && !result.period_already_approved`
    expect(checklist).toMatch(/!result\.period_already_approved/);
  });

  it("approval requires confirmation + canApprove on the checklist", () => {
    expect(checklist).toMatch(/confirmed && canApprove\(result, acks\)/);
  });

  it("non-permitted users see the no-permission notice", () => {
    expect(checklist).toMatch(/do not have permission to approve/);
  });
});
