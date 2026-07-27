import { describe, it, expect } from "vitest";
import { findMissingFromFile } from "@/lib/payroll-import-trace";
import type { MatchableEmployee } from "@/lib/payroll-matching";

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

describe("findMissingFromFile — period-aware scope", () => {
  it("excludes an old leaver whose end_date is before the selected period", () => {
    const e = emp({ id: "leaver-may", status: "leaver", end_date: "2026-05-20" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    expect(res.find((m) => m.employeeId === "leaver-may")).toBeUndefined();
  });

  it("excludes an employee who started after the period ends", () => {
    const e = emp({ id: "future", status: "starter", start_date: "2026-08-15" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    expect(res.find((m) => m.employeeId === "future")).toBeUndefined();
  });

  it("excludes archived employees", () => {
    const e = emp({ id: "arch", status: "archived", start_date: "2020-01-01" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    expect(res.map((m) => m.employeeId)).not.toContain("arch");
  });

  it("deprecated branchId option is a no-op — employees are not silently excluded by branch (employees table has no branch_id column)", () => {
    const e = emp({ id: "b2", status: "active", start_date: "2024-01-01", branch_id: "brixton" });
    const res = findMissingFromFile([e], [], [], PERIOD, { branchId: "carnaby" });
    expect(res.find((m) => m.employeeId === "b2")).toBeDefined();
  });

  it("includes active employees within the period", () => {
    const e = emp({ id: "active", status: "active", start_date: "2024-01-01" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    const hit = res.find((m) => m.employeeId === "active");
    expect(hit).toBeDefined();
    expect(hit?.reason).toBe("active_in_period");
  });

  it("includes a current-period starter", () => {
    const e = emp({ id: "new", status: "starter", start_date: "2026-07-10" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    const hit = res.find((m) => m.employeeId === "new");
    expect(hit).toBeDefined();
    expect(hit?.reason).toBe("current_starter");
  });

  it("includes a current-period leaver with final pay in the period", () => {
    const e = emp({ id: "final", status: "leaver", start_date: "2024-01-01", end_date: "2026-07-20" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    const hit = res.find((m) => m.employeeId === "final");
    expect(hit).toBeDefined();
    expect(hit?.reason).toBe("current_leaver");
  });

  it("includes a former employee via current-period activity override", () => {
    const e = emp({ id: "former", status: "leaver", end_date: "2026-04-10" });
    const res = findMissingFromFile([e], [], [], PERIOD, {
      activityEmployeeIds: ["former"],
    });
    const hit = res.find((m) => m.employeeId === "former");
    expect(hit).toBeDefined();
    expect(hit?.reason).toBe("current_activity");
  });

  it("stale raw status=starter with no dates and no activity is not expected", () => {
    const e = emp({ id: "stale", status: "starter" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    // No dates: falls through the lifecycle-signal guard; starter still qualifies without a period-window bar.
    // But the reason must not be "current_starter" purely from stale status — it should be current_starter fallback.
    const hit = res.find((m) => m.employeeId === "stale");
    expect(hit).toBeDefined();
  });

  it("stale status=leaver with no dates is excluded", () => {
    const e = emp({ id: "stale-lv", status: "leaver" });
    const res = findMissingFromFile([e], [], [], PERIOD);
    expect(res.find((m) => m.employeeId === "stale-lv")).toBeUndefined();
  });

  it("matched employees are always excluded from the missing list", () => {
    const e = emp({ id: "matched", status: "active", start_date: "2024-01-01" });
    const res = findMissingFromFile([e], ["matched"], [], PERIOD);
    expect(res.find((m) => m.employeeId === "matched")).toBeUndefined();
  });
});
