import { describe, it, expect } from "vitest";
import {
  buildAppointmentReportingSentence,
  defaultFallbackReportingRole,
} from "@/lib/contract-appointment";
import { mapEmployeeToContractDefaults } from "@/lib/contract-employee-defaults";
import {
  getOriginalFieldSources,
  resolveContractFieldSources,
  CONTRACT_FIELD_LABELS,
} from "@/lib/contract-form-review";
import { getClauseContent } from "@/components/contracts/contractClauses";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const baseVars: ContractVariables = {
  employeeName: "Jane Doe",
  homeAddress: "1 High St",
  jobTitle: "Waiter",
  effectiveDate: "2025-01-15",
  hourlyRate: "12.5",
  baseHourlyRate: "12.5",
  guaranteedServiceChargeRate: "",
  estimatedServiceChargeRate: "",
  troncSchemeName: "",
  serviceChargePolicyNote: "",
  weeklyHours: "40",
  noticePeriod: "two weeks",
  probationPeriod: "2 months",
  workLocation: "Main",
  employmentType: "part_time",
};

function flatten(blocks: ReturnType<typeof getClauseContent>): string {
  return blocks
    .map((b) => (b.items ? b.items.join(" | ") : b.text || ""))
    .join("\n");
}

describe("buildAppointmentReportingSentence", () => {
  it("uses manager name + title when both provided", () => {
    const s = buildAppointmentReportingSentence({
      managerName: "Alex Carter",
      managerTitle: "Operations Manager",
      fallbackRole: "Operations Manager",
    });
    expect(s).toContain("You will report to Alex Carter, Operations Manager,");
    expect(s).toContain("or such other manager");
  });

  it("uses manager name only when title missing", () => {
    const s = buildAppointmentReportingSentence({ managerName: "Alex Carter", fallbackRole: "Operations Manager" });
    expect(s).toContain("You will report to Alex Carter,");
    expect(s).not.toMatch(/Alex Carter,\s*,/);
  });

  it("falls back to role when no name", () => {
    const s = buildAppointmentReportingSentence({ fallbackRole: "Operations Manager" });
    expect(s).toContain("You will report to the Operations Manager,");
  });

  it("safe fallback when nothing provided", () => {
    const s = buildAppointmentReportingSentence({});
    expect(s).toBe(
      "You will report to such manager as the Company may reasonably notify to you from time to time.",
    );
  });

  it("returns sensible fallback role for management vs team", () => {
    expect(defaultFallbackReportingRole(true)).toBe("Operations Manager");
    expect(defaultFallbackReportingRole(false)).toBe("Front of House Manager");
  });
});

describe("Definitions section stays generic (no personal names)", () => {
  it("management contract definitions never contain manager name", () => {
    const blocks = getClauseContent(
      "interpretation",
      { ...baseVars, reportingManagerName: "Alex Carter", reportingManagerTitle: "Operations Manager" },
      "management",
    );
    const text = flatten(blocks);
    expect(text).not.toMatch(/Alex Carter/);
    expect(text).toMatch(/MANAGING DIRECTOR means the appointed Managing Director/);
    expect(text).toMatch(/OPERATIONS MANAGER means the appointed Operations Manager/);
  });

  it("team contract definitions never contain manager name", () => {
    const blocks = getClauseContent(
      "interpretation",
      { ...baseVars, reportingManagerName: "Sam Lee" },
      "foh",
    );
    expect(flatten(blocks)).not.toMatch(/Sam Lee/);
  });
});

describe("Appointment section includes reporting manager wording", () => {
  it("includes manager name when provided (team)", () => {
    const blocks = getClauseContent(
      "appointment",
      { ...baseVars, reportingManagerName: "Alex Carter", reportingManagerTitle: "Operations Manager" },
      "foh",
    );
    const text = flatten(blocks);
    expect(text).toMatch(/You will report to Alex Carter, Operations Manager/);
  });

  it("includes manager name when provided (management)", () => {
    const blocks = getClauseContent(
      "appointment",
      { ...baseVars, jobTitle: "Restaurant Manager", reportingManagerName: "Pat Stone" },
      "management",
    );
    expect(flatten(blocks)).toMatch(/You will report to Pat Stone,/);
  });

  it("uses role fallback when no manager name", () => {
    const blocks = getClauseContent("appointment", baseVars, "foh");
    expect(flatten(blocks)).toMatch(/You will report to the Front of House Manager,/);
  });

  it("uses safe fallback when even fallback role missing — by passing empty role", () => {
    const s = buildAppointmentReportingSentence({ fallbackRole: "" });
    expect(s).toMatch(/such manager as the Company may reasonably notify/);
  });
});

