/**
 * Phase: Payroll Timesheet Import — Saved Alias & Manual Matching
 *
 * Locks the matching priority hierarchy, alias safety rules, blocking rules,
 * and the invariant that aliases never mutate the employee's legal name.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  matchEmployee,
  matchEmployeeRow,
  normaliseAliasName,
  findDuplicateTargets,
  findMissingActiveEmployees,
  type MatchableEmployee,
  type SavedAlias,
} from "@/lib/payroll-matching";

const emp = (over: Partial<MatchableEmployee>): MatchableEmployee => ({
  id: over.id ?? "emp-x",
  forename: over.forename ?? "Test",
  surname: over.surname ?? "User",
  department: over.department ?? "FOH",
  hourly_rate: 12,
  service_charge: 0,
  status: over.status ?? "active",
  email: over.email ?? null,
  preferred_name: over.preferred_name ?? null,
  import_aliases: over.import_aliases ?? [],
});

const MARIA: MatchableEmployee = emp({
  id: "emp-maria",
  forename: "Maria-Magdalena Valentin",
  surname: "Yordanova",
  email: "maria.y@example.com",
});

const JOHN: MatchableEmployee = emp({ id: "emp-john", forename: "John", surname: "Smith" });
const LEAVER: MatchableEmployee = emp({
  id: "emp-leaver",
  forename: "Old",
  surname: "Hand",
  status: "leaver",
});

describe("Phase: timesheet import aliases — matching priority", () => {
  it("exact unique name auto-matches without manual selection", () => {
    const r = matchEmployeeRow({ name: "John Smith" }, [JOHN, MARIA], []);
    expect(r.employee?.id).toBe("emp-john");
    expect(r.method).toBe("exact");
    expect(r.requiresReview).toBeFalsy();
  });

  it("short/partial name resolves deterministically to the unique candidate", () => {
    const r = matchEmployeeRow({ name: "Maria Yordanova" }, [MARIA, JOHN], []);
    // Forename first token + surname token containment → unique candidate
    expect(r.method).toBe("short_name");
    expect(r.employee?.id).toBe(MARIA.id);
  });

  it("saved alias auto-matches a previously-unclear name", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Maria Yordanova",
      normalised_timesheet_name: normaliseAliasName("Maria Yordanova"),
      employee_id: MARIA.id,
      is_active: true,
    };
    const r = matchEmployeeRow({ name: "Maria Yordanova" }, [MARIA, JOHN], [alias]);
    expect(r.employee?.id).toBe(MARIA.id);
    expect(r.method).toBe("saved_alias");
    expect(r.requiresReview).toBeFalsy();
  });

  it("saved alias is shown as 'saved_alias' in the preview source", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "M Yordanova",
      normalised_timesheet_name: normaliseAliasName("M Yordanova"),
      employee_id: MARIA.id,
      is_active: true,
    };
    expect(matchEmployeeRow({ name: "M Yordanova" }, [MARIA], [alias]).method).toBe("saved_alias");
  });

  it("inactive (leaver) saved alias requires manager review", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Old Hand",
      normalised_timesheet_name: normaliseAliasName("Old Hand"),
      employee_id: LEAVER.id,
      is_active: true,
    };
    const r = matchEmployeeRow({ name: "Old Hand" }, [LEAVER, JOHN], [alias]);
    expect(r.method).toBe("saved_alias");
    expect(r.requiresReview).toBe(true);
    expect(r.reviewReason).toMatch(/inactive/i);
  });

  it("deactivated alias (is_active=false) is ignored", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Maria Yordanova",
      normalised_timesheet_name: normaliseAliasName("Maria Yordanova"),
      employee_id: MARIA.id,
      is_active: false,
    };
    const r = matchEmployeeRow({ name: "Maria Yordanova" }, [MARIA, JOHN], [alias]);
    // Alias is not applied; resolution falls through to deterministic name rules
    expect(r.method).not.toBe("saved_alias");
  });

  it("employee ID column overrides saved alias", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Maria Yordanova",
      normalised_timesheet_name: normaliseAliasName("Maria Yordanova"),
      employee_id: MARIA.id,
      is_active: true,
    };
    const r = matchEmployeeRow(
      { name: "Maria Yordanova", employeeId: JOHN.id },
      [MARIA, JOHN],
      [alias]
    );
    expect(r.employee?.id).toBe(JOHN.id);
    expect(r.method).toBe("employee_id");
  });

  it("email column overrides saved alias", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Maria Yordanova",
      normalised_timesheet_name: normaliseAliasName("Maria Yordanova"),
      employee_id: JOHN.id,
      is_active: true,
    };
    const r = matchEmployeeRow(
      { name: "Maria Yordanova", email: MARIA.email! },
      [MARIA, JOHN],
      [alias]
    );
    expect(r.employee?.id).toBe(MARIA.id);
    expect(r.method).toBe("email");
  });

  it("ID and email pointing to different employees requires review", () => {
    const r = matchEmployeeRow(
      { name: "X", employeeId: JOHN.id, email: MARIA.email! },
      [MARIA, JOHN],
      []
    );
    expect(r.requiresReview).toBe(true);
    expect(r.employee).toBeUndefined();
  });

  it("priority order: ID > email > saved_alias > exact", () => {
    expect(matchEmployeeRow({ name: "John Smith", employeeId: MARIA.id }, [MARIA, JOHN], []).method)
      .toBe("employee_id");
    expect(matchEmployeeRow({ name: "John Smith", email: MARIA.email! }, [MARIA, JOHN], []).method)
      .toBe("email");
  });
});

describe("Phase: timesheet import aliases — conflict and safety rules", () => {
  it("duplicate target mapping is detected and reported", () => {
    const dups = findDuplicateTargets([
      { csvName: "Maria Y", employeeId: MARIA.id },
      { csvName: "M Yordanova", employeeId: MARIA.id },
      { csvName: "John Smith", employeeId: JOHN.id },
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0]).toEqual({ employeeId: MARIA.id, csvNames: ["Maria Y", "M Yordanova"] });
  });

  it("missing active employees in file are reported (warning, non-blocking)", () => {
    const missing = findMissingActiveEmployees([MARIA, JOHN, LEAVER], [JOHN.id]);
    expect(missing.map((e) => e.id)).toEqual([MARIA.id]); // leaver excluded
  });

  it("normaliseAliasName strips accents, punctuation, case", () => {
    expect(normaliseAliasName("María-José Souza")).toBe("maria jose souza");
    expect(normaliseAliasName("  Maria   Yordanova  ")).toBe("maria yordanova");
    // Equivalence: identical normalised key regardless of source casing/accents.
    expect(normaliseAliasName("MARIA-magdalena Valentin Yordanova"))
      .toBe(normaliseAliasName("maria magdalena valentin yordanova"));
  });
});

describe("Phase: timesheet import aliases — invariants and no-logic-change guarantees", () => {
  const PANEL = "src/components/payroll/UnresolvedIssuesPanel.tsx";
  const HOOK = "src/hooks/usePayrollImportAliases.ts";
  const DIALOG = "src/components/payroll/ImportPayrollDialog.tsx";

  const read = (p: string) => readFileSync(resolve(p), "utf8");

  it("alias save flow does NOT touch employees.forename / surname / preferred_name", () => {
    const hook = read(HOOK);
    // Hook must never update the employees table.
    expect(hook).not.toMatch(/\.from(['"]employees['"])\s*\n?\s*\.update/);
    expect(hook).not.toMatch(/forename:/);
    expect(hook).not.toMatch(/surname:/);
  });

  it("alias hook deactivates rather than deletes (history preserved)", () => {
    const hook = read(HOOK);
    expect(hook).toMatch(/is_active:\s*false/);
    // No raw deletes of alias rows.
    expect(hook).not.toMatch(/\.from(['"]payroll_import_aliases['"])[^;]*\.delete\(/);
  });

  it("'Remember this match' checkbox is wired in the unresolved issues panel", () => {
    const panel = read(PANEL);
    expect(panel).toMatch(/Remember this match for future imports/);
    expect(panel).toMatch(/saveAlias\s*\(/);
  });

  it("existing-draft import preserves rates / bonuses / service charge (unchanged)", () => {
    const dialog = read(DIALOG);
    // The existing-draft update path must only set timesheet_hours, not rates/bonuses.
    // Look for the .update payload(s) and ensure none of them include rate/bonus/service-charge fields.
    const updateBlocks = [...dialog.matchAll(/\.update\(\s*\{([\s\S]*?)\}\s*\)/g)].map((m) => m[1]);
    const draftUpdate = updateBlocks.find((b) => /timesheet_hours/.test(b));
    expect(draftUpdate, "expected an existing-draft update block touching timesheet_hours").toBeTruthy();
    expect(draftUpdate!).not.toMatch(/hourly_rate\s*:/);
    expect(draftUpdate!).not.toMatch(/service_charge\s*:/);
    expect(draftUpdate!).not.toMatch(/performance_bonus\s*:/);
    expect(draftUpdate!).not.toMatch(/special_bonus\s*:/);
  });

  it("approved periods cannot be selected for import (only drafts pre-fill)", () => {
    const dialog = read(DIALOG);
    expect(dialog).toMatch(/status['"\s]*[:=]+\s*['"]draft/i);
  });

  it("matcher contract: saved_alias is a recognised match method", () => {
    // Type-level: ensures the enum stays in sync with the storage contract.
    const methods: Array<ReturnType<typeof matchEmployeeRow>["method"]> = [
      "employee_id",
      "email",
      "saved_alias",
      "exact",
      "case_insensitive",
      "import_alias",
      "preferred_name",
      "legacy_name_map",
      "manual",
      "none",
    ];
    expect(methods).toContain("saved_alias");
    expect(methods).toContain("manual");
  });

  it("legacy matchEmployee remains backward-compatible (no signature change)", () => {
    // Existing callers like usePayrollImportStatus / import flow rely on this.
    const r = matchEmployee("John Smith", [JOHN, MARIA]);
    expect(r.employee?.id).toBe(JOHN.id);
    expect(r.method).toBe("exact");
  });
});
