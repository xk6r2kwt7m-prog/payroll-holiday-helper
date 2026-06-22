/**
 * Pure, deterministic calculators for the Settle Leaver "Holiday Entitlement
 * Basis" selector. NO I/O, NO mutations.
 *
 * Source-of-truth rules:
 *   - The runtime canonical balance is `useHolidayYearSummary` (ledger-based).
 *   - These helpers MIRROR that logic and offer narrower / wider scopes:
 *       A. current_period   → one payroll period only (no carry, no history)
 *       B. current_year     → one leave year, ledger-based (matches the canonical hook)
 *       C. full_employment  → full employment ledger, includes all carry-overs and corrections
 *       D. manual           → admin-supplied hours + amount, audit-trailed by the caller
 *   - Default for leavers is C.
 *
 * The comparison helper compares four sources for the same employee+year so the
 * UI can warn the admin if they disagree by > 0.01 h.
 */

import type {
  LedgerRow,
  PaymentRow,
} from "./holiday-ledger-integrity";

export type EntitlementBasis =
  | "current_period"
  | "current_year"
  | "full_employment"
  | "manual";

export interface PayrollEntryLite {
  id: string;
  payroll_period_id: string;
  period_start_date: string; // ISO date
  period_status: string;
  holiday_accrued_hours: number;
  timesheet_hours: number;
}

export interface BalanceSnapshotRow {
  leave_year_start: string;
  hours_accrued: number;
  hours_taken: number;
  hours_carried_over: number;
}

export interface ManualOverride {
  hours: number;
  amount: number;
  reason?: string;
  note?: string;
}

export interface BasisInput {
  basis: EntitlementBasis;
  leaveYear: number;
  selectedPeriodId?: string;
  ledger: LedgerRow[]; // ledger rows for the employee (any year). Filtering is done internally.
  payments: PaymentRow[]; // payments rows for the employee (any year).
  payrollEntries: PayrollEntryLite[]; // entries for this employee (any year).
  manual?: ManualOverride;
}

export interface BasisResult {
  basis: EntitlementBasis;
  accrued: number;
  carryOver: number;
  taken: number;
  paid: number;
  manualAdjustments: number;
  workedHours: number;
  balance: number;
  /** Currency value if there is a known rate; otherwise null. */
  balanceAmount: number | null;
  notes: string[];
}

const yearStartOf = (year: number) => `${year}-01-01`;

function filterLedgerByYear(ledger: LedgerRow[], year: number): LedgerRow[] {
  const ys = yearStartOf(year);
  // ledger rows do not carry leave_year_start in this type, so we use entry_date year as a proxy
  // The canonical hook filters at query time by leave_year_start, so callers should ideally pass
  // only-this-year rows. We add a defensive fallback here.
  return ledger.filter((r) => {
    const d = new Date(r.entry_date);
    return !isNaN(d.getTime()) && d.getUTCFullYear() === year;
  });
}

function sumLedger(rows: LedgerRow[]): {
  accrued: number;
  carryOver: number;
  taken: number;
  manualAdjustments: number;
} {
  let accrued = 0;
  let carryOver = 0;
  let taken = 0;
  let manualAdjustments = 0;
  for (const e of rows) {
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
        manualAdjustments += h;
        if (h >= 0) accrued += h;
        else taken += Math.abs(h);
        break;
    }
  }
  return { accrued, carryOver, taken, manualAdjustments };
}

