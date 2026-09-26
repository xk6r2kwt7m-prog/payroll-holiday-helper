import { describe, expect, it } from "vitest";
import { timesheetWallParts, timesheetWallToIso } from "@/lib/timesheet-wall-time";

describe("manager timesheet workspace time", () => {
  it("keeps the two dates of an overnight London shift separate", () => {
    const start = timesheetWallToIso("2026-07-02", "22:00", "Europe/London");
    const end = timesheetWallToIso("2026-07-03", "06:00", "Europe/London");
    expect(start).toBe("2026-07-02T21:00:00.000Z");
    expect(end).toBe("2026-07-03T05:00:00.000Z");
    expect((Date.parse(end) - Date.parse(start)) / 3_600_000).toBe(8);
    expect(timesheetWallParts(end, "Europe/London")).toEqual({ date: "2026-07-03", time: "06:00" });
  });

  it("uses the workplace timezone even when the test/browser is elsewhere", () => {
    expect(timesheetWallParts("2026-07-03T00:30:00Z", "Europe/London"))
      .toEqual({ date: "2026-07-03", time: "01:30" });
    expect(timesheetWallToIso("2026-01-03", "09:00", "Europe/London"))
      .toBe("2026-01-03T09:00:00.000Z");
  });

  it("refuses non-existent and repeated DST wall times instead of guessing", () => {
    expect(() => timesheetWallToIso("2026-03-29", "01:30", "Europe/London"))
      .toThrow("does not exist");
    expect(() => timesheetWallToIso("2026-10-25", "01:30", "Europe/London"))
      .toThrow("occurs twice");
  });

  it("rejects invalid dates and unavailable workspace timezone", () => {
    expect(() => timesheetWallToIso("2026-02-31", "08:00", "Europe/London")).toThrow("valid date");
    expect(() => timesheetWallToIso("2026-01-01", "08:00", "")).toThrow("timezone");
  });
});
