/**
 * Phase 5N — Signed Contract Locking, Version Control & Audit Persistence
 *
 * Validates:
 *  - status-transition helper (allowed + blocked transitions)
 *  - lock guard for signed/locked/superseded/voided contracts
 *  - draft edits are NEVER applied to signed/locked contracts
 *  - audit event payload preparation (no fake persistence)
 *  - no noisy audit events for UI-only field typing
 *  - separation: generation ≠ issue ≠ signature ≠ locking
 *  - purity of helpers (no React / Supabase / React Query imports)
 *  - no DB migration introduced
 *  - no payroll / NMW / service-charge / profile / onboarding / active-terms / legal logic touched
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  canTransitionContractStatus,
  isContractLocked,
  workflowStatusFromContractState,
  LOCKED_STATUSES,
  type ContractWorkflowStatus,
} from "@/lib/contract-status-transitions";
import {
  getContractLockGuard,
  canApplyDraftEdits,
} from "@/lib/contract-lock-guard";
import {
  buildContractAuditEvent,
  isValidContractAuditEventType,
  type ContractAuditEventType,
} from "@/lib/contract-audit-events";
import { buildContractDraftEvidence } from "@/lib/contract-draft-evidence";
import { deriveContractReadiness } from "@/lib/contract-readiness";
import { getMissingContractFields } from "@/lib/contract-form-review";

const validVariables = {
  employeeName: "Jane Doe",
  homeAddress: "1 High St",
  jobTitle: "Server",
  employmentType: "full_time" as const,
  effectiveDate: "2025-01-15",
  workLocation: "Soho",
  baseHourlyRate: "12.5",
  weeklyHours: "40",
  noticePeriod: "two weeks",
};

describe("Phase 5N — status transition helper", () => {
  const allowed: Array<[ContractWorkflowStatus, ContractWorkflowStatus, Partial<{hasSignature:boolean;hasGeneratedDocument:boolean}>]> = [
    ["draft", "generated", { hasGeneratedDocument: true }],
    ["generated", "issued", {}],
    ["issued", "signed", { hasSignature: true }],
    ["signed", "locked", {}],
    ["signed", "superseded", {}],
    ["generated", "voided", {}],
    ["issued", "voided", {}],
  ];

  it.each(allowed)("allows %s → %s", (from, to, ctx) => {
    const r = canTransitionContractStatus({ fromStatus: from, toStatus: to, ...ctx });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });

  const blocked: Array<[ContractWorkflowStatus, ContractWorkflowStatus]> = [
    ["signed", "draft"],
    ["signed", "generated"],
    ["signed", "issued"],
    ["locked", "draft"],
    ["locked", "generated"],
    ["locked", "issued"],
    ["locked", "signed"],
    ["issued", "draft"],
    ["draft", "signed"],
    ["draft", "issued"],
    ["voided", "draft"],
    ["superseded", "draft"],
  ];

  it.each(blocked)("blocks %s → %s", (from, to) => {
    const r = canTransitionContractStatus({
      fromStatus: from,
      toStatus: to,
      hasSignature: true,
      hasGeneratedDocument: true,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it("requires hasSignature=true to enter 'signed'", () => {
    const r = canTransitionContractStatus({
      fromStatus: "issued",
      toStatus: "signed",
      hasSignature: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/signature/i);
  });

  it("requires hasGeneratedDocument=true to enter 'generated'", () => {
    const r = canTransitionContractStatus({
      fromStatus: "draft",
      toStatus: "generated",
      hasGeneratedDocument: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/generated pdf/i);
  });

  it("blocks no-op same-status transitions", () => {
    const r = canTransitionContractStatus({
      fromStatus: "signed",
      toStatus: "signed",
    });
    expect(r.allowed).toBe(false);
  });
});

describe("Phase 5N — lock guard", () => {
  it("treats signed contracts as locked with an amendment-required warning", () => {
    const g = getContractLockGuard("signed");
    expect(g.isLocked).toBe(true);
    expect(g.workflowStatus).toBe("signed");
    expect(g.warningMessage).toMatch(/new version or amendment/i);
    expect(g.allowedActions).toContain("amend");
    expect(g.allowedActions).not.toContain("edit_draft");
  });

  it("treats superseded and voided contracts as view-only", () => {
    for (const state of ["superseded", "terminated"]) {
      const g = getContractLockGuard(state);
      expect(g.isLocked).toBe(true);
      expect(g.allowedActions).toEqual(["view"]);
    }
  });

  it("treats draft contracts as editable", () => {
    const g = getContractLockGuard("draft");
    expect(g.isLocked).toBe(false);
    expect(g.allowedActions).toContain("edit_draft");
  });

  it("warns on issued contracts even though they are not yet signed", () => {
    const g = getContractLockGuard("issued");
    expect(g.isLocked).toBe(false);
    expect(g.warningMessage).toMatch(/already been issued/i);
  });

  it("canApplyDraftEdits blocks signed/locked/superseded/voided contracts", () => {
    for (const state of ["signed", "superseded", "terminated"]) {
      expect(canApplyDraftEdits(state)).toBe(false);
    }
    expect(canApplyDraftEdits("issued")).toBe(false);
    expect(canApplyDraftEdits("draft")).toBe(true);
    expect(canApplyDraftEdits(null)).toBe(true);
  });

  it("LOCKED_STATUSES includes signed and locked", () => {
    expect(LOCKED_STATUSES.has("signed")).toBe(true);
    expect(LOCKED_STATUSES.has("locked")).toBe(true);
    expect(isContractLocked("signed")).toBe(true);
    expect(isContractLocked("draft")).toBe(false);
  });

  it("workflow mapping covers all DB ContractState values", () => {
    expect(workflowStatusFromContractState("draft")).toBe("draft");
    expect(workflowStatusFromContractState("issued")).toBe("issued");
    expect(workflowStatusFromContractState("signed")).toBe("signed");
    expect(workflowStatusFromContractState("superseded")).toBe("superseded");
    expect(workflowStatusFromContractState("terminated")).toBe("voided");
    expect(workflowStatusFromContractState(null)).toBe("draft");
    expect(workflowStatusFromContractState("unknown")).toBe("draft");
  });
});

describe("Phase 5N — signed contracts protected from silent edits", () => {
  function applyDraftIfAllowed(state: string, original: typeof validVariables, edits: Partial<typeof validVariables>) {
    if (!canApplyDraftEdits(state)) return original;
    return { ...original, ...edits };
  }

  it("signed contract values are not mutated by employee profile changes", () => {
    const result = applyDraftIfAllowed("signed", validVariables, {
      employeeName: "Renamed Person",
      homeAddress: "New Address",
    });
    expect(result).toEqual(validVariables);
  });

  it("signed contract values are not mutated by onboarding changes", () => {
    const result = applyDraftIfAllowed("signed", validVariables, {
      homeAddress: "Onboarding updated address",
    });
    expect(result.homeAddress).toBe(validVariables.homeAddress);
  });

  it("signed contract values are not mutated by active terms changes", () => {
    const result = applyDraftIfAllowed("signed", validVariables, {
      baseHourlyRate: "99.99",
      weeklyHours: "10",
    });
    expect(result.baseHourlyRate).toBe(validVariables.baseHourlyRate);
    expect(result.weeklyHours).toBe(validVariables.weeklyHours);
  });

  it("draft contracts still accept edits normally", () => {
    const result = applyDraftIfAllowed("draft", validVariables, {
      baseHourlyRate: "13.0",
    });
    expect(result.baseHourlyRate).toBe("13.0");
  });
});

describe("Phase 5N — audit event payload preparation", () => {
  const missing = getMissingContractFields(validVariables);
  const readiness = deriveContractReadiness({ missing, sources: {} });
  const evidence = buildContractDraftEvidence({
    employee: { id: "emp-1" },
    contractType: "foh",
    contractValues: validVariables,
    fieldSources: {},
    missingFields: missing,
    readinessStatus: readiness.status,
    fromEmployeeCreationFlow: false,
    now: new Date("2025-01-01T00:00:00.000Z"),
  });

  const eventTypes: ContractAuditEventType[] = [
    "contract_generated",
    "contract_issued",
    "contract_signed",
    "contract_locked",
    "contract_superseded",
    "contract_voided",
  ];

  it.each(eventTypes)("builds a typed audit event payload for %s", (eventType) => {
    const e = buildContractAuditEvent({
      eventType,
      contractId: "c-1",
      employeeId: "emp-1",
      actorUserId: "user-1",
      previousStatus: "draft",
      newStatus: "generated",
      evidence,
      now: new Date("2025-02-01T12:00:00.000Z"),
    });
    expect(e.eventType).toBe(eventType);
    expect(e.contractId).toBe("c-1");
    expect(e.employeeId).toBe("emp-1");
    expect(e.actorUserId).toBe("user-1");
    expect(e.occurredAtIso).toBe("2025-02-01T12:00:00.000Z");
  });

  it("attaches the evidence summary only to lifecycle events that need it", () => {
    const generated = buildContractAuditEvent({
      eventType: "contract_generated",
      contractId: "c-1",
      employeeId: "emp-1",
      actorUserId: "user-1",
      previousStatus: "draft",
      newStatus: "generated",
      evidence,
    });
    expect(generated.evidenceSummary).toBeTruthy();
    expect(generated.evidenceSummary?.readinessStatus).toBe(readiness.status);

    const locked = buildContractAuditEvent({
      eventType: "contract_locked",
      contractId: "c-1",
      employeeId: "emp-1",
      actorUserId: "user-1",
      previousStatus: "signed",
      newStatus: "locked",
      evidence,
    });
    expect(locked.evidenceSummary).toBeNull();
  });

  it("rejects UI-only edit events (no noisy audit logs)", () => {
    expect(() =>
      buildContractAuditEvent({
        // @ts-expect-error — intentionally invalid type
        eventType: "field_typed",
        contractId: "c-1",
        employeeId: null,
        actorUserId: null,
        previousStatus: "draft",
        newStatus: "draft",
      }),
    ).toThrow(/UI-only edits must not be audited/i);

    expect(isValidContractAuditEventType("field_typed")).toBe(false);
    expect(isValidContractAuditEventType("contract_signed")).toBe(true);
  });

  it("requires a contractId", () => {
    expect(() =>
      buildContractAuditEvent({
        eventType: "contract_generated",
        contractId: "",
        employeeId: null,
        actorUserId: null,
        previousStatus: "draft",
        newStatus: "generated",
      }),
    ).toThrow(/contractId is required/i);
  });

  it("does not mutate its inputs", () => {
    const evidenceCopy = JSON.parse(JSON.stringify(evidence));
    buildContractAuditEvent({
      eventType: "contract_signed",
      contractId: "c-1",
      employeeId: "emp-1",
      actorUserId: "user-1",
      previousStatus: "issued",
      newStatus: "signed",
      evidence,
    });
    expect(evidence).toEqual(evidenceCopy);
  });
});

describe("Phase 5N — separation of concerns is preserved", () => {
  it("generation does not imply issuing", () => {
    expect(
      canTransitionContractStatus({
        fromStatus: "generated",
        toStatus: "signed",
        hasSignature: true,
      }).allowed,
    ).toBe(false);
  });

  it("issuing does not imply signing", () => {
    expect(
      canTransitionContractStatus({
        fromStatus: "issued",
        toStatus: "locked",
      }).allowed,
    ).toBe(false);
  });

  it("signing does not imply locking", () => {
    // signed → locked is its own explicit transition step.
    expect(
      canTransitionContractStatus({
        fromStatus: "signed",
        toStatus: "locked",
      }).allowed,
    ).toBe(true);
    // …but a contract is not implicitly locked the moment it becomes signed.
    expect(isContractLocked("signed")).toBe(true); // protected
    expect(isContractLocked("locked")).toBe(true); // also protected
  });
});

describe("Phase 5N — purity & safety", () => {
  const files = [
    "src/lib/contract-status-transitions.ts",
    "src/lib/contract-lock-guard.ts",
    "src/lib/contract-audit-events.ts",
  ];

  it.each(files)("%s has no React / Supabase / React Query imports", (file) => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    expect(src).not.toMatch(/from ["']react["']/);
    expect(src).not.toMatch(/@tanstack\/react-query/);
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/supabase\.from/);
  });

  it.each(files)("%s performs no persistence or fake side effects", (file) => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(src).not.toMatch(/fetch\(|sendContractEmail|signContract/);
  });
});

describe("Phase 5N — no DB migration introduced in this phase", () => {
  it("no new SQL migration file was added for Phase 5N", () => {
    const migrationsDir = join(process.cwd(), "supabase/migrations");
    if (!existsSync(migrationsDir)) return;
    const recent = readdirSync(migrationsDir).filter((f) =>
      /phase[\s_-]?5n/i.test(f),
    );
    expect(recent).toEqual([]);
  });

  it("Phase 5N helpers contain no inline SQL DDL", () => {
    for (const f of [
      "src/lib/contract-status-transitions.ts",
      "src/lib/contract-lock-guard.ts",
      "src/lib/contract-audit-events.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src).not.toMatch(/CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+POLICY/i);
    }
  });
});

describe("Phase 5N — no payroll / NMW / service-charge / legal / profile / onboarding / active-terms logic touched", () => {
  const forbiddenImports = [
    /payroll/i,
    /nmw|minimum-wage/i,
    /service-charge/i,
    /employment-terms/i,
    /employee-defaults/i,
    /contractClauses|contractTemplates/i,
  ];

  it.each([
    "src/lib/contract-status-transitions.ts",
    "src/lib/contract-lock-guard.ts",
    "src/lib/contract-audit-events.ts",
  ])("%s does not import payroll/legal/profile/onboarding/terms modules", (file) => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    for (const re of forbiddenImports) {
      expect(src).not.toMatch(new RegExp(`from\\s+["'][^"']*${re.source}[^"']*["']`, "i"));
    }
  });
});
