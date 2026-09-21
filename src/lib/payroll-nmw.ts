/**
 * UK Minimum Wage compliance — authoritative per-payroll-period check.
 *
 * Inclusion / exclusion (HMRC NMW manual, simplified for current data model):
 *
 *   INCLUDED in eligible pay:
 *     - basic pay: timesheet_hours × hourly_rate
 *     - performance_bonus  (paid for work performance)
 *     - special_bonus      (one-off bonus paid in cash via payroll)
 *
 *   EXCLUDED from eligible pay (do not count toward NMW):
 *     - service_charge / tips / tronc                  (HMRC: tips do not count)
 *     - holiday pay & holiday top-ups                  (counted separately)
 *     - premium element of overtime / shift premia     (not modelled yet)
 *     - employer pension / salary sacrifice            (not modelled yet)
 *     - uniform deductions / accommodation offset      (not modelled yet — see TODO)
 *
 *   INCLUDED in hours:
 *     - timesheet_hours (actual worked hours from approved timesheets / imports)
 *
 *   EXCLUDED from hours:
 *     - holiday hours (paid through holiday_payments, not productive work)
 *     - scheduled hours that were never worked
 *
 * Comparison is made on FULL PRECISION pay and hours. Only displayed figures
 * are rounded. A tolerance of £0.005 exists solely to stop decimal rounding
 * noise being reported as a breach.
 *
 * Missing age / date of birth / base rate / apprenticeship information yields
 * `insufficient_data` ("Information missing — unable to verify") and NEVER an
 * automatic non-compliant label.
 *
 * A difference between the payroll rate and the contracted rate is reported
 * separately (`contract_rate_mismatch`) and never changes the NMW status.
 */

import {
  UK_WAGE_RATES,
  getApplicableRateSet,
  calculateAgeYears,
  getWageBandForAge,
  type UkWageBand,
} from "@/lib/uk-minimum-wage";

export type NmwStatus = "compliant" | "at_risk" | "non_compliant" | "insufficient_data";

export type NmwMissingReason =
  | "date_of_birth"
  | "base_rate"
  | "apprentice_status"
  | "hours";

export interface NmwPayrollEntryInput {
  payroll_entry_id?: string | null;
  employee_id: string;
  employee_name: string;
  date_of_birth: string | null | undefined;
  is_apprentice?: boolean;
  /** Undefined/null = apprenticeship status not recorded for this person. */
  apprentice_status_known?: boolean;
  timesheet_hours: number;
  hourly_rate: number;
  service_charge?: number | null;
  performance_bonus?: number | null;
  special_bonus?: number | null;
  /** Active contracted base rate, for the separate mismatch note. */
  contracted_rate?: number | null;
}

export interface NmwResult {
  payroll_entry_id: string | null;
  employee_id: string;
  employee_name: string;
  age_at_period_start: number | null;
  age_band: UkWageBand | "unknown";
  age_band_label: string;
  is_apprentice: boolean;
  required_rate: number;
  effective_rate: number | null;
  eligible_pay: number;
  actual_hours: number;
  status: NmwStatus;
  shortfall: number; // positive number = £ short per pay period; 0 if not non-compliant
  message: string;
  /** Why the check could not be completed (status === "insufficient_data"). */
  missing: NmwMissingReason[];
  /**
   * True when this entry would *only* be compliant if service charge / tips
   * were counted as basic pay. Surfaces the "relying on SC for NMW" risk.
   * Service charge is NEVER added to eligible pay regardless of this flag.
   */
  relies_on_service_charge: boolean;
  /** Contracted base rate on the active employment terms, if known. */
  contracted_rate: number | null;
  /** Payroll rate differs from the contracted rate — NOT a minimum wage breach. */
  contract_rate_mismatch: boolean;
  calculation_basis: {
    basic_pay: number;
    performance_bonus: number;
    special_bonus: number;
    excluded_service_charge: number;
    excluded_holiday_pay: number;
    rate_set_effective_from: string;
  };
}

const BAND_LABELS: Record<UkWageBand, string> = {
  "21_over": "21 and over (NLW)",
  "18_20": "18 to 20",
  under_18: "Under 18",
  apprentice: "Apprentice",
};

const AT_RISK_MARGIN = 0.25;
/** Sub-penny arithmetic noise must never be reported as underpayment. */
export const PENNY_TOLERANCE = 0.005;

export const MISSING_LABEL = "Information missing — unable to verify";