export function computeBasis(input: BasisInput): BasisResult {
  const { basis, leaveYear, selectedPeriodId, ledger, payments, payrollEntries, manual } = input;
  const ys = yearStartOf(leaveYear);
  const notes: string[] = [];

  if (basis === "manual") {
    const m = manual ?? { hours: 0, amount: 0 };
    notes.push("Manual verified adjustment — overrides all calculated sources.");
    return {
      basis,
      accrued: 0,
      carryOver: 0,
      taken: 0,
      paid: 0,
      manualAdjustments: m.hours,
      workedHours: 0,
      balance: m.hours,
      balanceAmount: m.amount,
      notes,
    };
  }

  if (basis === "current_period") {
    if (!selectedPeriodId) {
      notes.push("No payroll period selected — basis returns zeros.");
      return zero(basis, notes);
    }
    const entries = payrollEntries.filter((e) => e.payroll_period_id === selectedPeriodId);
    const accrued = entries.reduce((s, e) => s + Number(e.holiday_accrued_hours || 0), 0);
    const workedHours = entries.reduce((s, e) => s + Number(e.timesheet_hours || 0), 0);
    const periodPayments = payments.filter((p) => p.payroll_period_id === selectedPeriodId);
    const taken = periodPayments.reduce((s, p) => s + Math.abs(Number(p.hours || 0)), 0);
    const paid = periodPayments.reduce((s, p) => s + Number(p.total || 0), 0);
    notes.push("Scope: this payroll period only. No carry-over, no prior history.");
    return {
      basis,
      accrued,
      carryOver: 0,
      taken,
      paid,
      manualAdjustments: 0,
      workedHours,
      balance: accrued - taken,
      balanceAmount: null,
      notes,
    };
  }

  if (basis === "current_year") {
    const yearLedger = filterLedgerByYear(ledger, leaveYear);
    const sums = sumLedger(yearLedger);
    const yearPayments = payments.filter((p) => p.leave_year_start === ys);
    const paid = yearPayments.reduce((s, p) => s + Number(p.total || 0), 0);
    const workedHours = payrollEntries
      .filter((e) => new Date(e.period_start_date).getUTCFullYear() === leaveYear)
      .reduce((s, e) => s + Number(e.timesheet_hours || 0), 0);
    notes.push("Scope: this leave year. Uses ledger as single source of truth.");
    return {
      basis,
      accrued: sums.accrued,
      carryOver: sums.carryOver,
      taken: sums.taken,
      paid,
      manualAdjustments: sums.manualAdjustments,
      workedHours,
      balance: sums.accrued + sums.carryOver - sums.taken,
      balanceAmount: null,
      notes,
    };
  }

  // full_employment
  const sums = sumLedger(ledger);
  const paid = payments.reduce((s, p) => s + Number(p.total || 0), 0);
  const workedHours = payrollEntries.reduce((s, e) => s + Number(e.timesheet_hours || 0), 0);
  notes.push(
    "Scope: full employment period. Includes every ledger row across all leave years (carry-overs, corrections, manual adjustments).",
  );
  return {
    basis: "full_employment",
    accrued: sums.accrued,
    carryOver: sums.carryOver,
    taken: sums.taken,
    paid,
    manualAdjustments: sums.manualAdjustments,
    workedHours,
    balance: sums.accrued + sums.carryOver - sums.taken,
    balanceAmount: null,
    notes,
  };
}

