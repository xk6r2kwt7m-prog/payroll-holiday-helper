import { describe, it, expect } from "vitest";
import {
  isCurrentEmployee,
  isCurrentStarter,
  isFormerEmployee,
  isRelevantForOnboardingAttention,
  getPeopleDashboardCounts,
  type LifecycleEmployee,
} from "@/lib/employee-lifecycle-display";

const today = new Date("2026-07-27T12:00:00Z");

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const mk = (o: Partial<LifecycleEmployee> & { id: string }): LifecycleEmployee => ({
  status: "active",
  ...o,
});

describe("employee-lifecycle-display", () => {
  it("start_date last month is NOT a current starter (default 30d window)", () => {
    const emp = mk({ id: "1", status: "starter", start_date: daysAgo(45) });
    expect(isCurrentStarter(emp, today)).toBe(false);
  });

  it("start_date inside window IS a current starter", () => {
    const emp = mk({ id: "2", status: "active", start_date: daysAgo(10) });
    expect(isCurrentStarter(emp, today)).toBe(true);
  });

  it("raw status=starter alone (no recent start_date) is NOT a current starter", () => {
    const emp = mk({ id: "3", status: "starter", start_date: daysAgo(400) });
    expect(isCurrentStarter(emp, today)).toBe(false);
  });

  it("old status=starter but employed = counted as active, not starter", () => {
    const emp = mk({ id: "4", status: "starter", start_date: daysAgo(400) });
    expect(isCurrentEmployee(emp, today)).toBe(true);
    expect(isCurrentStarter(emp, today)).toBe(false);
  });

  it("end_date before today excluded from active", () => {
    const emp = mk({ id: "5", status: "leaver", start_date: daysAgo(200), end_date: daysAgo(10) });
    expect(isCurrentEmployee(emp, today)).toBe(false);
    expect(isFormerEmployee(emp, today)).toBe(true);
  });

  it("archived excluded from active and starter", () => {
    const emp = mk({
      id: "6",
      status: "starter",
      start_date: daysAgo(5),
      archived_at: daysAgo(1) + "T00:00:00Z",
    });
    expect(isCurrentEmployee(emp, today)).toBe(false);
    expect(isCurrentStarter(emp, today)).toBe(false);
    expect(isFormerEmployee(emp, today)).toBe(true);
  });

  it("onboarding count excludes leavers", () => {
    const emps: LifecycleEmployee[] = [
      mk({ id: "a", status: "onboarding", start_date: daysAhead(5) }),
      mk({ id: "b", status: "onboarding", end_date: daysAgo(30) }),
      mk({ id: "c", status: "leaver", end_date: daysAgo(30) }),
    ];
    const c = getPeopleDashboardCounts(emps, today);
    expect(c.onboarding).toBe(1);
    expect(c.former).toBe(2);
  });

  it("incomplete onboarding attention excludes archived / old leavers", () => {
    const archived = mk({
      id: "x",
      status: "starter",
      start_date: daysAgo(2),
      archived_at: daysAgo(1) + "T00:00:00Z",
    });
    const oldLeaver = mk({ id: "y", status: "leaver", end_date: daysAgo(60) });
    const realStarter = mk({ id: "z", status: "active", start_date: daysAgo(3) });
    expect(isRelevantForOnboardingAttention(archived, today)).toBe(false);
    expect(isRelevantForOnboardingAttention(oldLeaver, today)).toBe(false);
    expect(isRelevantForOnboardingAttention(realStarter, today)).toBe(true);
  });

  it("aggregate counts on a mixed dataset", () => {
    const emps: LifecycleEmployee[] = [
      mk({ id: "1", status: "active", start_date: daysAgo(400) }), // active
      mk({ id: "2", status: "starter", start_date: daysAgo(400) }), // stale starter -> active
      mk({ id: "3", status: "active", start_date: daysAgo(10) }), // active + starter
      mk({ id: "4", status: "onboarding", start_date: daysAhead(5) }), // onboarding upcoming
      mk({ id: "5", status: "leaver", end_date: daysAgo(30) }), // former
      mk({ id: "6", status: "starter", start_date: daysAgo(3), archived_at: daysAgo(1) + "T00:00:00Z" }), // former
    ];
    const c = getPeopleDashboardCounts(emps, today);
    expect(c.active).toBe(3);
    expect(c.starters).toBe(1);
    expect(c.onboarding).toBe(1);
    expect(c.former).toBe(2);
    // incomplete = onboarding(upcoming) + one current starter
    expect(c.incompleteOnboarding).toBe(2);
  });

  it("payroll period window overrides day-count when supplied", () => {
    const emp = mk({ id: "p", start_date: daysAgo(45) });
    const withinPeriod = isCurrentStarter(emp, today, {
      periodStart: daysAgo(60),
      periodEnd: daysAgo(30),
    });
    expect(withinPeriod).toBe(true);
    const outsidePeriod = isCurrentStarter(emp, today, {
      periodStart: daysAgo(10),
      periodEnd: iso(today),
    });
    expect(outsidePeriod).toBe(false);
  });

  it("employee with future start_date is not yet active but is relevant to onboarding", () => {
    const emp = mk({ id: "f", status: "starter", start_date: daysAhead(10) });
    expect(isCurrentEmployee(emp, today)).toBe(false);
    expect(isCurrentStarter(emp, today)).toBe(false);
    expect(isRelevantForOnboardingAttention(emp, today)).toBe(true);
  });
});
