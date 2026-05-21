/**
 * Final Contract Workflow Audit — end-to-end source-level test that walks
 * the full employment-contract lifecycle through every Phase 5E–5N helper
 * and asserts the safety invariants required by the audit checklist.
 *
 * This test exercises ONLY pure helpers — no React, no Supabase, no DB
 * mutation, no migrations, no signing side-effects. It documents and locks
 * in the contract guarantees the user asked us to confirm:
 *
 *   1. Employee creation -> draft contract preparation
 *   2. Draft contract preparation (auto-fill, sources, missing fields)
 *   3. Readiness + draft-evidence + generation gate
 *   4. Generate ≠ Issue ≠ Sign ≠ Lock
 *   5. Signature flow only via real completion path
 *   6. Locking + immutability against late-arriving employee data
 *   7. Versioning / amendment / supersede / void safety
 *   8. Audit-event payloads (lifecycle only, no UI typing noise)
 *   9. No payroll / NMW / service-charge / DB-migration regressions
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

import { buildContractDraftFromNewEmployee } from "@/lib/contract-draft-from-employee";
import {
  mapEmployeeToContractDefaults,
} from "@/lib/contract-employee-defaults";
import {
  resolveContractFieldSources,
  getMissingContractFields,
  CRITICAL_CONTRACT_FIELDS,
} from "@/lib/contract-form-review";
import { deriveContractReadiness } from "@/lib/contract-readiness";
import { buildContractDraftEvidence } from "@/lib/contract-draft-evidence";
import {
  getContractGenerationGate,
  HARD_REQUIRED_FIELDS,
  SOFT_WARNING_FIELDS,
} from "@/lib/contract-generation-gate";
import { buildContractIssueSummary } from "@/lib/contract-issue-summary";
import {
  canTransitionContractStatus,
  isContractLocked,
  workflowStatusFromContractState,
  LOCKED_STATUSES,
} from "@/lib/contract-status-transitions";
import {
  getContractLockGuard,
  canApplyDraftEdits,
} from "@/lib/contract-lock-guard";
import {
  buildContractAuditEvent,
  isValidContractAuditEventType,
} from "@/lib/contract-audit-events";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const newEmployee = {
  id: "emp-1",
  forename: "Ada",
  surname: "Lovelace",
  preferred_name: "Ada",
  department: "Front of House",
  start_date: "2026-06-01",
  hourly_rate: 12.5,
  service_charge: 0,
};

const onboarding = {
  personal_info: {
    address: "1 Analytical Engine Lane, London E1 6AN",
  },
};

const activeTerms = {
  role_title: "Server",
  employment_type: "part_time",
  work_location: "Soho Branch",
  contracted_hours: 24,
  base_hourly_rate: 12.5,
  guaranteed_service_charge_rate: 1.5,
  notice_period_weeks: 2,
  reporting_manager_name: "Grace Hopper",
  reporting_manager_title: "General Manager",
};

const tenantSettings = {
  company_name: "UglyOps Hospitality Ltd",
  address: "10 King Street, London W1 1AA",
};

function fullDraft() {
  return buildContractDraftFromNewEmployee({
    employee: newEmployee,
    onboarding,
    activeTerms,
    tenantSettings,
  });
}

// ---------------------------------------------------------------------------
// 1. Create a new employee -> contract preparation
// ---------------------------------------------------------------------------

describe("Final audit / 1. Create employee → prepare draft contract", () => {
  it("builds a draft package from a freshly created employee without throwing", () => {
    const draft = fullDraft();
    expect(draft).toBeTruthy();
    expect(draft.variables.employeeName).toBe("Ada Lovelace");
    expect(draft.companyLegalName).toBe(tenantSettings.company_name);
    expect(draft.companyAddress).toBe(tenantSettings.address);
  });

  it("does not require contract-only data on the employee record", () => {
    // Minimal employee — no onboarding, no active terms, no tenant settings.
    const draft = buildContractDraftFromNewEmployee({
      employee: { id: "emp-min", forename: "Min", surname: "Imal" },
    });
    expect(draft.variables.employeeName).toBe("Min Imal");
    // Missing critical fields are reported, but the helper still succeeds.
    expect(draft.ready).toBe(false);
    expect(draft.missing.length).toBeGreaterThan(0);
  });

  it("returns input untouched (no side effects on employee/onboarding/terms)", () => {
    const empSnap = JSON.parse(JSON.stringify(newEmployee));
    const obSnap = JSON.parse(JSON.stringify(onboarding));
    const termsSnap = JSON.parse(JSON.stringify(activeTerms));
    fullDraft();
    expect(newEmployee).toEqual(empSnap);
    expect(onboarding).toEqual(obSnap);
    expect(activeTerms).toEqual(termsSnap);
  });
});

// ---------------------------------------------------------------------------
// 2. Draft contract preparation
// ---------------------------------------------------------------------------

describe("Final audit / 2. Draft contract preparation", () => {
  it("auto-fills from employee, onboarding and active terms with source hints", () => {
    const draft = fullDraft();
    expect(draft.sources.employeeName).toBe("employee_profile");
    expect(draft.sources.homeAddress).toBe("onboarding");
    expect(draft.sources.workLocation).toBe("active_terms");
    expect(draft.sources.reportingManagerName).toBe("active_terms");
  });

  it("flags missing critical fields clearly when sources are absent", () => {
    const draft = buildContractDraftFromNewEmployee({
      employee: { id: "x", forename: "X", surname: "Y" },
    });
    const missingKeys = draft.missing.map((m) => m.field);
    expect(missingKeys).toContain("homeAddress");
    expect(missingKeys).toContain("workLocation");
  });

  it("protects manual edits via userEdited and treats them as 'manual' source", () => {
    const defaults = mapEmployeeToContractDefaults({
      employee: newEmployee,
      onboarding,
      activeTerms,
    });
    const userEdited = new Set<any>(["jobTitle"]);
    const sources = resolveContractFieldSources({
      input: { employee: newEmployee, onboarding, activeTerms },
      variables: { ...defaults.variables, jobTitle: "Lead Server" },
      userEdited,
    });
    expect(sources.jobTitle).toBe("manual");
  });

  it("does not mutate employee profile / onboarding / active terms", () => {
    const empSnap = JSON.parse(JSON.stringify(newEmployee));
    const obSnap = JSON.parse(JSON.stringify(onboarding));
    const termsSnap = JSON.parse(JSON.stringify(activeTerms));
    const draft = fullDraft();
    // Mutating the returned variables must not affect inputs.
    (draft.variables as any).employeeName = "MUTATED";
    expect(newEmployee).toEqual(empSnap);
    expect(onboarding).toEqual(obSnap);
    expect(activeTerms).toEqual(termsSnap);
  });
});

// ---------------------------------------------------------------------------
// 3. Readiness banner + evidence + generation gate
// ---------------------------------------------------------------------------

describe("Final audit / 3. Readiness, evidence and generation gate", () => {
  it("'ready' readiness for a fully populated draft", () => {
    const draft = fullDraft();
    const readiness = deriveContractReadiness({
      missing: draft.missing,
      sources: draft.sources,
    });
    expect(readiness.status).toBe("ready");
    expect(readiness.bannerTone).toBe("info");
  });

  it("'missing_details' readiness when critical fields absent", () => {
    const draft = buildContractDraftFromNewEmployee({
      employee: { id: "x", forename: "X", surname: "Y" },
    });
    const readiness = deriveContractReadiness({
      missing: draft.missing,
      sources: draft.sources,
    });
    expect(readiness.status).toBe("missing_details");
    expect(readiness.bannerTone).toBe("warning");
  });

  it("'needs_review' readiness when a critical field is manually entered", () => {
    const draft = fullDraft();
    const sources = { ...draft.sources, jobTitle: "manual" as const };
    const readiness = deriveContractReadiness({ missing: [], sources });
    expect(readiness.status).toBe("needs_review");
    expect(readiness.manualCriticalFields.map((m) => m.field)).toContain(
      "jobTitle",
    );
  });

  it("builds an evidence snapshot describing how the draft was prepared", () => {
    const draft = fullDraft();
    const evidence = buildContractDraftEvidence({
      employee: { id: newEmployee.id },
      contractType: draft.contractType,
      contractValues: draft.variables,
      fieldSources: draft.sources,
      missingFields: draft.missing,
      readinessStatus: "ready",
      fromEmployeeCreationFlow: true,
      now: new Date("2026-05-21T00:00:00Z"),
    });
    expect(evidence.generatedFromEmployeeCreationFlow).toBe(true);
    expect(evidence.autoFilledCount).toBeGreaterThan(0);
    expect(evidence.payDetailsStatus).toBe("with_guaranteed_sc");
    expect(evidence.reportingManagerStatus).toBe("provided");
  });

  it("generation gate BLOCKS when any hard-required field is missing", () => {
    const draft = fullDraft();
    for (const field of HARD_REQUIRED_FIELDS) {
      const variables: any = { ...draft.variables };
      let companyLegalName = draft.companyLegalName;
      let companyAddress = draft.companyAddress;
      if (field === "companyLegalName") companyLegalName = "";
      else if (field === "companyAddress") companyAddress = "";
      else variables[field] = "";
      const gate = getContractGenerationGate({
        variables,
        companyLegalName,
        companyAddress,
      });
      expect(
        gate.canGenerate,
        `missing ${field} should block generation`,
      ).toBe(false);
      expect(gate.blockingFields.some((b) => b.field === field)).toBe(true);
    }
  });

  it("generation gate does NOT block when only soft warnings are missing", () => {
    const draft = fullDraft();
    const variables: any = { ...draft.variables };
    for (const f of SOFT_WARNING_FIELDS) variables[f] = "";
    const gate = getContractGenerationGate({
      variables,
      companyLegalName: draft.companyLegalName,
      companyAddress: draft.companyAddress,
    });
    expect(gate.canGenerate).toBe(true);
    expect(gate.warningFields.length).toBeGreaterThan(0);
  });

  it("baseHourlyRate <= 0 and weeklyHours <= 0 are treated as missing", () => {
    const draft = fullDraft();
    const gate = getContractGenerationGate({
      variables: { ...draft.variables, baseHourlyRate: 0, weeklyHours: 0 } as any,
      companyLegalName: draft.companyLegalName,
      companyAddress: draft.companyAddress,
    });
    expect(gate.canGenerate).toBe(false);
    const blocked = gate.blockingFields.map((b) => b.field);
    expect(blocked).toContain("baseHourlyRate");
    expect(blocked).toContain("weeklyHours");
  });
});

// ---------------------------------------------------------------------------
// 4. Issue workflow — generate ≠ issue ≠ sign ≠ lock
// ---------------------------------------------------------------------------

describe("Final audit / 4. Issue workflow separation", () => {
  it("issue summary cannot be issued before generation", () => {
    const draft = fullDraft();
    const gate = getContractGenerationGate({
      variables: draft.variables,
      companyLegalName: draft.companyLegalName,
      companyAddress: draft.companyAddress,
    });
    const evidence = buildContractDraftEvidence({
      employee: { id: newEmployee.id },
      contractType: draft.contractType,
      contractValues: draft.variables,
      fieldSources: draft.sources,
      missingFields: draft.missing,
      readinessStatus: "ready",
      fromEmployeeCreationFlow: false,
    });
    const summary = buildContractIssueSummary({
      variables: draft.variables,
      gate,
      evidence,
      isGenerated: false,
    });
    expect(summary.canIssue).toBe(false);
    expect(summary.blockingReason).toMatch(/generated/i);
  });

  it("issue summary surfaces key details after generation", () => {
    const draft = fullDraft();
    const gate = getContractGenerationGate({
      variables: draft.variables,
      companyLegalName: draft.companyLegalName,
      companyAddress: draft.companyAddress,
    });
    const evidence = buildContractDraftEvidence({
      employee: { id: newEmployee.id },
      contractType: draft.contractType,
      contractValues: draft.variables,
      fieldSources: draft.sources,
      missingFields: [],
      readinessStatus: "ready",
      fromEmployeeCreationFlow: false,
    });
    const summary = buildContractIssueSummary({
      variables: draft.variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(summary.canIssue).toBe(true);
    expect(summary.employeeName).toBe("Ada Lovelace");
    expect(summary.paySummary).toContain("£12.5/hour base");
    expect(summary.reportingManagerLine).toContain("Grace Hopper");
  });

  it("transition matrix forbids skipping straight from generated to signed or locked", () => {
    expect(
      canTransitionContractStatus({
        fromStatus: "generated",
        toStatus: "signed",
        hasSignature: true,
      }).allowed,
    ).toBe(false);
    expect(
      canTransitionContractStatus({
        fromStatus: "generated",
        toStatus: "locked",
      }).allowed,
    ).toBe(false);
  });

  it("transition matrix forbids skipping straight from issued to locked", () => {
    expect(
      canTransitionContractStatus({ fromStatus: "issued", toStatus: "locked" })
        .allowed,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Signature workflow — only via real completion path
// ---------------------------------------------------------------------------

describe("Final audit / 5. Signature workflow", () => {
  it("cannot mark a contract as signed without a real signature flag", () => {
    const result = canTransitionContractStatus({
      fromStatus: "issued",
      toStatus: "signed",
      hasSignature: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });

  it("can mark a contract as signed when the real signature flag is present", () => {
    const result = canTransitionContractStatus({
      fromStatus: "issued",
      toStatus: "signed",
      hasSignature: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("no helper invents 'signed' from any other status without hasSignature", () => {
    for (const from of ["draft", "generated", "issued"] as const) {
      const r = canTransitionContractStatus({
        fromStatus: from,
        toStatus: "signed",
        hasSignature: false,
      });
      expect(r.allowed).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Locking + immutability against late-arriving employee data
// ---------------------------------------------------------------------------

describe("Final audit / 6. Locking and immutability", () => {
  it("signed and locked contracts are immutable to silent draft edits", () => {
    expect(canApplyDraftEdits("signed")).toBe(false);
    expect(canApplyDraftEdits("issued")).toBe(false);
    expect(canApplyDraftEdits("superseded")).toBe(false);
    expect(canApplyDraftEdits("terminated")).toBe(false);
    expect(canApplyDraftEdits("draft")).toBe(true);
  });

  it("lock guard returns the expected protective warnings", () => {
    const g = getContractLockGuard("signed");
    expect(g.isLocked).toBe(true);
    expect(g.warningTitle).toMatch(/Signed contract/i);
    expect(g.allowedActions).toContain("amend");
    expect(g.allowedActions).not.toContain("edit_draft");
  });

  it("employee/onboarding/active-terms changes do not alter a signed contract snapshot", () => {
    // Snapshot a draft into "contract values" (representing a signed contract).
    const draft = fullDraft();
    const signedSnapshot = JSON.parse(JSON.stringify(draft.variables));

    // Late-arriving updates to source data:
    const laterEmployee = { ...newEmployee, hourly_rate: 99, surname: "Changed" };
    const laterOnboarding = {
      personal_info: { address: "Different address" },
    };
    const laterTerms = {
      ...activeTerms,
      base_hourly_rate: 99,
      reporting_manager_name: "Someone Else",
    };

    // Re-run draft preparation against the updated sources.
    const rebuilt = buildContractDraftFromNewEmployee({
      employee: laterEmployee,
      onboarding: laterOnboarding,
      activeTerms: laterTerms,
      tenantSettings,
    });

    // The signed snapshot is unchanged by re-deriving defaults.
    expect(draft.variables).toEqual(signedSnapshot);
    // The rebuilt defaults reflect new data, but they do NOT affect the
    // signed snapshot or its source object.
    expect(rebuilt.variables.employeeName).toBe("Ada Changed");
    expect(rebuilt.variables.employeeName).not.toBe(
      signedSnapshot.employeeName,
    );
  });

  it("isContractLocked agrees with LOCKED_STATUSES set", () => {
    for (const s of LOCKED_STATUSES) expect(isContractLocked(s)).toBe(true);
    expect(isContractLocked("draft")).toBe(false);
    expect(isContractLocked("generated")).toBe(false);
    expect(isContractLocked("issued")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Versioning / amendments / supersede / void safety
// ---------------------------------------------------------------------------

describe("Final audit / 7. Versioning and amendments", () => {
  it("DB state 'superseded' maps to workflow 'superseded' (historical, view-only)", () => {
    expect(workflowStatusFromContractState("superseded")).toBe("superseded");
    const g = getContractLockGuard("superseded");
    expect(g.allowedActions).toEqual(["view"]);
  });

  it("DB state 'terminated' maps to workflow 'voided' (historical, view-only)", () => {
    expect(workflowStatusFromContractState("terminated")).toBe("voided");
    const g = getContractLockGuard("terminated");
    expect(g.allowedActions).toEqual(["view"]);
  });

  it("only signed → superseded and locked → superseded are allowed; void cannot reopen", () => {
    expect(
      canTransitionContractStatus({
        fromStatus: "signed",
        toStatus: "superseded",
      }).allowed,
    ).toBe(true);
    expect(
      canTransitionContractStatus({
        fromStatus: "voided",
        toStatus: "draft",
      }).allowed,
    ).toBe(false);
    expect(
      canTransitionContractStatus({
        fromStatus: "superseded",
        toStatus: "signed",
        hasSignature: true,
      }).allowed,
    ).toBe(false);
  });

  it("signed contract cannot be transitioned back to draft / generated / issued", () => {
    for (const to of ["draft", "generated", "issued"] as const) {
      expect(
        canTransitionContractStatus({
          fromStatus: "signed",
          toStatus: to,
          hasSignature: true,
        }).allowed,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Audit evidence — lifecycle only, no UI typing noise
// ---------------------------------------------------------------------------

describe("Final audit / 8. Audit event payloads", () => {
  const lifecycleEvents = [
    "contract_generated",
    "contract_issued",
    "contract_signed",
    "contract_locked",
    "contract_superseded",
    "contract_voided",
  ] as const;

  it("builds typed payloads for every lifecycle event", () => {
    for (const eventType of lifecycleEvents) {
      const ev = buildContractAuditEvent({
        eventType,
        contractId: "c-1",
        employeeId: "emp-1",
        actorUserId: "user-1",
        previousStatus: "draft",
        newStatus: "generated",
        now: new Date("2026-05-21T00:00:00Z"),
      });
      expect(ev.eventType).toBe(eventType);
      expect(ev.occurredAtIso).toBe("2026-05-21T00:00:00.000Z");
    }
  });

  it("rejects UI-only event names (no audit for field typing)", () => {
    expect(isValidContractAuditEventType("field_edited")).toBe(false);
    expect(isValidContractAuditEventType("preview_toggled")).toBe(false);
    expect(() =>
      buildContractAuditEvent({
        eventType: "field_edited" as any,
        contractId: "c-1",
        employeeId: "emp-1",
        actorUserId: "user-1",
        previousStatus: "draft",
        newStatus: "draft",
      }),
    ).toThrow();
  });

  it("requires a contractId — no orphan audit rows", () => {
    expect(() =>
      buildContractAuditEvent({
        eventType: "contract_generated",
        contractId: "",
        employeeId: "emp-1",
        actorUserId: "user-1",
        previousStatus: "draft",
        newStatus: "generated",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. Safety / no regression — source-level guarantees
// ---------------------------------------------------------------------------

describe("Final audit / 9. Safety checks (source-level)", () => {
  const pureHelpers = [
    "src/lib/contract-draft-from-employee.ts",
    "src/lib/contract-employee-defaults.ts",
    "src/lib/contract-form-review.ts",
    "src/lib/contract-readiness.ts",
    "src/lib/contract-draft-evidence.ts",
    "src/lib/contract-generation-gate.ts",
    "src/lib/contract-issue-summary.ts",
    "src/lib/contract-status-transitions.ts",
    "src/lib/contract-lock-guard.ts",
    "src/lib/contract-audit-events.ts",
  ];

  it("pure helpers have no Supabase / React / React Query imports", () => {
    for (const f of pureHelpers) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} imports supabase`).not.toMatch(/from\s+["']@\/integrations\/supabase/);
      expect(src, `${f} imports react`).not.toMatch(/from\s+["']react["']/);
      expect(src, `${f} imports react-query`).not.toMatch(/@tanstack\/react-query/);
    }
  });

  it("Phase 5 has not added any database migrations", () => {
    const dir = "supabase/migrations";
    if (!existsSync(dir)) return;
    const phase5Migrations = readdirSync(dir).filter((name) =>
      /phase[-_ ]?5[a-n]?/i.test(name),
    );
    expect(phase5Migrations).toEqual([]);
  });

  it("contract helpers do not reference NMW / payroll / service-charge calculation logic", () => {
    // Spot-check: helpers may display pay values but must not recompute NMW or
    // payroll formulas. They are display + gating only.
    for (const f of pureHelpers) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/calculate(NMW|Payroll|ServiceCharge)/i);
      expect(src).not.toMatch(/nmw_rate_for/i);
    }
  });

  it("CRITICAL_CONTRACT_FIELDS is the single source of truth used by gate + readiness", () => {
    // The gate must hard-require the contract-critical fields (minus the
    // tenant-side companyLegal* ones which live outside ContractVariables).
    for (const f of CRITICAL_CONTRACT_FIELDS) {
      expect(HARD_REQUIRED_FIELDS).toContain(f);
    }
  });

  it("status-transition map and lock guard agree on terminal states", () => {
    // Map workflow statuses back to the DB ContractState strings the lock
    // guard actually receives. "locked" is a workflow-only concept (the DB
    // keeps the row in "signed" with a separate lock flag elsewhere), so
    // it is exercised via the "signed" DB state here.
    const dbStateFor: Record<string, string> = {
      signed: "signed",
      locked: "signed",
      superseded: "superseded",
      voided: "terminated",
    };
    for (const status of LOCKED_STATUSES) {
      const g = getContractLockGuard(dbStateFor[status]);
      expect(g.isLocked).toBe(true);
      expect(g.allowedActions).not.toContain("edit_draft");
    }
  });

});

// ---------------------------------------------------------------------------
// 10. Full lifecycle walk-through
// ---------------------------------------------------------------------------

describe("Final audit / 10. Full employee → signed → locked walkthrough", () => {
  it("walks draft → generated → issued → signed → locked with all gates honoured", () => {
    // Step A: prepare draft from new employee.
    const draft = fullDraft();
    expect(draft.ready).toBe(true);

    // Step B: readiness banner is 'ready'.
    const readiness = deriveContractReadiness({
      missing: draft.missing,
      sources: draft.sources,
    });
    expect(readiness.status).toBe("ready");

    // Step C: generation gate passes.
    const gate = getContractGenerationGate({
      variables: draft.variables,
      companyLegalName: draft.companyLegalName,
      companyAddress: draft.companyAddress,
    });
    expect(gate.canGenerate).toBe(true);

    // Step D: manager generates — transition draft → generated requires a PDF.
    expect(
      canTransitionContractStatus({
        fromStatus: "draft",
        toStatus: "generated",
        hasGeneratedDocument: false,
      }).allowed,
    ).toBe(false);
    expect(
      canTransitionContractStatus({
        fromStatus: "draft",
        toStatus: "generated",
        hasGeneratedDocument: true,
      }).allowed,
    ).toBe(true);

    // Step E: issue summary is available, requires intentional confirmation.
    const evidence = buildContractDraftEvidence({
      employee: { id: newEmployee.id },
      contractType: draft.contractType,
      contractValues: draft.variables,
      fieldSources: draft.sources,
      missingFields: [],
      readinessStatus: "ready",
      fromEmployeeCreationFlow: true,
    });
    const issueSummary = buildContractIssueSummary({
      variables: draft.variables,
      gate,
      evidence,
      isGenerated: true,
    });
    expect(issueSummary.canIssue).toBe(true);

    // Step F: manager issues — generated → issued.
    expect(
      canTransitionContractStatus({
        fromStatus: "generated",
        toStatus: "issued",
      }).allowed,
    ).toBe(true);

    // Step G: signing only via real signature flow.
    expect(
      canTransitionContractStatus({
        fromStatus: "issued",
        toStatus: "signed",
        hasSignature: true,
      }).allowed,
    ).toBe(true);

    // Step H: locked is terminal except for supersede via amendment.
    expect(
      canTransitionContractStatus({ fromStatus: "signed", toStatus: "locked" })
        .allowed,
    ).toBe(true);
    expect(
      canTransitionContractStatus({
        fromStatus: "locked",
        toStatus: "superseded",
      }).allowed,
    ).toBe(true);
    expect(
      canTransitionContractStatus({ fromStatus: "locked", toStatus: "draft" })
        .allowed,
    ).toBe(false);

    // Step I: build a signed-event audit payload (no persistence).
    const signedEvent = buildContractAuditEvent({
      eventType: "contract_signed",
      contractId: "c-1",
      employeeId: newEmployee.id,
      actorUserId: "user-1",
      previousStatus: "issued",
      newStatus: "signed",
      evidence,
    });
    expect(signedEvent.eventType).toBe("contract_signed");
    expect(signedEvent.evidenceSummary).toBeTruthy();
  });
});

// Touch fs.statSync so the import is used (and the test file remains valid
// even if the migrations directory check short-circuits).
void statSync;
void join;
