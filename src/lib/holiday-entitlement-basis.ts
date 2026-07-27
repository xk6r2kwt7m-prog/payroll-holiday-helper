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
  | "live_accrual"
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
  /**
   * True when the ledger contains BOTH detailed prior-year accrual/taken
   * rows AND a `carry_over_in` row that already summarises them. Settle
   * Leaver MUST block in this case — the raw sum would double-count the
   * prior year.
   */
  carryOverDuplicationDetected?: boolean;
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

  if (basis === "live_accrual") {
    // Uses payroll_entries.holiday_accrued_hours across ALL periods (draft +
    // approved) in the leave year — matches the Leave dashboard so leavers
    // whose accrual has not yet posted to the ledger (draft period) can be
    // settled against the same visible balance.
    const yearEntries = payrollEntries.filter(
      (e) => new Date(e.period_start_date).getUTCFullYear() === leaveYear,
    );
    const accrued = yearEntries.reduce((s, e) => s + Number(e.holiday_accrued_hours || 0), 0);
    const workedHours = yearEntries.reduce((s, e) => s + Number(e.timesheet_hours || 0), 0);
    const yearPayments = payments.filter((p) => p.leave_year_start === ys);
    const taken = yearPayments.reduce((s, p) => s + Math.abs(Number(p.hours || 0)), 0);
    const paid = yearPayments.reduce((s, p) => s + Number(p.total || 0), 0);
    const hasDraft = yearEntries.some(
      (e) => !["approved", "finalised", "finalized"].includes(String(e.period_status || "").toLowerCase()),
    );
    notes.push(
      "Scope: live payroll accrual for this leave year — includes draft and approved periods.",
    );
    if (hasDraft) {
      notes.push(
        "Some accrual in this basis comes from draft periods that have not yet posted to the ledger.",
      );
    }
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

  // full_employment
  //
  // CRITICAL: a naive sum of every ledger row double-counts when both
  // detailed prior-year accrual/taken rows AND a summary `carry_over_in`
  // row for the same prior year are present (system-wide pattern from the
  // 2026-03 holiday_balances backfill). We compute year-by-year and only
  // honour `carry_over_in` when there is no detailed prior-year history
  // to derive the same number from.
  const fe = computeFullEmploymentBalance(ledger);
  const paid = payments.reduce((s, p) => s + Number(p.total || 0), 0);
  const workedHours = payrollEntries.reduce((s, e) => s + Number(e.timesheet_hours || 0), 0);
  notes.push(
    "Scope: full employment period. Year-aware net (carry-over-in is skipped when prior-year detail rows already cover the same hours).",
  );
  if (fe.carryOverDuplicationDetected) {
    notes.push(
      "⚠ Carry-over duplication detected — the ledger contains both prior-year detail rows AND a carry_over_in summary. Settle Leaver is blocked until this is reconciled.",
    );
  }
  return {
    basis: "full_employment",
    accrued: fe.accrued,
    carryOver: fe.carryOver,
    taken: fe.taken,
    paid,
    manualAdjustments: fe.manualAdjustments,
    workedHours,
    balance: fe.balance,
    balanceAmount: null,
    notes,
    carryOverDuplicationDetected: fe.carryOverDuplicationDetected,
  };
}

/**
 * Year-aware full-employment balance calculator.
 *
 * Buckets ledger rows by calendar year (using `entry_date`), and for each
 * year computes: accrued + manual_adjustments − taken.  A `carry_over_in`
 * row for year Y is honoured ONLY when there are no detailed accrual or
 * taken rows in any prior year — otherwise it is treated as a redundant
 * summary that would double-count the detail rows.
 *
 * Returns the same accrued / carryOver / taken / manualAdjustments fields
 * a flat sum would produce, plus a `carryOverDuplicationDetected` flag so
 * the caller can warn or block.
 */
