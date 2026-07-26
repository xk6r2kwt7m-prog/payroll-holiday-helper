/**
 * Phase B — Payroll page UX polish (severity grouping + collapsibles).
 *
 * Pure-logic and static-render tests. Payroll calculations, NMW, service
 * charge, holiday, import matching, approval writes, audit, notes and PDF
 * logic are NOT touched by Phase B and are covered elsewhere.
 */
import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { derivePayrollPageSeverity } from "@/lib/payroll-page-severity";
import type { ApprovalChecklistResult } from "@/lib/payroll-approval-checklist";
import { PayrollStatusBar } from "@/components/payroll/PayrollStatusBar";
import { PayrollActionRequired } from "@/components/payroll/PayrollActionRequired";
import { PayrollReviewAcknowledge } from "@/components/payroll/PayrollReviewAcknowledge";
import { CollapsibleSection } from "@/components/payroll/CollapsibleSection";

function makeChecklist(overrides: Partial<ApprovalChecklistResult> = {}): ApprovalChecklistResult {
  return {
    items: [],
    blocking_count: 0,
    warning_count: 0,
    ack_required_ids: [],
    period_already_approved: false,
    ...overrides,
  };
}

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("Phase B — derivePayrollPageSeverity", () => {
  it("returns ready=true and empty groups when nothing is flagged", () => {
    const r = derivePayrollPageSeverity({
      checklist: makeChecklist(),
      importBlockingIssueCount: 0,
      nmwBlockerCount: 0,
    });
    expect(r.ready).toBe(true);
    expect(r.blockerCount).toBe(0);
    expect(r.warningCount).toBe(0);
    expect(r.blockers).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("promotes unresolved import issues to a blocker", () => {
    const r = derivePayrollPageSeverity({
      checklist: makeChecklist(),
      importBlockingIssueCount: 3,
      nmwBlockerCount: 0,
    });
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.id === "import_unresolved" && b.count === 3)).toBe(true);
  });

  it("splits checklist items into blockers and warnings", () => {
    const r = derivePayrollPageSeverity({
      checklist: makeChecklist({
        items: [
          {
            id: "nmw_non_compliant",
            status: "block",
            blocking: true,
            requires_ack: false,
            title: "NMW",
            detail: "",
            count: 2,
            affected_employee_ids: [],
          },
          {
            id: "profile_fallback",
            status: "warning",
            blocking: false,
            requires_ack: true,
            title: "Profile fallback",
            detail: "",
            count: 4,
            affected_employee_ids: [],
          },
          {
            id: "sc_diagnostic",
            status: "pass",
            blocking: false,
            requires_ack: false,
            title: "SC",
            detail: "",
            count: 0,
            affected_employee_ids: [],
          },
        ],
      }),
      importBlockingIssueCount: 0,
      nmwBlockerCount: 0,
    });
    expect(r.blockers.map((b) => b.id)).toEqual(["checklist_nmw_non_compliant"]);
    expect(r.warnings.map((w) => w.id)).toEqual(["checklist_profile_fallback"]);
    expect(r.blockers.concat(r.warnings).find((x) => x.id.endsWith("sc_diagnostic"))).toBeUndefined();
    expect(r.ready).toBe(false);
  });

  it("does not duplicate NMW when checklist already reports it as a blocker", () => {
    const r = derivePayrollPageSeverity({
      checklist: makeChecklist({
        items: [
          {
            id: "nmw_non_compliant",
            status: "block",
            blocking: true,
            requires_ack: false,
            title: "Below NMW",
            detail: "",
            count: 1,
            affected_employee_ids: [],
          },
        ],
      }),
      importBlockingIssueCount: 0,
      nmwBlockerCount: 1,
    });
    expect(r.blockers.filter((b) => b.id === "nmw_blocker").length).toBe(0);
    expect(r.blockers.length).toBe(1);
  });

  it("adds standalone NMW blocker when checklist has not been built yet", () => {
    const r = derivePayrollPageSeverity({
      checklist: null,
      importBlockingIssueCount: 0,
      nmwBlockerCount: 2,
    });
    expect(r.blockers.some((b) => b.id === "nmw_blocker")).toBe(true);
    expect(r.ready).toBe(false);
  });
});

