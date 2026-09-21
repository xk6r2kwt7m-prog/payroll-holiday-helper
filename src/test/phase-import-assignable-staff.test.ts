import { describe, expect, it } from "vitest";
import { availableForMatching, remainingForMatching } from "@/lib/payroll-import-assignable";

const period = { start_date: "2026-09-01", end_date: "2026-09-30" };

const staff = [
  { id: "active", forename: "Anna", surname: "Active", status: "active" },
  { id: "starter", forename: "Bea", surname: "Starter", status: "starter" },
  { id: "onboarding", forename: "Cal", surname: "Onboard", status: "onboarding" },
  { id: "old-leaver", forename: "Dan", surname: "Gone", status: "leaver", end_date: "2026-06-30" },
  { id: "final-pay", forename: "Eve", surname: "Leaving", status: "leaver", end_date: "2026-09-12" },
  { id: "archived", forename: "Fay", surname: "Archived", status: "active", archived_at: "2026-01-01" },
  { id: "practice", forename: "Gus", surname: "Test", status: "active", is_test_record: true },
];

describe("timesheet import — who may be offered for an unmatched name", () => {
  it("offers currently employed staff", () => {
    const ids = availableForMatching(staff, period).map((e) => e.id);
    expect(ids).toContain("active");
    expect(ids).toContain("starter");
    expect(ids).toContain("onboarding");
  });

  it("hides leavers who left before the period", () => {
    expect(availableForMatching(staff, period).map((e) => e.id)).not.toContain("old-leaver");
  });

  it("still offers a leaver whose last day falls inside the period", () => {
    expect(availableForMatching(staff, period).map((e) => e.id)).toContain("final-pay");
  });

  it("hides archived and practice records", () => {
    const ids = availableForMatching(staff, period).map((e) => e.id);
    expect(ids).not.toContain("archived");
    expect(ids).not.toContain("practice");
  });

  it("removes anyone already matched to another row", () => {
    const ids = remainingForMatching(staff, period, ["active"]).map((e) => e.id);
    expect(ids).not.toContain("active");
    expect(ids).toContain("starter");
  });

  it("sorts remaining names A–Z", () => {
    const names = availableForMatching(staff, period).map((e) => e.forename);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("hides all leavers when no period dates are known", () => {
    const ids = availableForMatching(staff, null).map((e) => e.id);
    expect(ids).not.toContain("final-pay");
    expect(ids).not.toContain("old-leaver");
  });
});
