import { describe, it, expect } from "vitest";
import { isStarterMarkerForHolidayDialog } from "@/components/holidays/AddHolidayPaymentDialog";

const period = { start_date: "2026-09-01", end_date: "2026-09-30" };

describe("holiday dialog starter marker", () => {
  it("does not label an employee with no start date as a starter", () => {
    expect(isStarterMarkerForHolidayDialog({ status: "active", start_date: null }, period)).toBe(false);
  });

  it("labels an employee whose start date falls inside the period", () => {
    expect(isStarterMarkerForHolidayDialog({ status: "starter", start_date: "2026-09-15" }, period)).toBe(true);
  });

  it("does not label an employee who started in an earlier period", () => {
    expect(isStarterMarkerForHolidayDialog({ status: "active", start_date: "2025-04-01" }, period)).toBe(false);
  });

  it("never labels a leaver as a starter", () => {
    expect(isStarterMarkerForHolidayDialog({ status: "leaver", start_date: "2026-09-10" }, period)).toBe(false);
  });

  it("shows nothing when no period is selected", () => {
    expect(isStarterMarkerForHolidayDialog({ status: "starter", start_date: "2026-09-10" }, null)).toBe(false);
  });
});
