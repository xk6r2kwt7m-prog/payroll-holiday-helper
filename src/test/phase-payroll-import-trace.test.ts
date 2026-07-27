/**
 * Phase: Payroll Timesheet Import — Per-row Trace, Missing-from-file, 0h Visibility
 *
 * Investigation lockdown for the "Paige / Zheng / Lorenzo imported with 0.00 hours" regression.
 *
 * Safety invariants this test enforces (must not regress):
 *   - aggregator uses matchEmployeeRow → saved aliases honoured during CSV parsing
 *   - active employees not present in the file are reported (missing-from-file warning)
 *   - rows with 0.00 hours are surfaced, never silently dropped
 *   - unmatched / ambiguous / requires-review rows are returned in the trace
 *   - the trace + missing-from-file helpers never mutate employee profile data
 *   - existing-draft import preserves rates / bonuses / service charge
 *   - approved periods remain protected
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildRowTrace,
  findMissingFromFile,
  findZeroHourRows,
  findBlockingRows,
} from "@/lib/payroll-import-trace";
import type { MatchableEmployee, SavedAlias } from "@/lib/payroll-matching";

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

const PAIGE = emp({
  id: "emp-paige",
  forename: "Paige Lash ay",
  surname: "Naraine",
});
const ZHENG = emp({ id: "emp-zheng", forename: "Zheng", surname: "Wang" });
const LORENZO = emp({
  id: "emp-lorenzo",
  forename: "Lorenzo Hamza",
  surname: "Giulana",
});
const JOHN = emp({ id: "emp-john", forename: "John", surname: "Smith" });

const employees = [PAIGE, ZHENG, LORENZO, JOHN];

describe("Phase: payroll import trace — Paige / Zheng / Lorenzo regression", () => {
  it("single-token names (Paige / Zheng / Lorenzo) do NOT silently auto-match — they appear as unmatched in the trace", () => {
    const trace = buildRowTrace(
      [
        { csvName: "Paige", hours: 12.5 },
        { csvName: "Zheng", hours: 30.0 },
        { csvName: "Lorenzo", hours: 22.25 },
      ],
      employees,
      [],
    );
    for (const row of trace) {
      expect(row.matchSource).toBe("unmatched");
      expect(row.matchedEmployeeId).toBeUndefined();
      expect(row.requiresReview).toBe(true);
      expect(row.reasonNotImported).toBeTruthy();
    }
  });

  it("saved aliases resolve single-token CSV names to the correct active employee", () => {
    const aliases: SavedAlias[] = [
      {
        raw_timesheet_name: "Paige",
        normalised_timesheet_name: "paige",
        employee_id: PAIGE.id,
        is_active: true,
      },
      {
        raw_timesheet_name: "Zheng",
        normalised_timesheet_name: "zheng",
        employee_id: ZHENG.id,
        is_active: true,
      },
      {
        raw_timesheet_name: "Lorenzo",
        normalised_timesheet_name: "lorenzo",
        employee_id: LORENZO.id,
        is_active: true,
      },
    ];
    const trace = buildRowTrace(
      [
        { csvName: "Paige", hours: 12.5 },
        { csvName: "Zheng", hours: 30.0 },
        { csvName: "Lorenzo", hours: 22.25 },
      ],
      employees,
      aliases,
    );
    expect(trace[0]).toMatchObject({
      matchedEmployeeId: PAIGE.id,
      matchSource: "saved_alias",
      hours: 12.5,
      requiresReview: false,
    });
    expect(trace[1].matchedEmployeeId).toBe(ZHENG.id);
    expect(trace[2].matchedEmployeeId).toBe(LORENZO.id);
  });

  it("missing-from-file warning lists active employees with no matched CSV row", () => {
    const trace = buildRowTrace(
      [
        { csvName: "John Smith", hours: 40 }, // matches John
        { csvName: "Lorenzo", hours: 10 }, // unmatched
      ],
      employees,
      [],
    );
    const matchedIds = trace
      .filter((r) => r.matchedEmployeeId)
      .map((r) => r.matchedEmployeeId as string);
    const missing = findMissingFromFile(employees, matchedIds);
    const missingIds = missing.map((m) => m.employeeId);

    // John matched → not missing. Paige, Zheng, Lorenzo all missing.
    expect(missingIds).toContain(PAIGE.id);
    expect(missingIds).toContain(ZHENG.id);
    expect(missingIds).toContain(LORENZO.id);
    expect(missingIds).not.toContain(JOHN.id);
  });

  it("rows with 0.00 hours are returned by findZeroHourRows (not silently dropped)", () => {
    const trace = buildRowTrace(
      [
        { csvName: "John Smith", hours: 0 },
        { csvName: "John Smith", hours: 8 },
      ],
      employees,
      [],
    );
    const zeros = findZeroHourRows(trace);
    expect(zeros.length).toBe(1);
    expect(zeros[0].hours).toBe(0);
    expect(zeros[0].matchedEmployeeId).toBe(JOHN.id);
  });

  it("unmatched / requires-review rows count as blocking", () => {
    const trace = buildRowTrace(
      [
        { csvName: "John Smith", hours: 8 }, // matched, no review
        { csvName: "Mystery Person", hours: 5 }, // unmatched
      ],
      employees,
      [],
    );
    const blockers = findBlockingRows(trace);
    expect(blockers.length).toBe(1);
    expect(blockers[0].rawName).toBe("Mystery Person");
    expect(blockers[0].matchSource).toBe("unmatched");
  });

  it("saved alias pointing at an inactive (leaver) employee is flagged requiresReview, not silently applied", () => {
    const leaverEmp = emp({
      id: "emp-old",
      forename: "Old",
      surname: "Hand",
      status: "leaver",
    });
    const aliases: SavedAlias[] = [
      {
        raw_timesheet_name: "Oldie",
        normalised_timesheet_name: "oldie",
        employee_id: leaverEmp.id,
        is_active: true,
      },
    ];
    const trace = buildRowTrace(
      [{ csvName: "Oldie", hours: 10 }],
      [...employees, leaverEmp],
      aliases,
    );
    expect(trace[0].matchSource).toBe("saved_alias");
    expect(trace[0].requiresReview).toBe(true);
    expect(trace[0].reasonNotImported).toMatch(/inactive/i);
  });

  it("trace does not mutate the input employee list (no profile-name changes)", () => {
    const snapshot = employees.map((e) => ({ ...e }));
    const aliases: SavedAlias[] = [
      {
        raw_timesheet_name: "Lorenzo",
        normalised_timesheet_name: "lorenzo",
        employee_id: LORENZO.id,
        is_active: true,
      },
    ];
    buildRowTrace(
      [
        { csvName: "Lorenzo", hours: 10 },
        { csvName: "Paige", hours: 5 },
      ],
      employees,
      aliases,
    );
    expect(employees).toEqual(snapshot);
  });

  it("findMissingFromFile excludes archived and leaver employees (only active/starter warned)", () => {
    const archived = emp({ id: "emp-arch", forename: "Past", surname: "Person", status: "archived" });
    const leaver = emp({ id: "emp-lv", forename: "Bye", surname: "Now", status: "leaver" });
    const starter = emp({ id: "emp-start", forename: "New", surname: "Joiner", status: "starter" });
    const result = findMissingFromFile([archived, leaver, starter, JOHN], []);
    const ids = result.map((m) => m.employeeId);
    expect(ids).toContain(starter.id);
    expect(ids).toContain(JOHN.id);
    expect(ids).not.toContain(archived.id);
    expect(ids).not.toContain(leaver.id);
  });
});

describe("Phase: existing-draft import preservation invariants (regression lock)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/payroll/ImportPayrollDialog.tsx"),
    "utf-8",
  );

  it("existing-draft update payload preserves rate / bonuses / service charge", () => {
    // The "if (existing)" branch must only update timesheet-related fields.
    expect(source).toContain("timesheet_hours: hours");
    // Must NOT push rate/bonus/service-charge keys in the existing-entry .update({...}) call.
    const updateBlock = source.match(/\.update\(\s*{\s*timesheet_hours: hours[\s\S]*?\}\s*as any\)/);
    expect(updateBlock).not.toBeNull();
    const block = updateBlock![0];
    expect(block).not.toMatch(/hourly_rate:/);
    expect(block).not.toMatch(/service_charge:/);
    expect(block).not.toMatch(/performance_bonus:/);
    expect(block).not.toMatch(/special_bonus:/);
  });

  it("aggregator uses the alias-aware matcher (matchEmployeeRow), not the legacy matchEmployee", () => {
    // The aggregator function must invoke matchEmployeeRow so saved aliases
    // are honoured at parse time.
    const aggregatorChunk = source.split("function aggregateByEmployee")[1] ?? "";
    expect(aggregatorChunk).toMatch(/matchEmployeeRow\(/);
  });

  it("new payroll periods created by import are always 'draft' (approved periods cannot be created here)", () => {
    expect(source).toMatch(/normalisePayrollStatus\("draft",\s*"draft"\)/);
  });

  it("preview surfaces a 'missing from uploaded file' warning section", () => {
    expect(source).toMatch(/expected employee.*missing from uploaded file/);
  });

  it("preview surfaces matched rows with 0.00 hours for transparency", () => {
    expect(source).toMatch(/matched row.*with 0\.00 hours/);
  });
});
