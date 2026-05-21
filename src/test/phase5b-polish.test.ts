/**
 * Phase 5B — Polish pass for payroll approval wiring.
 *
 * Source-level checks (consistent with phase5a-wiring.test.ts) covering:
 *   - useMemo→useEffect ack/confirm reset on period switch
 *   - draft-period readiness explanation in the checklist UI
 *   - permission TODO marker for future payroll-authorised role
 *   - approval gate behaviour preserved (still pending-only)
 *   - no duplicate approve_and_lock audit event introduced
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const payrollPage = readFileSync(
  resolve(__dirname, "../pages/Payroll.tsx"),
  "utf8",
);
const checklist = readFileSync(
  resolve(__dirname, "../components/payroll/PayrollApprovalChecklist.tsx"),
  "utf8",
);

describe("Phase 5B — ack/confirm reset on period switch", () => {
  it("uses useEffect (not useMemo) to reset checklist state", () => {
    // The reset block must run as an effect keyed on selectedPeriod.id.
    const block =
      /useEffect\(\(\) => \{\s*setChecklistAcks\(new Set\(\)\);\s*setChecklistConfirmed\(false\);\s*\},\s*\[selectedPeriod\?\.id\]\);/;
    expect(payrollPage).toMatch(block);
  });

  it("imports useEffect from react", () => {
    expect(payrollPage).toMatch(/import \{[^}]*\buseEffect\b[^}]*\} from "react"/);
  });

  it("does not reset checklist state inside a useMemo", () => {
    expect(payrollPage).not.toMatch(
      /useMemo\(\(\) => \{\s*setChecklistAcks/,
    );
  });
});

describe("Phase 5B — draft-period readiness note", () => {
  it("renders explanatory note for draft periods", () => {
    expect(checklist).toMatch(/data-testid="draft-readiness-note"/);
    // Phase 5C polished the wording but preserved the meaning.
    expect(checklist).toMatch(/Draft readiness check/);
    expect(checklist).toMatch(/Final approval controls appear/);
    expect(checklist).toMatch(/pending(?: review)?/);
  });


  it("only shows the draft note for draft (non-approved) periods", () => {
    expect(checklist).toMatch(
      /input\.period_status === "draft" && !result\.period_already_approved/,
    );
  });
});

describe("Phase 5B — permission TODO marker", () => {
  it("notes the payroll-authorised permission migration near the prop wiring", () => {
    expect(payrollPage).toMatch(
      /TODO: replace isAdmin with payroll-authorised permission/,
    );
  });
});

describe("Phase 5B — approval gate behaviour preserved", () => {
  it("approval block remains pending-only", () => {
    expect(payrollPage).toMatch(
      /selectedPeriod\?\.status !== "pending"/,
    );
  });

  it("still passes externalApprovalBlock to the workflow", () => {
    expect(payrollPage).toMatch(/externalApprovalBlock=\{phase5ApprovalBlock\}/);
  });

  it("still routes onApproveRequested to the existing handleApprove", () => {
    expect(payrollPage).toMatch(/onApproveRequested=\{handleApprove\}/);
  });
});

describe("Phase 5B — single approval audit path preserved", () => {
  it("does not introduce another approve_and_lock audit write", () => {
    expect(payrollPage).not.toMatch(/approve_and_lock/);
    expect(checklist).not.toMatch(/approve_and_lock/);
  });

  it("checklist still does not write to supabase directly", () => {
    expect(checklist).not.toMatch(/supabase\./);
  });
});
