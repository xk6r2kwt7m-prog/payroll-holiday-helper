/**
 * Holiday TAKEN source parity (Aris / Luisa class of bug).
 *
 * The Holidays dashboard summed holiday_payments only, while the employee
 * detail sheet and the Record Holiday Taken dialog read the ledger. Ledger
 * `holiday_taken` rows with no live payment behind them were therefore invisible
 * on the dashboard (Luisa: 25.30 h) and the balance was overstated.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ledgerOnlyTakenByEmployee,
  reversedSourceIds,
  type ReconLedgerRow,
} from "@/lib/holiday-taken-reconciliation";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");
const EMP = "emp-1";

const row = (over: Partial<ReconLedgerRow>): ReconLedgerRow => ({
  id: "l-1",
  employee_id: EMP,
  entry_type: "holiday_taken",
  hours: -10,
  source_table: "holiday_payments",
  source_id: "pay-1",
  ...over,
});

describe("Holiday taken — ledger vs payments parity", () => {
  it("ignores taken rows already represented by a live payment", () => {
    const map = ledgerOnlyTakenByEmployee([row({})], new Set(["pay-1"]));
    expect(map.get(EMP)).toBeUndefined();
  });

  it("counts backfilled taken rows with no payment source (Luisa's 25.30 h)", () => {
    const map = ledgerOnlyTakenByEmployee(
      [
        row({ id: "l-pay", hours: -74.95, source_id: "pay-live" }),
        row({
          id: "l-backfill",
          hours: -25.3,
          source_table: "holiday_balances",
          source_id: EMP,
        }),
      ],
      new Set(["pay-live"]),
    );
    expect(map.get(EMP)).toBeCloseTo(25.3, 2);
  });

  it("counts taken rows whose payment was deleted (orphans)", () => {
    const map = ledgerOnlyTakenByEmployee([row({ hours: -40 })], new Set());
    expect(map.get(EMP)).toBeCloseTo(40, 2);
  });

  it("excludes taken rows already reversed by a correction", () => {
    const rows: ReconLedgerRow[] = [
      row({ id: "l-orphan", hours: -187, source_id: "pay-gone" }),
      {
        id: "l-corr",
        employee_id: EMP,
        entry_type: "correction",
        hours: 187,
        source_table: "holiday_payments",
        source_id: "pay-gone",
      },
    ];
    expect(reversedSourceIds(rows).has("pay-gone")).toBe(true);
    expect(ledgerOnlyTakenByEmployee(rows, new Set()).get(EMP)).toBeUndefined();
  });

  it("includes leaver payouts held only in the ledger", () => {
    const map = ledgerOnlyTakenByEmployee(
      [row({ entry_type: "payout_on_termination", hours: -40.16, source_id: "pay-gone" })],
      new Set(),
    );
    expect(map.get(EMP)).toBeCloseTo(40.16, 2);
  });

  it("Holidays dashboard applies the ledger reconciliation", () => {
    const src = read("pages/Holidays.tsx");
    expect(src).toContain("ledgerOnlyTakenByEmployee");
    expect(src).toContain("useLedgerTakenRowsByYear");
    for (const y of [2022, 2023, 2024, 2025, 2026]) {
      expect(src).toContain(`ledgerRows${y}`);
    }
  });

  it("reconciliation module stays read-only", async () => {
    const mod = await import("@/lib/holiday-taken-reconciliation");
    for (const name of Object.keys(mod)) {
      for (const banned of ["insert", "update", "delete", "save", "mutate"]) {
        expect(name.toLowerCase()).not.toContain(banned);
      }
    }
  });
});
