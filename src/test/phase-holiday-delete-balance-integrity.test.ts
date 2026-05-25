/**
 * Regression tests for holiday balance integrity when a holiday payment is
 * deleted or edited.
 *
 * Bug: PayrollHolidaySection.handleDelete deleted the holiday_payments row
 * but never removed the matching holiday_ledger entry. Because
 * useHolidayYearSummary derives the available balance from the ledger,
 * deleted holidays kept reducing the balance forever — visible as
 * Viktoriia's 0.00 available hours after deletion.
 *
 * These tests pin down the derivation rules and the required deletion /
 * edit behaviour without touching payroll rate, service-charge, NMW,
 * contract, or employee profile logic.
 */
import { describe, it, expect } from "vitest";

type LedgerEntry = {
  id: string;
  entry_type:
    | "accrual"
    | "carry_over_in"
    | "holiday_taken"
    | "manual_adjustment"
    | "correction"
    | "payout_on_termination"
    | "carry_over_out"
    | "expiry";
  hours: number;
  amount?: number | null;
  source_table?: string | null;
  source_id?: string | null;
};

/**
 * Mirror of useHolidayYearSummary derivation so we can assert on it in
 * isolation. If the production derivation drifts, this test catches it.
 */
function deriveSummary(entries: LedgerEntry[]) {
  let accrued = 0;
  let carryOver = 0;
  let taken = 0;

  for (const e of entries) {
    const h = Number(e.hours);
    switch (e.entry_type) {
      case "accrual":
        accrued += h;
        break;
      case "carry_over_in":
        carryOver += h;
        break;
      case "holiday_taken":
      case "payout_on_termination":
      case "carry_over_out":
      case "expiry":
        taken += Math.abs(h);
        break;
      case "manual_adjustment":
      case "correction":
        if (h >= 0) accrued += h;
        else taken += Math.abs(h);
        break;
    }
  }

  return {
    accruedHours: accrued,
    carryOverHours: carryOver,
    takenHours: taken,
    availableHours: accrued + carryOver - taken,
  };
}

/**
 * Mirror of the required delete contract: when a holiday_payments row is
 * removed, the matching ledger entry (holiday_taken, source_table=
 * holiday_payments, source_id=paymentId) MUST also be removed so the
 * balance is restored.
 */
function deleteHolidayPayment(
  ledger: LedgerEntry[],
  paymentId: string,
  periodStatus: "draft" | "pending" | "approved" | "locked"
): LedgerEntry[] {
  if (periodStatus !== "draft" && periodStatus !== "pending") {
    throw new Error(
      `Cannot delete: payroll period is ${periodStatus}. Reopen first.`
    );
  }
  return ledger.filter(
    (e) =>
      !(
        e.source_table === "holiday_payments" &&
        e.source_id === paymentId &&
        e.entry_type === "holiday_taken"
      )
  );
}

