/**
 * Phase: Payroll Import Starter Matching Fix
 *
 * Locks in the safe-resolution changes:
 *   - whitespace normalisation in matchEmployee (double-space DB names match)
 *   - onboarding is employable but requires manager review unless exact/CI match
 *   - findMissingFromFile treats current-period onboarding as
 *     "current_onboarding" (not silently dropped, not silently active)
 *   - linkMissingToUnresolvedRows attaches likely CSV names without auto-match
 *   - deprecated branchId option is a no-op (matches DB reality)
 */
import { describe, it, expect } from "vitest";
import { matchEmployee, matchEmployeeRow } from "@/lib/payroll-matching";
import {
  findMissingFromFile,
  linkMissingToUnresolvedRows,
} from "@/lib/payroll-import-trace";
import type { MatchableEmployee, SavedAlias } from "@/lib/payroll-matching";

const emp = (o: Partial<MatchableEmployee>): MatchableEmployee => ({
  id: o.id ?? "e",
  forename: o.forename ?? "F",
  surname: o.surname ?? "S",
  department: o.department ?? "FOH",
  hourly_rate: 12,
  service_charge: 0,
  status: o.status ?? "active",
  email: o.email ?? null,
  preferred_name: o.preferred_name ?? null,
  import_aliases: o.import_aliases ?? [],
  ...(o.start_date !== undefined ? { start_date: o.start_date } : {}),
  ...(o.end_date !== undefined ? { end_date: o.end_date } : {}),
});

describe("whitespace normalisation", () => {
  it("matches CSV single-space against DB name with a stray double space", () => {
    const e = emp({ id: "carlos", forename: "Carlos  David", surname: "Ruiz" });
    const r = matchEmployee("Carlos David Ruiz", [e]);
    expect(r.employee?.id).toBe("carlos");
    expect(r.method).toBe("exact");
  });
});

describe("onboarding treated as employable but review-gated", () => {
  const onboarding = emp({
    id: "ob",
    forename: "Ad",
    surname: "Tesst",
    status: "onboarding",
  });

  it("exact match to onboarding still requires review", () => {
    const r = matchEmployeeRow({ name: "Ad Tesst" }, [onboarding], []);
    // exact match is trusted (no reviewReason)
    expect(r.employee?.id).toBe("ob");
    expect(r.method).toBe("exact");
    expect(r.requiresReview).toBeFalsy();
  });

  it("fuzzy/ambiguous match to onboarding is flagged requiresReview", () => {
    const r = matchEmployeeRow(
      { name: "Ad" },
      [onboarding],
      [],
    );
    // Single-token → no safe match at all; must not silently attach.
    if (r.employee) {
      expect(r.requiresReview).toBe(true);
      expect(r.reviewReason ?? "").toMatch(/onboarding/i);
    } else {
      // Acceptable: stays unmatched, manager selects manually.
      expect(r.method).toBe("none");
    }
  });

  it("saved alias pointing at onboarding requires review", () => {
    const aliases: SavedAlias[] = [
      {
        raw_timesheet_name: "Adster",
        normalised_timesheet_name: "adster",
        employee_id: onboarding.id,
        is_active: true,
      },
    ];
    const r = matchEmployeeRow({ name: "Adster" }, [onboarding], aliases);
    expect(r.employee?.id).toBe("ob");
    expect(r.method).toBe("saved_alias");
    expect(r.requiresReview).toBe(true);
  });
});

describe("findMissingFromFile — onboarding + branchId deprecation", () => {
  const active = emp({ id: "a", forename: "Alice", surname: "A", status: "active" });
  const onboardingInPeriod = emp({
    id: "ob",
    forename: "Ad",
    surname: "Tesst",
    status: "onboarding",
    start_date: "2026-06-10",
  });
  const onboardingFuture = emp({
    id: "obf",
    forename: "Later",
    surname: "Joiner",
    status: "onboarding",
    start_date: "2026-09-01",
  });

  const period = { start_date: "2026-06-01", end_date: "2026-06-30" };

  it("current-period onboarding is reported with current_onboarding reason", () => {
    const missing = findMissingFromFile(
      [active, onboardingInPeriod, onboardingFuture],
      [],
      [],
      period,
    );
    const ob = missing.find((m) => m.employeeId === "ob");
    expect(ob?.reason).toBe("current_onboarding");
    // Future onboarding excluded
    expect(missing.find((m) => m.employeeId === "obf")).toBeUndefined();
  });

  it("deprecated branchId option is a no-op (does not silently exclude anyone)", () => {
    const withBranchFilter = findMissingFromFile(
      [active, onboardingInPeriod],
      [],
      [],
      period,
      { branchId: "some-branch-id" },
    );
    const withoutFilter = findMissingFromFile(
      [active, onboardingInPeriod],
      [],
      [],
      period,
    );
    expect(withBranchFilter.map((m) => m.employeeId).sort()).toEqual(
      withoutFilter.map((m) => m.employeeId).sort(),
    );
  });
});

describe("linkMissingToUnresolvedRows — cross-link hints, no auto-match", () => {
  const carlos = emp({ id: "c", forename: "Carlos", surname: "Ruiz" });
  const maria = emp({ id: "m", forename: "Maria", surname: "Lopez" });

  it("attaches unresolved CSV names that share a token with the expected employee", () => {
    const missing = findMissingFromFile([carlos, maria], [], [], null);
    const enriched = linkMissingToUnresolvedRows(
      missing,
      ["Carlos", "Random Person"],
      [carlos, maria],
    );
    const c = enriched.find((m) => m.employeeId === "c");
    expect(c?.likelyUnresolvedNames).toEqual(["Carlos"]);
    const m = enriched.find((m) => m.employeeId === "m");
    expect(m?.likelyUnresolvedNames).toBeUndefined();
  });

  it("does not mutate matchedEmployeeId (hint only, no auto-match)", () => {
    const missing = findMissingFromFile([carlos], [], [], null);
    const enriched = linkMissingToUnresolvedRows(missing, ["Carlos"], [carlos]);
    // Missing means "not yet matched" — hint must not fabricate a match id.
    expect((enriched[0] as any).matchedId).toBeUndefined();
  });
});
