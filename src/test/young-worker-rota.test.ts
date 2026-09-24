import { describe, it, expect } from "vitest";
import { aggregateRotaIssues, type AggregateRotaIssuesInput } from "@/lib/schedule-rota-issues";
import type { AutoAssignShift } from "@/lib/schedule-auto-assign";

// Week of Mon 2026-09-21 to Sun 2026-09-27
const MON = "2026-09-21";
const TUE = "2026-09-22";
const WED = "2026-09-23";
const THU = "2026-09-24";
const FRI = "2026-09-25";
const SAT = "2026-09-26";
const SUN = "2026-09-27";

// 17-year-old for the whole week (birthday after the week)
const DOB_17 = "2009-10-01";

function shift(id: string, date: string, start: string, end: string, empId = "e1"): AutoAssignShift {
  return { id, employee_id: empId, shift_date: date, start_time: start, end_time: end };
}

function baseInput(shifts: AutoAssignShift[], dob?: string | null): AggregateRotaIssuesInput {
  return {
    shifts,
    employees: [
      {
        id: "e1",
        status: "active",
        forename: "Young",
        surname: "Worker",
        ...(dob !== undefined ? { date_of_birth: dob } : {}),
      },
    ],
    availability: [],
    approvedLeave: [],
  };
}

function youngIssues(input: AggregateRotaIssuesInput) {
  return aggregateRotaIssues(input).filter((i) => i.code === "young_worker_limit");
}

describe("young_worker_limit rota checks", () => {
  it("flags more than 8 hours in a single day", () => {
    const issues = youngIssues(baseInput([shift("s1", MON, "09:00", "18:00")], DOB_17));
    expect(issues.some((i) => i.message.includes("max 8h/day") && i.date === MON)).toBe(true);
  });

  it("does not flag a day of exactly 8 hours", () => {
    const issues = youngIssues(baseInput([shift("s1", MON, "09:00", "17:00")], DOB_17));
    expect(issues.some((i) => i.message.includes("max 8h/day"))).toBe(false);
  });

  it("flags more than 40 hours in the week", () => {
    const shifts = [MON, TUE, WED, THU, FRI, SAT].map((d, i) =>
      shift(`s${i}`, d, "09:00", "16:00")
    ); // 6 × 7h = 42h
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("max 40h/week"))).toBe(true);
  });

  it("does not flag a 40-hour week", () => {
    const shifts = [MON, TUE, WED, THU, FRI].map((d, i) =>
      shift(`s${i}`, d, "09:00", "17:00")
    ); // 5 × 8h = 40h
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("max 40h/week"))).toBe(false);
  });

  it("flags less than 12 hours' rest between shifts on consecutive days", () => {
    const shifts = [
      shift("s1", MON, "12:00", "20:00"),
      shift("s2", TUE, "06:00", "12:00"), // 10h rest
    ];
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("min 12h"))).toBe(true);
  });

  it("does not flag 12 or more hours' rest", () => {
    const shifts = [
      shift("s1", MON, "12:00", "20:00"),
      shift("s2", TUE, "08:00", "14:00"), // exactly 12h rest
    ];
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("min 12h"))).toBe(false);
  });

  it("flags fewer than 2 days off in the week", () => {
    const shifts = [MON, TUE, WED, THU, FRI, SAT].map((d, i) =>
      shift(`s${i}`, d, "10:00", "14:00")
    ); // 6 days worked → 1 day off
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("min 2"))).toBe(true);
  });

  it("does not flag 2 days off in the week", () => {
    const shifts = [MON, TUE, WED, THU, FRI].map((d, i) =>
      shift(`s${i}`, d, "10:00", "14:00")
    ); // 5 days worked → 2 days off
    const issues = youngIssues(baseInput(shifts, DOB_17));
    expect(issues.some((i) => i.message.includes("min 2"))).toBe(false);
  });

  it("flags a shift over 4.5 hours as a break reminder", () => {
    const issues = youngIssues(baseInput([shift("s1", MON, "09:00", "14:00")], DOB_17)); // 5h
    expect(issues.some((i) => i.message.includes("30-minute break"))).toBe(true);
  });

  it("does not flag a shift of exactly 4.5 hours", () => {
    const issues = youngIssues(baseInput([shift("s1", MON, "09:00", "13:30")], DOB_17));
    expect(issues.some((i) => i.message.includes("30-minute break"))).toBe(false);
  });

  it("applies the rules only until the worker turns 18 during the week", () => {
    // Turns 18 on Thursday 2026-09-24
    const dob = "2008-09-24";
    const shifts = [
      shift("s1", WED, "09:00", "18:00"), // 9h at 17 → flagged
      shift("s2", THU, "09:00", "18:00"), // 9h at 18 → not flagged
      shift("s3", FRI, "09:00", "18:00"), // 9h at 18 → not flagged
    ];
    const issues = youngIssues(baseInput(shifts, dob));
    const dayFlags = issues.filter((i) => i.message.includes("max 8h/day"));
    expect(dayFlags).toHaveLength(1);
    expect(dayFlags[0].date).toBe(WED);
    // Weekly total counts only under-18 shifts: 9h, so no 40h flag
    expect(issues.some((i) => i.message.includes("max 40h/week"))).toBe(false);
  });

  it("skips all young-worker checks when date_of_birth is missing", () => {
    const shifts = [
      shift("s1", MON, "09:00", "20:00"), // 11h day
      shift("s2", TUE, "06:00", "18:00"), // short rest + long day
      shift("s3", WED, "09:00", "18:00"),
      shift("s4", THU, "09:00", "18:00"),
      shift("s5", FRI, "09:00", "18:00"),
      shift("s6", SAT, "09:00", "18:00"),
    ];
    const issues = youngIssues(baseInput(shifts)); // no date_of_birth
    expect(issues).toHaveLength(0);
  });

  it("skips all young-worker checks when date_of_birth is null", () => {
    const issues = youngIssues(
      baseInput([shift("s1", MON, "09:00", "20:00")], null)
    );
    expect(issues).toHaveLength(0);
  });

  it("flags nothing for an adult worker", () => {
    const shifts = [MON, TUE, WED, THU, FRI, SAT, SUN].map((d, i) =>
      shift(`s${i}`, d, "09:00", "18:00")
    ); // 7 × 9h = 63h, 0 days off
    const issues = youngIssues(baseInput(shifts, "1990-01-01"));
    expect(issues).toHaveLength(0);
  });
});
