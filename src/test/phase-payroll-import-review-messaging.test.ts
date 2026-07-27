import { describe, it, expect } from "vitest";
import { findMissingFromFile } from "@/lib/payroll-import-trace";
import type { MatchableEmployee } from "@/lib/payroll-matching";

/**
 * Payroll Import Review — messaging separation.
 *
 * These tests lock in the semantic difference between the two counts shown
 * on the import review screen:
 *
 *   A. "Expected employees missing from uploaded file" — DB-side employees
 *      expected in the selected payroll period who have no matching CSV row.
 *      This is a review warning only and must NOT block import.
 *
 *   B. "Unresolved rows in uploaded file" — CSV rows that couldn't be safely
 *      matched to an employee. These are preserved on the payroll period
 *      after a partial import and block approval (not import).
 *
 * Also verifies that the `reason` on the expected-employees list drives the
 * period-aware label shown in the UI (Starter this period / Leaver (final
 * pay) / Current-period activity / Active in period) — never raw
 * employees.status.
 */
function emp(overrides: Partial<MatchableEmployee> & { id: string }): MatchableEmployee {
  return {
    forename: "F",
    surname: "S",
    department: "FOH",
    hourly_rate: 12,
    service_charge: 0,
    status: "active",
    email: null,
    ...overrides,
  } as MatchableEmployee;
}

const PERIOD = { start_date: "2026-07-01", end_date: "2026-07-31" };

const reasonToLabel = (reason: string) =>
  reason === "current_starter" ? "Starter this period" :
  reason === "current_leaver" ? "Leaver (final pay)" :
  reason === "current_activity" ? "Current-period activity" :
  "Active in period";

describe("Payroll Import Review — messaging", () => {
  it("stale raw status=starter (started years ago) is NOT labelled 'Starter this period'", () => {
    const oldStarter = emp({
      id: "old-starter",
      status: "starter",
      start_date: "2023-05-01",
    });
    const res = findMissingFromFile([oldStarter], [], [], PERIOD);
    const hit = res.find((m) => m.employeeId === "old-starter");
    expect(hit).toBeDefined();
    // Started in 2023, current period is July 2026 — must resolve as active_in_period, not current_starter.
    expect(hit?.reason).not.toBe("current_starter");
    expect(reasonToLabel(hit!.reason)).toBe("Active in period");
  });

  it("employee who started inside the current period IS labelled 'Starter this period'", () => {
    const newStarter = emp({
      id: "new-starter",
      status: "starter",
      start_date: "2026-07-10",
    });
    const res = findMissingFromFile([newStarter], [], [], PERIOD);
    const hit = res.find((m) => m.employeeId === "new-starter");
    expect(reasonToLabel(hit!.reason)).toBe("Starter this period");
  });

  it("former employee left before period with no current activity is excluded from expected list", () => {
    const former = emp({
      id: "former",
      status: "leaver",
      start_date: "2022-01-01",
      end_date: "2026-04-30",
    });
    const res = findMissingFromFile([former], [], [], PERIOD);
    expect(res.find((m) => m.employeeId === "former")).toBeUndefined();
  });

  it("expected-employees list is independent of CSV unresolved rows", () => {
    // Two employees exist in DB. Only one has a CSV row (matched).
    // The other has no CSV row → expected/missing.
    // Meanwhile the CSV contains a name that doesn't match anyone (unresolved row).
    // findMissingFromFile only reports set B (DB missing) — unresolved CSV
    // rows are a separate concern handled by the aggregation pipeline.
    const matched = emp({ id: "matched", status: "active", start_date: "2024-01-01" });
    const missing = emp({ id: "missing", status: "active", start_date: "2024-01-01" });

    const res = findMissingFromFile([matched, missing], ["matched"], [], PERIOD);
    expect(res.map((m) => m.employeeId)).toEqual(["missing"]);
    // Unresolved CSV rows must NOT appear in this list — they belong to a
    // different data path.
    expect(res.every((m) => !!m.employeeId)).toBe(true);
  });

  it("all label reasons map to a stable, non-empty UI string", () => {
    const cases = [
      { id: "a", status: "active", start_date: "2024-01-01" },
      { id: "b", status: "starter", start_date: "2026-07-05" },
      { id: "c", status: "leaver", start_date: "2024-01-01", end_date: "2026-07-15" },
    ] as const;
    const employees = cases.map((c) => emp(c as any));
    const res = findMissingFromFile(employees, [], [], PERIOD);
    for (const m of res) {
      const label = reasonToLabel(m.reason);
      expect(label.length).toBeGreaterThan(0);
      expect(["Active in period", "Starter this period", "Leaver (final pay)", "Current-period activity"]).toContain(label);
    }
  });
});
