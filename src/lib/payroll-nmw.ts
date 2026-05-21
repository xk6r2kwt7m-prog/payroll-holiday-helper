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
 * The result is an AUTHORITATIVE compliance status; rows flagged `non_compliant`
 * must be corrected (e.g. top-up payment + re-import) before the period can be
 * approved. The form-side `MinimumWageCheck` remains an early warning only.
 */

import {
  UK_WAGE_RATES,
  getApplicableRateSet,
  calculateAgeYears,
  getWageBandForAge,
  type UkWageBand,
} from "@/lib/uk-minimum-wage";

export type NmwStatus = "compliant" | "at_risk" | "non_compliant" | "insufficient_data";

export interface NmwPayrollEntryInput {
  payroll_entry_id?: string | null;
  employee_id: string;
  employee_name: string;
  date_of_birth: string | null | undefined;
  is_apprentice?: boolean;
  timesheet_hours: number;
  hourly_rate: number;
  service_charge?: number | null;
  performance_bonus?: number | null;
  special_bonus?: number | null;
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
  /**
   * True when this entry would *only* be compliant if service charge / tips
   * were counted as basic pay. Surfaces the "relying on SC for NMW" risk.
   * Service charge is NEVER added to eligible pay regardless of this flag.
   */
  relies_on_service_charge: boolean;
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

export function evaluatePayrollEntryNmw(
  entry: NmwPayrollEntryInput,
  periodStartIso: string,
): NmwResult {
  const periodStart = new Date(periodStartIso);
  const age = entry.date_of_birth
    ? calculateAgeYears(entry.date_of_birth, periodStart)
    : null;

  const basicPay = (Number(entry.timesheet_hours) || 0) * (Number(entry.hourly_rate) || 0);
  const performance = Number(entry.performance_bonus) || 0;
  const special = Number(entry.special_bonus) || 0;
  const eligiblePay = basicPay + performance + special;
  const hours = Number(entry.timesheet_hours) || 0;

  const rateSet = getApplicableRateSet(periodStart);

  const calculation_basis = {
    basic_pay: round2(basicPay),
    performance_bonus: round2(performance),
    special_bonus: round2(special),
    excluded_service_charge: round2(Number(entry.service_charge) || 0),
    excluded_holiday_pay: 0,
    rate_set_effective_from: rateSet.effectiveFrom,
  };

  if (age === null) {
    return {
      payroll_entry_id: entry.payroll_entry_id ?? null,
      employee_id: entry.employee_id,
      employee_name: entry.employee_name,
      age_at_period_start: null,
      age_band: "unknown",
      age_band_label: "Unknown — DOB missing",
      is_apprentice: !!entry.is_apprentice,
      required_rate: 0,
      effective_rate: null,
      eligible_pay: round2(eligiblePay),
      actual_hours: round2(hours),
      status: "insufficient_data",
      shortfall: 0,
      message: "Date of birth missing — cannot determine minimum wage band.",
      relies_on_service_charge: false,
      calculation_basis,
    };
  }

  const band = getWageBandForAge(age, !!entry.is_apprentice);
  const required = rateSet.rates[band];

  if (hours <= 0) {
    return {
      payroll_entry_id: entry.payroll_entry_id ?? null,
      employee_id: entry.employee_id,
      employee_name: entry.employee_name,
      age_at_period_start: age,
      age_band: band,
      age_band_label: BAND_LABELS[band],
      is_apprentice: !!entry.is_apprentice,
      required_rate: required,
      effective_rate: null,
      eligible_pay: round2(eligiblePay),
      actual_hours: 0,
      status: "insufficient_data",
      shortfall: 0,
      message: "Zero worked hours — minimum wage cannot be tested for this period.",
      relies_on_service_charge: false,
      calculation_basis,
    };
  }

  const effective = eligiblePay / hours;
  const delta = effective - required;

  let status: NmwStatus;
  let message: string;
  let shortfall = 0;

  if (delta < 0) {
    status = "non_compliant";
    shortfall = round2((required - effective) * hours);
    message = `Below legal minimum (£${effective.toFixed(2)} vs £${required.toFixed(2)}). Short by £${shortfall.toFixed(2)} for the period.`;
  } else if (delta < AT_RISK_MARGIN) {
    status = "at_risk";
    message = `Within £${AT_RISK_MARGIN.toFixed(2)} of legal minimum (£${effective.toFixed(2)} vs £${required.toFixed(2)}).`;
  } else {
    status = "compliant";
    message = `Compliant — effective £${effective.toFixed(2)} vs required £${required.toFixed(2)}.`;
  }

  // "Relies on service charge" — would the entry be compliant if SC was added?
  // SC is NEVER counted in `eligible_pay`; this is a diagnostic flag only.
  const sc = Number(entry.service_charge) || 0;
  const effectiveWithSc = hours > 0 ? (eligiblePay + sc * hours) / hours : effective;
  const relies_on_service_charge =
    sc > 0 && effective < required && effectiveWithSc >= required;

  return {
    payroll_entry_id: entry.payroll_entry_id ?? null,
    employee_id: entry.employee_id,
    employee_name: entry.employee_name,
    age_at_period_start: age,
    age_band: band,
    age_band_label: BAND_LABELS[band],
    is_apprentice: !!entry.is_apprentice,
    required_rate: required,
    effective_rate: round4(effective),
    eligible_pay: round2(eligiblePay),
    actual_hours: round2(hours),
    status,
    shortfall,
    message,
    relies_on_service_charge,
    calculation_basis,
  };
}

export interface NmwSummary {
  total: number;
  compliant: number;
  at_risk: number;
  non_compliant: number;
  insufficient_data: number;
  hasBlockers: boolean;
}

export function summariseNmw(results: NmwResult[]): NmwSummary {
  const s: NmwSummary = {
    total: results.length,
    compliant: 0,
    at_risk: 0,
    non_compliant: 0,
    insufficient_data: 0,
    hasBlockers: false,
  };
  for (const r of results) s[r.status] += 1;
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