function zero(basis: EntitlementBasis, notes: string[]): BasisResult {
  return {
    basis,
    accrued: 0,
    carryOver: 0,
    taken: 0,
    paid: 0,
    manualAdjustments: 0,
    workedHours: 0,
    balance: 0,
    balanceAmount: null,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Source comparison                                                   */
/* ------------------------------------------------------------------ */

export interface SourceRow {
  source:
    | "holiday_tab_legacy"
    | "holiday_ledger"
    | "holiday_balances_snapshot"
    | "manual_recalculation";
  label: string;
  accrued: number;
  carryOver: number;
  taken: number;
  paid: number;
  balance: number;
  /** True if data was missing for this source (then values are still 0 but the row is informational only). */
  missing?: boolean;
}

export interface ComparisonInput {
  leaveYear: number;
  ledger: LedgerRow[]; // year-scoped or full
  payments: PaymentRow[];
  payrollEntries: PayrollEntryLite[];
  balanceSnapshot?: BalanceSnapshotRow | null;
  manualRecalculation: BasisResult;
}

export function buildSourceComparison(input: ComparisonInput): SourceRow[] {
  const { leaveYear, ledger, payments, payrollEntries, balanceSnapshot, manualRecalculation } = input;
  const ys = yearStartOf(leaveYear);

  // Legacy computed (Holiday / Leave tab). Only APPROVED periods are committed
  // to payroll, so only their accruals are comparable to the ledger. Draft /
  // pending periods are previews and intentionally excluded — otherwise every
  // in-progress payroll run would surface as a false-positive mismatch.
  const APPROVED_STATUSES = new Set(["approved", "finalised", "finalized"]);
  const legacyAccrued = payrollEntries
    .filter((e) => new Date(e.period_start_date).getUTCFullYear() === leaveYear)
    .filter((e) => APPROVED_STATUSES.has(String(e.period_status || "").toLowerCase()))
    .reduce((s, e) => s + Number(e.holiday_accrued_hours || 0), 0);

  const yearPayments = payments.filter((p) => p.leave_year_start === ys);
  const legacyTaken = yearPayments.reduce((s, p) => s + Math.abs(Number(p.hours || 0)), 0);
  const legacyPaid = yearPayments.reduce((s, p) => s + Number(p.total || 0), 0);
  const legacyCarry = Number(balanceSnapshot?.hours_carried_over ?? 0);
  const legacy: SourceRow = {
    source: "holiday_tab_legacy",
    label: "Holiday / Leave tab (legacy computed)",
    accrued: legacyAccrued,
    carryOver: legacyCarry,
    taken: legacyTaken,
    paid: legacyPaid,
    balance: legacyAccrued + legacyCarry - legacyTaken,
  };

  // Ledger row (filtered to this leave year):
  const yearLedger = filterLedgerByYear(ledger, leaveYear);
  const sums = sumLedger(yearLedger);
  const ledgerRow: SourceRow = {
    source: "holiday_ledger",
    label: "Holiday ledger (single source of truth)",
    accrued: sums.accrued,
    carryOver: sums.carryOver,
    taken: sums.taken,
    paid: legacyPaid, // payments are the same source for paid £
    balance: sums.accrued + sums.carryOver - sums.taken,
  };

  // Snapshot:
  const snapRow: SourceRow = balanceSnapshot
    ? {
        source: "holiday_balances_snapshot",
        label: "Holiday balances snapshot",
        accrued: Number(balanceSnapshot.hours_accrued || 0),
        carryOver: Number(balanceSnapshot.hours_carried_over || 0),
        taken: Number(balanceSnapshot.hours_taken || 0),
        paid: legacyPaid,
        balance:
          Number(balanceSnapshot.hours_accrued || 0) +
          Number(balanceSnapshot.hours_carried_over || 0) -
          Number(balanceSnapshot.hours_taken || 0),
      }
    : {
        source: "holiday_balances_snapshot",
        label: "Holiday balances snapshot",
        accrued: 0,
        carryOver: 0,
        taken: 0,
        paid: 0,
        balance: 0,
        missing: true,
      };

  const manualRow: SourceRow = {
    source: "manual_recalculation",
    label: "Manual recalculation (this dialog)",
    accrued: manualRecalculation.accrued,
    carryOver: manualRecalculation.carryOver,
    taken: manualRecalculation.taken,
    paid: manualRecalculation.paid,
    balance: manualRecalculation.balance,
  };

  return [legacy, ledgerRow, snapRow, manualRow];
}

const FIELDS_TO_COMPARE: (keyof SourceRow)[] = [
  "accrued",
  "carryOver",
  "taken",
  "balance",
];

const TOLERANCE = 0.01;

export interface MismatchReport {
  hasMismatch: boolean;
  pairs: Array<{
    a: SourceRow["source"];
    b: SourceRow["source"];
    field: keyof SourceRow;
    delta: number;
  }>;
}

export function detectMismatch(rows: SourceRow[]): MismatchReport {
  const present = rows.filter((r) => !r.missing);
  const pairs: MismatchReport["pairs"] = [];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      for (const field of FIELDS_TO_COMPARE) {
        const delta = Math.abs(Number(present[i][field]) - Number(present[j][field]));
        if (delta > TOLERANCE) {
          pairs.push({ a: present[i].source, b: present[j].source, field, delta });
        }
      }
    }
  }
  return { hasMismatch: pairs.length > 0, pairs };
}

/* ------------------------------------------------------------------ */
/* Accrual gap detector                                                */
/* ------------------------------------------------------------------ */

export interface AccrualGap {
  payrollEntryId: string;
  payrollPeriodId: string;
  periodStartDate: string;
  periodStatus: string;
  expectedAccrual: number;
}

/**
 * Returns the list of payroll_entries (for the leave year) that have
 * `holiday_accrued_hours > 0` but are NOT represented by a ledger row of
 * type "accrual" whose source_id points back at the payroll entry.
 */
export function findMissingAccrualEntries(input: {
  leaveYear: number;
  ledger: LedgerRow[];
  payrollEntries: PayrollEntryLite[];
}): AccrualGap[] {
  const { leaveYear, ledger, payrollEntries } = input;
  const presentSourceIds = new Set(
    ledger
      .filter((r) => r.entry_type === "accrual" && r.source_table === "payroll_entries" && r.source_id)
      .map((r) => r.source_id as string),
  );
  const gaps: AccrualGap[] = [];
  for (const e of payrollEntries) {
    const periodYear = new Date(e.period_start_date).getUTCFullYear();
    if (periodYear !== leaveYear) continue;
    const expected = Number(e.holiday_accrued_hours || 0);
    if (expected <= 0) continue;
    if (presentSourceIds.has(e.id)) continue;
    gaps.push({
      payrollEntryId: e.id,
      payrollPeriodId: e.payroll_period_id,
      periodStartDate: e.period_start_date,
      periodStatus: e.period_status,
      expectedAccrual: expected,
    });
  }
  return gaps;
}