export function computeFullEmploymentBalance(ledger: LedgerRow[]): {
  accrued: number;
  carryOver: number;
  taken: number;
  manualAdjustments: number;
  balance: number;
  carryOverDuplicationDetected: boolean;
} {
  type Bucket = {
    accrued: number;
    carryIn: number;
    taken: number;
    adj: number;
    hasDetail: boolean;
  };
  const buckets = new Map<number, Bucket>();
  const get = (yr: number): Bucket => {
    let b = buckets.get(yr);
    if (!b) {
      b = { accrued: 0, carryIn: 0, taken: 0, adj: 0, hasDetail: false };
      buckets.set(yr, b);
    }
    return b;
  };
  for (const e of ledger) {
    const d = new Date(e.entry_date);
    if (isNaN(d.getTime())) continue;
    const yr = d.getUTCFullYear();
    const b = get(yr);
    const h = Number(e.hours);
    switch (e.entry_type) {
      case "accrual":
        b.accrued += h;
        b.hasDetail = true;
        break;
      case "carry_over_in":
        b.carryIn += h;
        break;
      case "holiday_taken":
      case "payout_on_termination":
      case "carry_over_out":
      case "expiry":
        b.taken += Math.abs(h);
        b.hasDetail = true;
        break;
      case "manual_adjustment":
      case "correction":
        b.adj += h;
        b.hasDetail = true;
        break;
    }
  }

  const years = [...buckets.keys()].sort((a, b) => a - b);
  let accrued = 0;
  let carryOver = 0;
  let taken = 0;
  let manualAdjustments = 0;
  let duplication = false;
  for (const yr of years) {
    const b = buckets.get(yr)!;
    accrued += b.accrued;
    taken += b.taken;
    manualAdjustments += b.adj;
    if (b.carryIn !== 0) {
      const priorHasDetail = years.some(
        (y) => y < yr && buckets.get(y)!.hasDetail,
      );
      if (priorHasDetail) {
        // Skip the carry_over_in — detailed prior rows already cover it.
        duplication = true;
      } else {
        carryOver += b.carryIn;
      }
    }
  }
  return {
    accrued,
    carryOver,
    taken,
    manualAdjustments,
    balance: accrued + carryOver - taken + manualAdjustments,
    carryOverDuplicationDetected: duplication,
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
    | "live_payroll_accrual"
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
  /**
   * Informational note explaining the source (e.g. "includes draft periods —
   * pending ledger posting"). Rendered inline in the UI.
   */
  info?: string;
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

  // Live payroll accrual — sums ALL payroll_entries.holiday_accrued_hours for
  // the year (draft + approved). This is the source used by the Leave
  // dashboard. When it differs from the ledger it usually reflects draft
  // accrual that has not yet posted on payroll approval — a timing
  // difference, NOT a data integrity mismatch.
  const yearEntries = payrollEntries.filter(
    (e) => new Date(e.period_start_date).getUTCFullYear() === leaveYear,
  );
  const liveAccrued = yearEntries.reduce(
    (s, e) => s + Number(e.holiday_accrued_hours || 0),
    0,
  );
  const draftAccrued = yearEntries
    .filter((e) => !APPROVED_STATUSES.has(String(e.period_status || "").toLowerCase()))
    .reduce((s, e) => s + Number(e.holiday_accrued_hours || 0), 0);
  const liveRow: SourceRow = {
    source: "live_payroll_accrual",
    label: "Live payroll accrual (leave dashboard)",
    accrued: liveAccrued,
    carryOver: 0,
    taken: legacyTaken,
    paid: legacyPaid,
    balance: liveAccrued - legacyTaken,
    info:
      draftAccrued > 0.005
        ? `Includes ${formatH(draftAccrued)}h from draft periods — pending ledger posting on approval.`
        : undefined,
  };

  return [legacy, liveRow, ledgerRow, snapRow, manualRow];
}

function formatH(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

const FIELDS_TO_COMPARE: (keyof SourceRow)[] = [
  "accrued",
  "carryOver",
  "taken",
  "balance",
];

const TOLERANCE = 0.01;

export interface MismatchReport {
  /**
   * True only when there is a real (blocking) data integrity mismatch.
   * Draft-vs-ledger timing differences are excluded — see `timingPairs`.
   */
  hasMismatch: boolean;
  pairs: Array<{
    a: SourceRow["source"];
    b: SourceRow["source"];
    field: keyof SourceRow;
    delta: number;
  }>;
  /**
   * Informational pairs: differences that are expected (e.g. live payroll
   * accrual > ledger because of draft accrual that has not yet posted).
   * These MUST NOT block settlement.
   */
  timingPairs: MismatchReport["pairs"];
}

/**
 * A pair is a "timing" difference when it involves live_payroll_accrual and
 * either holiday_ledger or holiday_balances_snapshot — these read from
 * ledger-derived data that only updates when payroll periods are approved.
 * Manual recalculation vs live is also timing (recalculation picks a basis
 * that may exclude draft accrual on purpose).
 */
function isTimingPair(a: SourceRow["source"], b: SourceRow["source"]): boolean {
  const s = new Set([a, b]);
  if (!s.has("live_payroll_accrual")) return false;
  return (
    s.has("holiday_ledger") ||
    s.has("holiday_balances_snapshot") ||
    s.has("holiday_tab_legacy") ||
    s.has("manual_recalculation")
  );
}

export function detectMismatch(rows: SourceRow[]): MismatchReport {
  const present = rows.filter((r) => !r.missing);
  const pairs: MismatchReport["pairs"] = [];
  const timingPairs: MismatchReport["pairs"] = [];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      for (const field of FIELDS_TO_COMPARE) {
        const delta = Math.abs(Number(present[i][field]) - Number(present[j][field]));
        if (delta > TOLERANCE) {
          const entry = { a: present[i].source, b: present[j].source, field, delta };
          if (isTimingPair(entry.a, entry.b)) timingPairs.push(entry);
          else pairs.push(entry);
        }
      }
    }
  }
  return { hasMismatch: pairs.length > 0, pairs, timingPairs };
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
  const APPROVED_STATUSES = new Set(["approved", "finalised", "finalized"]);
  const presentSourceIds = new Set(
    ledger
      .filter((r) => r.entry_type === "accrual" && r.source_table === "payroll_entries" && r.source_id)
      .map((r) => r.source_id as string),
  );
  const gaps: AccrualGap[] = [];
  for (const e of payrollEntries) {
    const periodYear = new Date(e.period_start_date).getUTCFullYear();
    if (periodYear !== leaveYear) continue;
    // Only flag gaps for periods whose accrual should be committed (approved).
    // Draft / pending periods have no obligation to a ledger row yet.
    if (!APPROVED_STATUSES.has(String(e.period_status || "").toLowerCase())) continue;
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

