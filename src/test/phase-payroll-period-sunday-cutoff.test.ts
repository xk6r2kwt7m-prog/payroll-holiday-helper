import { describe, it, expect } from "vitest";
import { suggestNextPeriod, getLastThursday } from "@/lib/payroll-period-suggestion";

describe("payroll period suggestion — Sunday cutoff", () => {
  it("suggests a 4-week period ending Sunday 19 July 2026 after the June cutoff", () => {
    const s = suggestNextPeriod("2026-06-21", 4);
    expect(s.startDate).toBe("2026-06-22");
    expect(s.endDate).toBe("2026-07-19");
    expect(s.periodWeeks).toBe(4);
    expect(s.periodName).toBe("July 2026");
    expect(s.payDate).toBe("2026-07-30");
  });

  it("supports the occasional 5-week cycle", () => {
    const s = suggestNextPeriod("2026-06-21", 5);
    expect(s.endDate).toBe("2026-07-26");
    expect(s.periodWeeks).toBe(5);
  });

  it("always lands the cutoff on a Sunday", () => {
    for (const weeks of [4, 5]) {
      for (const prev of ["2026-01-25", "2026-02-22", "2026-03-22", "2026-04-19", "2026-05-24"]) {
        const s = suggestNextPeriod(prev, weeks);
        expect(new Date(s.endDate).getUTCDay()).toBe(0);
      }
    }
  });

  it("pay date is the last Thursday of the cutoff month", () => {
    const s = suggestNextPeriod("2026-07-19", 4);
    const end = new Date(s.endDate);
    const thu = getLastThursday(end.getUTCFullYear(), end.getUTCMonth());
    expect(s.payDate).toBe(thu.toISOString().split("T")[0]);
  });
});