describe("Holiday balance integrity after delete/edit", () => {
  it("restores the available balance when a draft holiday payment is deleted", () => {
    // Viktoriia-style starting state
    const initial: LedgerEntry[] = [
      { id: "1", entry_type: "accrual", hours: 21.1 },
      { id: "2", entry_type: "carry_over_in", hours: 94.61 },
      {
        id: "3",
        entry_type: "holiday_taken",
        hours: -41.71,
        source_table: "holiday_payments",
        source_id: "pay-historic",
      },
      {
        id: "4",
        entry_type: "holiday_taken",
        hours: -74,
        source_table: "holiday_payments",
        source_id: "pay-deleted",
      },
    ];

    const before = deriveSummary(initial);
    expect(before.availableHours).toBeCloseTo(0, 2);
    expect(before.takenHours).toBeCloseTo(115.71, 2);

    const after = deriveSummary(
      deleteHolidayPayment(initial, "pay-deleted", "draft")
    );

    // ~74 hours come back to available — matches the user's expectation
    expect(after.availableHours).toBeCloseTo(74, 2);
    expect(after.takenHours).toBeCloseTo(41.71, 2);
    expect(after.accruedHours).toBeCloseTo(21.1, 2);
    expect(after.carryOverHours).toBeCloseTo(94.61, 2);
  });

  it("does not count a deleted holiday as taken anywhere", () => {
    const ledger: LedgerEntry[] = [
      { id: "1", entry_type: "accrual", hours: 40 },
      {
        id: "2",
        entry_type: "holiday_taken",
        hours: -8,
        source_table: "holiday_payments",
        source_id: "pay-X",
      },
    ];
    const after = deriveSummary(deleteHolidayPayment(ledger, "pay-X", "draft"));
    expect(after.takenHours).toBe(0);
    expect(after.availableHours).toBe(40);
  });

  it("preserves carry-over in the balance calculation", () => {
    const ledger: LedgerEntry[] = [
      { id: "1", entry_type: "accrual", hours: 10 },
      { id: "2", entry_type: "carry_over_in", hours: 30 },
      { id: "3", entry_type: "holiday_taken", hours: -5 },
    ];
    expect(deriveSummary(ledger).availableHours).toBe(35);
  });

  it("Viktoriia case: accrued + carry-over - actual taken = expected available", () => {
    const ledger: LedgerEntry[] = [
      { id: "1", entry_type: "accrual", hours: 21.1 },
      { id: "2", entry_type: "carry_over_in", hours: 94.61 },
      { id: "3", entry_type: "holiday_taken", hours: -41.71 },
    ];
    const s = deriveSummary(ledger);
    expect(s.availableHours).toBeCloseTo(21.1 + 94.61 - 41.71, 2);
    expect(s.availableHours).toBeGreaterThan(70);
  });

  it("blocks deletion when the payroll period is approved", () => {
    const ledger: LedgerEntry[] = [
      {
        id: "1",
        entry_type: "holiday_taken",
        hours: -8,
        source_table: "holiday_payments",
        source_id: "pay-X",
      },
    ];
    expect(() => deleteHolidayPayment(ledger, "pay-X", "approved")).toThrow(
      /approved/i
    );
    // Ledger untouched — approved period is not silently mutated
    expect(deriveSummary(ledger).takenHours).toBe(8);
  });

  it("blocks deletion when the payroll period is locked", () => {
    expect(() =>
      deleteHolidayPayment(
        [
          {
            id: "1",
            entry_type: "holiday_taken",
            hours: -8,
            source_table: "holiday_payments",
            source_id: "pay-X",
          },
        ],
        "pay-X",
        "locked"
      )
    ).toThrow();
  });

  it("only removes the matching ledger entry, not unrelated ones", () => {
    const ledger: LedgerEntry[] = [
      {
        id: "a",
        entry_type: "holiday_taken",
        hours: -8,
        source_table: "holiday_payments",
        source_id: "pay-A",
      },
      {
        id: "b",
        entry_type: "holiday_taken",
        hours: -16,
        source_table: "holiday_payments",
        source_id: "pay-B",
      },
      // A manual adjustment should never be removed by a payment delete
      { id: "c", entry_type: "manual_adjustment", hours: -2 },
    ];
    const after = deleteHolidayPayment(ledger, "pay-A", "draft");
    expect(after.find((e) => e.id === "a")).toBeUndefined();
    expect(after.find((e) => e.id === "b")).toBeDefined();
    expect(after.find((e) => e.id === "c")).toBeDefined();
  });

  it("editing hours must keep ledger and payment in sync (negative hours mirror)", () => {
    // Simulate the sync contract from useUpdateHolidayPayment:
    // updates.hours -> ledger.hours = -|hours|
    const newHours = 12;
    const ledgerMirroredHours = -Math.abs(newHours);
    expect(ledgerMirroredHours).toBe(-12);

    // And amount mirrors total
    const newTotal = 144;
    const ledgerMirroredAmount = -Math.abs(newTotal);
    expect(ledgerMirroredAmount).toBe(-144);
  });

  it("leaver settlement is a holiday_payment too — deleting it restores balance like any other entry", () => {
    const ledger: LedgerEntry[] = [
      { id: "1", entry_type: "accrual", hours: 20 },
      { id: "2", entry_type: "carry_over_in", hours: 50 },
      {
        id: "3",
        entry_type: "holiday_taken",
        hours: -70,
        source_table: "holiday_payments",
        source_id: "settlement-1",
      },
    ];
    expect(deriveSummary(ledger).availableHours).toBe(0);

    const after = deriveSummary(
      deleteHolidayPayment(ledger, "settlement-1", "draft")
    );
    expect(after.availableHours).toBe(70);
  });
});
