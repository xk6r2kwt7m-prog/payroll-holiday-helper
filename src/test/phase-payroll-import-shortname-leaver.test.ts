import { describe, it, expect } from "vitest";
import {
  matchEmployee,
  matchEmployeeRow,
  findShortNameCandidates,
  leaverPayableInPeriod,
  type MatchableEmployee,
  type SavedAlias,
} from "@/lib/payroll-matching";

const base = {
  department: "FOH",
  hourly_rate: 12.5,
  service_charge: 0,
  email: null,
  preferred_name: null,
  import_aliases: [] as string[],
  status: "active" as const,
};

const CLEO: MatchableEmployee = {
  ...base,
  id: "cleo",
  forename: "Cleo",
  surname: "Howard",
  status: "leaver",
  start_date: "2026-07-26",
  end_date: "2026-08-24",
};

const SONNY: MatchableEmployee = {
  ...base,
  id: "sonny",
  forename: "Sonny James",
  surname: "Chin",
  status: "leaver",
  start_date: "2026-07-23",
  end_date: "2026-08-24",
};

const DANIELA: MatchableEmployee = {
  ...base,
  id: "daniela",
  forename: "Daniela Patricia",
  surname: "Da Costa Almeida",
  status: "leaver",
  end_date: "2026-08-24",
};

const PRISTON: MatchableEmployee = {
  ...base,
  id: "priston",
  forename: "Priston",
  surname: "Almeida",
  status: "leaver",
  end_date: null,
};

const LORENZO_A: MatchableEmployee = {
  ...base,
  id: "lorenzo-a",
  forename: "Lorenzo Hamza",
  surname: "Guilana",
  status: "leaver",
  end_date: "2026-08-24",
};

const LORENZO_B: MatchableEmployee = {
  ...base,
  id: "lorenzo-b",
  forename: "Lorenzo",
  surname: "Ghilana",
  status: "leaver",
  end_date: null,
};

const OLD_LEAVER: MatchableEmployee = {
  ...base,
  id: "old",
  forename: "Gone",
  surname: "Longago",
  status: "leaver",
  end_date: "2025-01-31",
};

const PERIOD = { start_date: "2026-07-20", end_date: "2026-08-23" };

describe("short-name matching", () => {
  it("matches a first-name-only file row to a unique full legal name", () => {
    const r = matchEmployee("Cleo", [CLEO, SONNY]);
    expect(r.employee?.id).toBe("cleo");
    expect(r.method).toBe("short_name");
  });

  it("matches a shortened first name against multi-token forenames", () => {
    expect(matchEmployee("Sonny", [SONNY, CLEO]).employee?.id).toBe("sonny");
  });

  it("matches forename + last surname token against a long legal name", () => {
    const r = matchEmployee("Daniela Almeida", [DANIELA, PRISTON]);
    expect(r.employee?.id).toBe("daniela");
  });

  it("never guesses when two employees share the same first name", () => {
    const r = matchEmployee("Lorenzo", [LORENZO_A, LORENZO_B]);
    expect(r.employee).toBeUndefined();
    expect(r.requiresReview).toBe(true);
    expect(r.reviewReason).toContain("Lorenzo");
  });

  it("ignores archived records as short-name candidates", () => {
    const archived = { ...CLEO, archived_at: "2026-08-01" };
    expect(findShortNameCandidates("Cleo", [archived])).toHaveLength(1);
    expect(matchEmployee("Cleo", [archived]).employee).toBeUndefined();
  });

  it("prefers an employable candidate over a leaver with the same first name", () => {
    const activeCleo = { ...CLEO, id: "cleo-active", surname: "Winter", status: "active" };
    expect(matchEmployee("Cleo", [CLEO, activeCleo]).employee?.id).toBe("cleo-active");
  });
});

describe("leavers who worked inside the period", () => {
  it("treats a leaving date on/after period start as payable", () => {
    expect(leaverPayableInPeriod(CLEO, PERIOD)).toBe(true);
    expect(leaverPayableInPeriod(OLD_LEAVER, PERIOD)).toBe(false);
    expect(leaverPayableInPeriod({ end_date: null }, PERIOD)).toBe(false);
  });

  it("auto-matches an alias pointing at a leaver who left during the period", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Cleo",
      normalised_timesheet_name: "cleo",
      employee_id: "cleo",
      is_active: true,
    };
    const r = matchEmployeeRow({ name: "Cleo" }, [CLEO], [alias], PERIOD);
    expect(r.employee?.id).toBe("cleo");
    expect(r.requiresReview).toBeFalsy();
  });

  it("still holds an alias pointing at a leaver who left before the period", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Gone",
      normalised_timesheet_name: "gone",
      employee_id: "old",
      is_active: true,
    };
    const r = matchEmployeeRow({ name: "Gone" }, [OLD_LEAVER], [alias], PERIOD);
    expect(r.requiresReview).toBe(true);
  });

  it("holds an alias to an inactive employee when no period is supplied", () => {
    const alias: SavedAlias = {
      raw_timesheet_name: "Cleo",
      normalised_timesheet_name: "cleo",
      employee_id: "cleo",
      is_active: true,
    };
    expect(matchEmployeeRow({ name: "Cleo" }, [CLEO], [alias]).requiresReview).toBe(true);
  });
});