describe("Phase B — PayrollStatusBar (static render)", () => {
  it("renders period, status, employee count, totals and blocker/warning counts", () => {
    const out = html(
      React.createElement(PayrollStatusBar, {
        periodName: "June 2026",
        statusLabel: "Draft",
        statusTone: "draft",
        employeeCount: 42,
        totalPay: 12345,
        holidayTotal: 678,
        blockerCount: 2,
        warningCount: 3,
        ready: false,
        readyDetail: "Resolve 2 blocking checklist items before approval can proceed.",
      }),
    );
    expect(out).toContain("June 2026");
    expect(out).toContain("Draft");
    expect(out).toContain("42 employees");
    // Currency renders as £12,345.00 in en-GB locale but assert loosely.
    expect(out).toMatch(/12[,.]?345/);
    expect(out).toContain("2 blockers");
    expect(out).toContain("3 warnings");
    expect(out).toContain("Not ready");
    expect(out).toContain("Resolve 2 blocking");
  });

  it("shows Ready when there are no blockers", () => {
    const out = html(
      React.createElement(PayrollStatusBar, {
        periodName: "July 2026",
        statusLabel: "Pending",
        statusTone: "pending",
        employeeCount: 10,
        totalPay: 1000,
        holidayTotal: 0,
        blockerCount: 0,
        warningCount: 0,
        ready: true,
      }),
    );
    expect(out).toContain(">Ready<");
  });
});

describe("Phase B — PayrollActionRequired (static render)", () => {
  it("shows 'No blocking issues found.' when empty", () => {
    const out = html(React.createElement(PayrollActionRequired, { items: [] }));
    expect(out).toContain("No blocking issues found.");
    expect(out).toContain('data-has-blockers="false"');
  });

  it("lists blockers with their titles", () => {
    const out = html(
      React.createElement(PayrollActionRequired, {
        items: [
          { id: "a", title: "NMW breach", detail: "1 below rate", count: 1 },
          { id: "b", title: "SC paid to ineligible", count: 2 },
        ],
      }),
    );
    expect(out).toContain("NMW breach");
    expect(out).toContain("SC paid to ineligible");
    expect(out).toContain('data-has-blockers="true"');
  });
});

describe("Phase B — PayrollReviewAcknowledge (static render)", () => {
  it("shows empty state when no warnings", () => {
    const out = html(React.createElement(PayrollReviewAcknowledge, { items: [] }));
    expect(out).toContain("No warnings to acknowledge.");
    expect(out).toContain('data-has-warnings="false"');
  });

  it("renders warnings", () => {
    const out = html(
      React.createElement(PayrollReviewAcknowledge, {
        items: [{ id: "rate", title: "Pay rate changes vs previous period", count: 3 }],
      }),
    );
    expect(out).toContain("Pay rate changes vs previous period");
    expect(out).toContain('data-has-warnings="true"');
    // Warnings panel is a distinct testid from Action Required.
    expect(out).not.toContain('data-testid="payroll-action-required"');
  });
});

describe("Phase B — CollapsibleSection (static render)", () => {
  it("is collapsed by default with data-open=false", () => {
    const out = html(
      React.createElement(
        CollapsibleSection,
        { title: "Holiday pay", defaultOpen: false, testId: "col-holiday" },
        React.createElement("div", null, "inner"),
      ),
    );
    expect(out).toContain('data-testid="col-holiday"');
    expect(out).toContain('data-open="false"');
    expect(out).toContain("Holiday pay");
  });

  it("renders count and badge label in the header", () => {
    const out = html(
      React.createElement(
        CollapsibleSection,
        {
          title: "Period notes",
          count: 4,
          badge: { label: "1 on PDF", tone: "neutral" },
          testId: "col-notes",
        },
        React.createElement("div", null, "inner"),
      ),
    );
    expect(out).toContain("Period notes");
    expect(out).toContain("(4)");
    expect(out).toContain("1 on PDF");
  });

  it("opens when defaultOpen=true", () => {
    const out = html(
      React.createElement(
        CollapsibleSection,
        { title: "Sales & labour", defaultOpen: true, testId: "col-sales" },
        React.createElement("div", null, "inner"),
      ),
    );
    expect(out).toContain('data-open="true"');
  });
});
