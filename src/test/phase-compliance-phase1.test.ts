import { describe, it, expect } from "vitest";
import {
  isAvailableToStaff, needsApprovalDecision, requirementLabel, approvalLabel,
  REQUIREMENT_CLASSIFICATIONS, APPROVAL_STATUSES,
} from "@/lib/compliance-document-fields";
import { diffFields, derivedEvents, auditActionForEvent } from "@/lib/compliance-audit-events";
import { branchIdFor } from "@/hooks/useComplianceBranches";

describe("Compliance Phase 1 — document availability", () => {
  it("keeps drafts away from staff", () => {
    expect(isAvailableToStaff({ status: "active", approval_status: "draft" })).toBe(false);
  });

  it("never sends rejected documents", () => {
    expect(isAvailableToStaff({ status: "active", approval_status: "rejected" })).toBe(false);
  });

  it("sends approved documents", () => {
    expect(isAvailableToStaff({ status: "active", approval_status: "approved" })).toBe(true);
  });

  it("never sends archived documents", () => {
    expect(isAvailableToStaff({ status: "archived", approval_status: "approved" })).toBe(false);
  });

  it("asks for a decision on drafts and awaiting approval only", () => {
    expect(needsApprovalDecision({ status: "active", approval_status: "draft" })).toBe(true);
    expect(needsApprovalDecision({ status: "active", approval_status: "awaiting_approval" })).toBe(true);
    expect(needsApprovalDecision({ status: "active", approval_status: "approved" })).toBe(false);
    expect(needsApprovalDecision({ status: "archived", approval_status: "draft" })).toBe(false);
  });

  it("labels every classification and status in plain English", () => {
    REQUIREMENT_CLASSIFICATIONS.forEach(r => expect(requirementLabel(r.value)).toBe(r.label));
    APPROVAL_STATUSES.forEach(s => expect(approvalLabel(s.value)).toBe(s.label));
  });
});

describe("Compliance Phase 1 — audit trail", () => {
  it("records the previous and new value of every changed field", () => {
    const changes = diffFields({ expires_at: "2026-01-01" }, { expires_at: "2027-01-01" });
    expect(changes).toHaveLength(1);
    expect(changes[0].previous).toBe("2026-01-01");
    expect(changes[0].next).toBe("2027-01-01");
  });

  it("ignores fields that did not change", () => {
    expect(diffFields({ name: "Fire policy" }, { name: "Fire policy" })).toHaveLength(0);
  });

  it("names branch, role and date changes as their own events", () => {
    expect(derivedEvents(diffFields({ branches: ["Carnaby"] }, { branches: ["Brixton"] })))
      .toContain("branch_assignment_changed");
    expect(derivedEvents(diffFields({ roles: ["Chef"] }, { roles: ["Bar"] })))
      .toContain("role_assignment_changed");
    expect(derivedEvents(diffFields({ review_date: null }, { review_date: "2027-01-01" })))
      .toContain("expiry_or_review_date_changed");
  });

  it("maps approval events to approve and reject actions", () => {
    expect(auditActionForEvent("document_approved")).toBe("approve");
    expect(auditActionForEvent("document_rejected")).toBe("reject");
    expect(auditActionForEvent("document_created")).toBe("create");
  });
});

describe("Compliance Phase 1 — branch selection", () => {
  const options = [
    { id: "a", branch: "Carnaby", display_name: "Carnaby", needs_review: false, review_note: null },
    { id: "b", branch: "Fitzrovia", display_name: "Fitzrovia", needs_review: false, review_note: null },
  ] as any[];

  it("matches a branch name regardless of case or spacing", () => {
    expect(branchIdFor(options, " carnaby ")).toBe("a");
  });

  it("returns nothing for an unknown branch instead of inventing one", () => {
    expect(branchIdFor(options, "Camden")).toBeNull();
  });
});
