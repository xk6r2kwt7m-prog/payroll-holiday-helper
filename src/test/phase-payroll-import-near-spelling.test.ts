import { describe, it, expect } from "vitest";
import {
  matchEmployee,
  editDistance,
  type MatchableEmployee,
} from "@/lib/payroll-matching";

const emp = (
  forename: string,
  surname: string,
  over: Partial<MatchableEmployee> = {},
): MatchableEmployee => ({
  id: `${forename}-${surname}`.toLowerCase().replace(/\s+/g, "-"),
  forename,
  surname,
  department: "FOH",
  hourly_rate: 12,
  service_charge: 1,
  status: "active",
  email: null,
  ...over,
});

const staff: MatchableEmployee[] = [
  emp("Akhil", "Vidukula", { status: "starter" }),
  emp("Rafaela", "Barbosa Tramon", { status: "starter" }),
  emp("Sonny James", "Chin", { status: "leaver", end_date: "2026-08-24" }),
  emp("Daniela Patricia", "Da Costa Almeida", {
    status: "leaver",
    end_date: "2026-08-24",
  }),
  emp("Lautasha Runakowashe", "Chipindu", {
    status: "leaver",
    end_date: "2026-08-24",
  }),
  emp("Kiara", "Plaku", {
    status: "leaver",
    end_date: "2026-07-27",
    archived_at: "2026-08-07T18:47:21Z",
  }),
  emp("Sally", "Phipps", {
    status: "leaver",
    end_date: "2026-07-27",
    archived_at: "2026-08-07T18:47:21Z",
  }),
];

describe("payroll import — near-spelling and truncated timesheet names", () => {
  it("computes bounded edit distance", () => {
    expect(editDistance("vidukula", "vudukula")).toBe(1);
    expect(editDistance("chin", "chin")).toBe(0);
    expect(editDistance("plaku", "phipps")).toBeGreaterThan(1);
  });

  it("matches a single-typo surname to the unique employee", () => {
    const r = matchEmployee("Akhil Vudukula", staff);
    expect(r.employee?.surname).toBe("Vidukula");
    expect(r.method).toBe("near_spelling");
    expect(r.requiresReview).toBeFalsy();
  });

  it("matches a truncated forename to the unique employee", () => {
    const r = matchEmployee("Rafa", staff);
    expect(r.employee?.forename).toBe("Rafaela");
    expect(r.requiresReview).toBeFalsy();
  });

  it("matches short first-name-only rows for leavers", () => {
    expect(matchEmployee("Sonny", staff).employee?.surname).toBe("Chin");
    expect(matchEmployee("Lautasha", staff).employee?.surname).toBe("Chipindu");
    expect(matchEmployee("Daniela Almeida", staff).employee?.surname).toBe(
      "Da Costa Almeida",
    );
  });

  it("still resolves archived leavers when they are the only candidate", () => {
    expect(matchEmployee("Kiara", staff).employee?.surname).toBe("Plaku");
    expect(matchEmployee("Sally", staff).employee?.surname).toBe("Phipps");
  });

  it("never guesses when two employees remain plausible", () => {
    const ambiguous = [
      ...staff,
      emp("Lorenzo Hamza", "Guilana", { status: "leaver", end_date: "2026-08-24" }),
      emp("Lorenzo", "Ghilana", { status: "leaver" }),
    ];
    const r = matchEmployee("Lorenzo", ambiguous);
    expect(r.employee).toBeUndefined();
    expect(r.requiresReview).toBe(true);
  });
});
