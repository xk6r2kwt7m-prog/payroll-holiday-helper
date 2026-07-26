/**
 * Phase B — Payroll page UX polish (severity grouping + collapsibles).
 *
 * These tests focus on the pure derivation and the small presentational
 * components introduced in Phase B. Payroll calculations, NMW, service
 * charge, holiday, import matching, approval writes, audit, notes and PDF
 * logic are NOT touched by Phase B and are covered elsewhere.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // pass items must never appear as blockers or warnings
    expect(r.blockers.concat(r.warnings).find((x) => x.id.endsWith("sc_diagnostic"))).toBeUndefined();
    expect(r.ready).toBe(false);
  });

  it("does not duplicate NMW when the checklist already reported it as a blocker", () => {
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
            count: 1,
            affected_employee_ids: [],
          },
        ],
      }),
      importBlockingIssueCount: 0,
      nmwBlockerCount: 1,
    });
    expect(r.blockers.filter((b) => b.title.toLowerCase().includes("nmw") || b.title.toLowerCase().includes("minimum wage")).length).toBe(1);
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

describe("Phase B — PayrollStatusBar", () => {
  it("renders period, status, employees, totals and counts", () => {
    render(
      <PayrollStatusBar
        periodName="June 2026"
        statusLabel="Draft"
        statusTone="draft"
        employeeCount={42}
        totalPay={12345}
        holidayTotal={678}
        blockerCount={2}
        warningCount={3}
        ready={false}
      />,
    );
    expect(screen.getByTestId("payroll-status-bar")).toBeInTheDocument();
    expect(screen.getByTestId("status-bar-period").textContent).toContain("June 2026");
    expect(screen.getByTestId("status-bar-status").textContent).toContain("Draft");
    expect(screen.getByTestId("status-bar-employees").textContent).toContain("42");
    expect(screen.getByTestId("status-bar-total").textContent).toMatch(/12,345|12345/);
    expect(screen.getByTestId("status-bar-blockers").textContent).toContain("2");
    expect(screen.getByTestId("status-bar-warnings").textContent).toContain("3");
    expect(screen.getByTestId("status-bar-ready").textContent).toContain("Not ready");
  });

  it("shows Ready when there are no blockers", () => {
    render(
      <PayrollStatusBar
        periodName="July 2026"
        statusLabel="Pending"
        statusTone="pending"
        employeeCount={10}
        totalPay={1000}
        holidayTotal={0}
        blockerCount={0}
        warningCount={0}
        ready={true}
      />,
    );
    expect(screen.getByTestId("status-bar-ready").textContent).toContain("Ready");
  });
});

describe("Phase B — PayrollActionRequired", () => {
  it("shows the 'no blocking issues found' message when empty", () => {
    render(<PayrollActionRequired items={[]} />);
    expect(screen.getByTestId("action-required-empty").textContent).toBe("No blocking issues found.");
    expect(screen.getByTestId("payroll-action-required").getAttribute("data-has-blockers")).toBe("false");
  });

  it("lists blockers with title and count", () => {
    render(
      <PayrollActionRequired
        items={[
          { id: "a", title: "NMW breach", detail: "1 below rate", count: 1 },
          { id: "b", title: "SC paid to ineligible", count: 2 },
        ]}
      />,
    );
    expect(screen.getByTestId("action-required-item-a").textContent).toContain("NMW breach");
    expect(screen.getByTestId("action-required-item-b").textContent).toContain("SC paid to ineligible");
    expect(screen.getByTestId("payroll-action-required").getAttribute("data-has-blockers")).toBe("true");
  });
});

describe("Phase B — PayrollReviewAcknowledge", () => {
  it("shows empty state when no warnings", () => {
    render(<PayrollReviewAcknowledge items={[]} />);
    expect(screen.getByTestId("review-empty")).toBeInTheDocument();
  });

  it("renders warnings but never as blockers", () => {
    render(
      <PayrollReviewAcknowledge
        items={[{ id: "rate", title: "Pay rate changes vs previous period", count: 3 }]}
      />,
    );
    expect(screen.getByTestId("review-item-rate").textContent).toContain("Pay rate changes");
    // Warnings panel is distinct from the blockers panel.
    expect(screen.queryByTestId("payroll-action-required")).toBeNull();
  });
});

describe("Phase B — CollapsibleSection", () => {
  it("defaults to collapsed and reveals content on click", () => {
    render(
      <CollapsibleSection title="Holiday pay" defaultOpen={false} testId="col-holiday">
        <div data-testid="holiday-content">holiday inner</div>
      </CollapsibleSection>,
    );
    const wrapper = screen.getByTestId("col-holiday");
    expect(wrapper.getAttribute("data-open")).toBe("false");
    // Content is hidden by radix (data-state=closed).
    const button = wrapper.querySelector("button")!;
    fireEvent.click(button);
    expect(wrapper.getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("holiday-content")).toBeInTheDocument();
  });

  it("renders summary count and badge label in the header", () => {
    render(
      <CollapsibleSection
        title="Period notes"
        count={4}
        badge={{ label: "1 on PDF", tone: "neutral" }}
        testId="col-notes"
      >
        <div>inner</div>
      </CollapsibleSection>,
    );
    const header = screen.getByTestId("col-notes");
    expect(header.textContent).toContain("Period notes");
    expect(header.textContent).toContain("(4)");
    expect(header.textContent).toContain("1 on PDF");
  });
});