describe("mapEmployeeToContractDefaults — reporting manager auto-fill", () => {
  it("prefers active terms reporting manager", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: { forename: "J", surname: "D" },
      onboarding: { personal_info: { line_manager: "Old Manager" } },
      activeTerms: {
        reporting_manager_name: "Alex Carter",
        reporting_manager_title: "Operations Manager",
      },
    });
    expect(variables.reportingManagerName).toBe("Alex Carter");
    expect(variables.reportingManagerTitle).toBe("Operations Manager");
  });

  it("falls back to onboarding personal_info", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: { forename: "J", surname: "D" },
      onboarding: { personal_info: { reporting_manager: "Sam Lee", reporting_manager_title: "GM" } },
    });
    expect(variables.reportingManagerName).toBe("Sam Lee");
    expect(variables.reportingManagerTitle).toBe("GM");
  });

  it("leaves reporting manager undefined when nothing is known", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: { forename: "J", surname: "D" },
    });
    expect(variables.reportingManagerName).toBeUndefined();
    expect(variables.reportingManagerTitle).toBeUndefined();
  });
});

describe("contract-form-review — reporting manager source map", () => {
  it("reports active_terms when present", () => {
    const sources = getOriginalFieldSources({
      employee: { forename: "J", surname: "D" },
      activeTerms: { reporting_manager_name: "Alex", reporting_manager_title: "Ops" },
    });
    expect(sources.reportingManagerName).toBe("active_terms");
    expect(sources.reportingManagerTitle).toBe("active_terms");
  });

  it("reports onboarding when only personal_info has it", () => {
    const sources = getOriginalFieldSources({
      employee: { forename: "J", surname: "D" },
      onboarding: { personal_info: { line_manager: "Sam", line_manager_title: "GM" } },
    });
    expect(sources.reportingManagerName).toBe("onboarding");
    expect(sources.reportingManagerTitle).toBe("onboarding");
  });

  it("marks manual when the user edits it (protects against late-arriving data)", () => {
    const resolved = resolveContractFieldSources({
      input: {
        employee: { forename: "J", surname: "D" },
        activeTerms: { reporting_manager_name: "Alex" },
      },
      variables: { reportingManagerName: "Different Person" },
      userEdited: new Set(["reportingManagerName"]),
    });
    expect(resolved.reportingManagerName).toBe("manual");
  });

  it("exposes a friendly label for the reporting manager field", () => {
    expect(CONTRACT_FIELD_LABELS.reportingManagerName).toBeDefined();
  });
});

describe("safety (Phase 5H)", () => {
  it("contract-appointment is pure (no React / Supabase / RQ imports)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-appointment.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/@tanstack\/react-query/);
    expect(src).not.toMatch(/\.update\(|\.insert\(|\.delete\(|\.upsert\(/);
  });

  it("dialog wires reporting manager UI, source hint, and review row", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/reporting-manager-section/);
    expect(src).toMatch(/reporting-manager-name-input/);
    expect(src).toMatch(/reporting-manager-title-input/);
    expect(src).toMatch(/reportingManagerName/);
    expect(src).toMatch(/reportingManagerTitle/);
    // close + employee-switch reset paths exist (Phase 5E/5F regression check)
    expect(src).toMatch(/setUserEdited\(new Set\(\)\)/);
  });

  it("clause module imports the pure appointment helper", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/contractClauses.ts", "utf8");
    expect(src).toMatch(/buildAppointmentReportingSentence/);
    expect(src).toMatch(/appointmentReportingSentence/);
    // appointment no longer hard-codes "reporting to <role>, as the case may be"
    expect(src).not.toMatch(/reporting to \$\{reportingTo\}, as the case may be/);
  });

  it("PDF renderer uses the same pure appointment helper", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractPDF.tsx", "utf8");
    expect(src).toMatch(/buildAppointmentReportingSentence/);
    expect(src).toMatch(/appointmentReportingSentence/);
  });

  it("defaults mapper does not mutate inputs", () => {
    const input = {
      employee: { forename: "J", surname: "D" },
      activeTerms: { reporting_manager_name: "Alex" },
      onboarding: { personal_info: { line_manager: "Sam" } },
    };
    const snap = JSON.stringify(input);
    mapEmployeeToContractDefaults(input);
    expect(JSON.stringify(input)).toBe(snap);
  });
});
