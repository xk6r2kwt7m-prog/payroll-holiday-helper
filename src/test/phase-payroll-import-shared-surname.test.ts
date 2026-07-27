/**
 * Payroll Import — cross-link safety
 *
 * Locks in the rules for `linkMissingToUnresolvedRows`:
 *   1. Shared surname alone (owned by 2+ employees) MUST NOT create a hint.
 *   2. Forename overlap on any single token IS a valid hint.
 *   3. A token owned by exactly one employee across the workforce IS a valid
 *      hint even if it's their surname.
 *   4. Distinct people with the same double-barrel surname (Bezerra +
 *      Martins) do not link to a lone "Bezerra" or "Martins" CSV row.
 */
import { describe, it, expect } from "vitest";
import {
  findMissingFromFile,
  linkMissingToUnresolvedRows,
} from "@/lib/payroll-import-trace";
import type { MatchableEmployee } from "@/lib/payroll-matching";

const emp = (over: Partial<MatchableEmployee> & { id: string }): MatchableEmployee => ({
  forename: "F",
  surname: "S",
  department: "FOH",
  hourly_rate: 12,
  service_charge: 0,
  status: "active",
  email: null,
  preferred_name: null,
  import_aliases: [],
  ...over,
} as MatchableEmployee);

describe("linkMissingToUnresolvedRows — shared-surname safety", () => {
  it("does NOT link two employees sharing surname 'Bezerra' to a lone 'Bezerra' CSV row", () => {
    const emerson = emp({ id: "e1", forename: "Emerson Henrique Martins", surname: "Bezerra" });
    const nicolas = emp({ id: "e2", forename: "Nicolas Vinicius Martins", surname: "Bezerra" });
    const missing = findMissingFromFile([emerson, nicolas], [], [], null);
    const linked = linkMissingToUnresolvedRows(missing, ["Bezerra"], [emerson, nicolas]);
    for (const m of linked) {
      expect(m.likelyUnresolvedNames ?? []).toEqual([]);
    }
  });

  it("does link when the CSV row includes a forename token (Emerson)", () => {
    const emerson = emp({ id: "e1", forename: "Emerson Henrique Martins", surname: "Bezerra" });
    const nicolas = emp({ id: "e2", forename: "Nicolas Vinicius Martins", surname: "Bezerra" });
    const missing = findMissingFromFile([emerson, nicolas], [], [], null);
    const linked = linkMissingToUnresolvedRows(missing, ["Emerson"], [emerson, nicolas]);
    const hit = linked.find((m) => m.employeeId === "e1");
    const other = linked.find((m) => m.employeeId === "e2");
    expect(hit?.likelyUnresolvedNames).toEqual(["Emerson"]);
    expect(other?.likelyUnresolvedNames ?? []).toEqual([]);
  });

  it("links on a workforce-unique surname (single owner) — 'Giulana' → Lorenzo Hamza Giulana", () => {
    const lorenzo = emp({ id: "e1", forename: "Lorenzo Hamza", surname: "Giulana" });
    const other = emp({ id: "e2", forename: "Jane", surname: "Doe" });
    const missing = findMissingFromFile([lorenzo, other], [], [], null);
    const linked = linkMissingToUnresolvedRows(missing, ["Giulana"], [lorenzo, other]);
    const hit = linked.find((m) => m.employeeId === "e1");
    expect(hit?.likelyUnresolvedNames).toEqual(["Giulana"]);
  });

  it("single-token forename hint — 'Lorenzo' links to Lorenzo Hamza Giulana", () => {
    const lorenzo = emp({ id: "e1", forename: "Lorenzo Hamza", surname: "Giulana" });
    const missing = findMissingFromFile([lorenzo], [], [], null);
    const linked = linkMissingToUnresolvedRows(missing, ["Lorenzo"], [lorenzo]);
    expect(linked[0].likelyUnresolvedNames).toEqual(["Lorenzo"]);
  });

  it("does not link on incidental short/common tokens (min length 3 enforced)", () => {
    const bob = emp({ id: "e1", forename: "Bo", surname: "Al" });
    const linked = linkMissingToUnresolvedRows(
      findMissingFromFile([bob], [], [], null),
      ["Al Bo"],
      [bob],
    );
    // All tokens < 3 chars — no hint should form
    expect(linked[0].likelyUnresolvedNames ?? []).toEqual([]);
  });
});
