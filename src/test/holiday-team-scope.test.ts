import { describe, expect, it } from "vitest";
import { filterHolidayTeam } from "@/lib/holiday-team-scope";

const today = new Date(2026, 8, 26, 12);
const employees = [
  { id: "current", status: "active" },
  { id: "old", status: "leaver", end_date: "2024-01-01" },
  { id: "stale-status", status: "active", end_date: "2026-09-25" },
  { id: "notice", status: "leaver", end_date: "2026-10-01" },
  { id: "last-day", status: "leaver", end_date: "2026-09-26" },
  { id: "undated", status: "leaver" },
  { id: "archived", status: "active", archived_at: "2026-01-01" },
  { id: "future", status: "starter", start_date: "2026-10-01" },
];
const summaries = [...employees.map(e => ({ employeeId: e.id, balance: 10 })), { employeeId: "missing", balance: -5 }];
const ids = (rows: typeof summaries) => rows.map(row => row.employeeId);

describe("holiday team display scope", () => {
  it("shows only the current team, retaining staff through their final day", () => {
    expect(ids(filterHolidayTeam(summaries, employees, "current", today))).toEqual(["current", "notice", "last-day"]);
  });
  it("makes former staff and outstanding balances available separately", () => {
    const result = filterHolidayTeam(summaries, employees, "former", today);
    expect(ids(result)).toEqual(["old", "stale-status", "undated", "archived"]);
    expect(result.every(row => row.balance === 10)).toBe(true);
  });
  it("retains future starters and unmatched historical records in All records", () => {
    expect(filterHolidayTeam(summaries, employees, "all", today)).toEqual(summaries);
  });
  it("does not mutate or recalculate any historical balance", () => {
    const before = structuredClone(summaries);
    filterHolidayTeam(summaries, employees, "current", today);
    expect(summaries).toEqual(before);
  });
  it("moves a leaver out of the current view the day after their final day", () => {
    const tomorrow = new Date(2026, 8, 27, 12);
    expect(ids(filterHolidayTeam(summaries, employees, "current", tomorrow))).not.toContain("last-day");
    expect(ids(filterHolidayTeam(summaries, employees, "former", tomorrow))).toContain("last-day");
  });
  it("responds to corrections to employment status without changing history", () => {
    expect(ids(filterHolidayTeam(summaries, [{ id: "old", status: "active", end_date: null }], "current", today))).toEqual(["old"]);
  });
  it("never infers current employment from a historical transaction alone", () => {
    expect(filterHolidayTeam(summaries, [], "current", today)).toEqual([]);
    expect(filterHolidayTeam(summaries, [], "all", today)).toEqual(summaries);
  });
});