export function evaluatePayrollEntryNmw(
  entry: NmwPayrollEntryInput,
  periodStartIso: string,
): NmwResult {
  const periodStart = new Date(periodStartIso);
  const age = entry.date_of_birth
    ? calculateAgeYears(entry.date_of_birth, periodStart)
    : null;

  const hourlyRate = Number(entry.hourly_rate) || 0;
  const hours = Number(entry.timesheet_hours) || 0;
  const basicPay = hours * hourlyRate;
  const performance = Number(entry.performance_bonus) || 0;
  const special = Number(entry.special_bonus) || 0;
  const eligiblePay = basicPay + performance + special;

  const rateSet = getApplicableRateSet(periodStart);

  const calculation_basis = {
    basic_pay: round2(basicPay),
    performance_bonus: round2(performance),
    special_bonus: round2(special),
    excluded_service_charge: round2(Number(entry.service_charge) || 0),
    excluded_holiday_pay: 0,
    rate_set_effective_from: rateSet.effectiveFrom,
  };

  const contracted =
    entry.contracted_rate === null || entry.contracted_rate === undefined
      ? null
      : Number(entry.contracted_rate);
  const contract_rate_mismatch =
    contracted !== null && hourlyRate > 0
      ? Math.abs(contracted - hourlyRate) > PENNY_TOLERANCE
      : false;

  // Apprenticeship status is only material where it changes the band (under 19
  // or in the first year). If it has not been recorded at all we cannot verify.
  const apprenticeKnown = entry.apprentice_status_known !== false;
  const band = age !== null ? getWageBandForAge(age, !!entry.is_apprentice) : null;
  const apprenticeStatusMaterial =
    age !== null && age < 19 && !apprenticeKnown;

  const base = {
    payroll_entry_id: entry.payroll_entry_id ?? null,
    employee_id: entry.employee_id,
    employee_name: entry.employee_name,
    age_at_period_start: age,
    age_band: (band ?? "unknown") as UkWageBand | "unknown",
    age_band_label: band ? BAND_LABELS[band] : "Unknown — date of birth missing",
    is_apprentice: !!entry.is_apprentice,
    required_rate: band ? rateSet.rates[band] : 0,
    eligible_pay: round2(eligiblePay),
    relies_on_service_charge: false,
    contracted_rate: contracted,
    contract_rate_mismatch,
    calculation_basis,
  };

  const missing: NmwMissingReason[] = [];
  if (age === null) missing.push("date_of_birth");
  if (hourlyRate <= 0) missing.push("base_rate");
  if (apprenticeStatusMaterial) missing.push("apprentice_status");
  if (hours <= 0) missing.push("hours");

  if (missing.length > 0) {
    return {
      ...base,
      effective_rate: null,
      actual_hours: round2(hours),
      status: "insufficient_data",
      shortfall: 0,
      missing,
      message: `${MISSING_LABEL} — ${missing.map(missingText).join("; ")}.`,
    };
  }

  const required = base.required_rate;
  const effective = eligiblePay / hours; // full precision
  const delta = effective - required;

  // A shortfall only exists if the employee is genuinely short by at least one
  // penny across the whole period. Comparing raw floating-point hourly rates
  // wrongly flagged staff paid EXACTLY the legal minimum as non-compliant.
  const rawShortfall = (required - effective) * hours;
  const isShort = round2(rawShortfall) >= 0.01;

  let status: NmwStatus;
  let message: string;
  let shortfall = 0;

  if (isShort) {
    status = "non_compliant";
    shortfall = round2(rawShortfall);
    message = `Below legal minimum (£${effective.toFixed(2)} vs £${required.toFixed(2)}). Short by £${shortfall.toFixed(2)} for the period.`;
  } else if (Math.abs(delta) < PENNY_TOLERANCE) {
    // Paid exactly the legal rate — compliant, never "at risk".
    status = "compliant";
    message = `Paid exactly the legal minimum (£${required.toFixed(2)}). Compliant.`;
  } else if (delta < AT_RISK_MARGIN) {
    status = "at_risk";
    message = `Within £${AT_RISK_MARGIN.toFixed(2)} of legal minimum (£${effective.toFixed(2)} vs £${required.toFixed(2)}).`;
  } else {
    status = "compliant";
    message = `Compliant — effective £${effective.toFixed(2)} vs required £${required.toFixed(2)}.`;
  }

  // "Relies on service charge" — would the entry be compliant if SC was added?
  // SC is NEVER counted in `eligible_pay`; diagnostic flag only, and only when
  // there is a genuine shortfall.
  const sc = Number(entry.service_charge) || 0;
  const effectiveWithSc = (eligiblePay + sc * hours) / hours;
  const relies_on_service_charge =
    sc > 0 && isShort && effectiveWithSc + PENNY_TOLERANCE >= required;

  return {
    ...base,
    effective_rate: round4(effective),
    actual_hours: round2(hours),
    status,
    shortfall,
    missing: [],
    message,
    relies_on_service_charge,
  };
}

function missingText(reason: NmwMissingReason): string {
  switch (reason) {
    case "date_of_birth":
      return "no date of birth on file";
    case "base_rate":
      return "no hourly rate on the pay line";
    case "apprentice_status":
      return "apprenticeship status not recorded";
    case "hours":
      return "no worked hours in this period";
  }
}

export interface NmwSummary {
  total: number;
  compliant: number;
  at_risk: number;
  non_compliant: number;
  insufficient_data: number;
  hasBlockers: boolean;
  /** Payroll rate differs from contracted rate — separate from a breach. */
  contract_rate_mismatch: number;
}

export function summariseNmw(results: NmwResult[]): NmwSummary {
  const s: NmwSummary = {
    total: results.length,
    compliant: 0,
    at_risk: 0,
    non_compliant: 0,
    insufficient_data: 0,
    hasBlockers: false,
    contract_rate_mismatch: 0,
  };
  for (const r of results) {
    s[r.status] += 1;
    if (r.contract_rate_mismatch) s.contract_rate_mismatch += 1;
  }
  s.hasBlockers = s.non_compliant > 0;
  return s;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export { UK_WAGE_RATES };
