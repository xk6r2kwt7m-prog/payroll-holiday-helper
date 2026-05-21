/**
 * UK National Minimum Wage / National Living Wage rates.
 *
 * This is an EARLY-WARNING check used at the point of editing/creating an
 * employee profile. The authoritative compliance check happens later in
 * payroll, where the EFFECTIVE hourly rate (actual pay ÷ actual hours)
 * must be compared against the legal minimum for the relevant pay period.
 *
 * Source of truth: gov.uk / HMRC NMW & NLW rates.
 */

export type UkWageBand = "21_over" | "18_20" | "under_18" | "apprentice";

export interface UkWageRateSet {
  /** Inclusive start date (ISO yyyy-mm-dd). */
  effectiveFrom: string;
  rates: Record<UkWageBand, number>;
}

/**
 * Chronological list of rate sets. The applicable set is the most recent
 * one whose effectiveFrom is on/before the reference date.
 */
export const UK_WAGE_RATES: UkWageRateSet[] = [
  {
    effectiveFrom: "2025-04-01",
    rates: {
      "21_over": 12.21,
      "18_20": 10.0,
      "under_18": 7.55,
      apprentice: 7.55,
    },
  },
  {
    effectiveFrom: "2026-04-01",
    rates: {
      "21_over": 12.71,
      "18_20": 10.85,
      "under_18": 8.0,
      apprentice: 8.0,
    },
  },
];

export function getApplicableRateSet(referenceDate: Date = new Date()): UkWageRateSet {
  const refIso = referenceDate.toISOString().slice(0, 10);
  const sorted = [...UK_WAGE_RATES].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  let applicable = sorted[0];
  for (const set of sorted) {
    if (set.effectiveFrom <= refIso) applicable = set;
  }
  return applicable;
}

export function calculateAgeYears(dobIso: string, referenceDate: Date = new Date()): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return null;
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function getWageBandForAge(age: number, isApprentice = false): UkWageBand {
  if (isApprentice && age < 19) return "apprentice";
  if (age >= 21) return "21_over";
  if (age >= 18) return "18_20";
  return "under_18";
}

export type ComplianceStatus = "compliant" | "close" | "below" | "unknown";

export interface WageComplianceResult {
  age: number | null;
  band: UkWageBand | null;
  bandLabel: string;
  requiredMinimum: number | null;
  currentRate: number | null;
  status: ComplianceStatus;
  message: string;
  /** Difference (currentRate - requiredMinimum), negative if below. */
  delta: number | null;
}

const BAND_LABELS: Record<UkWageBand, string> = {
  "21_over": "21 and over (NLW)",
  "18_20": "18 to 20",
  under_18: "Under 18",
  apprentice: "Apprentice",
};

export function evaluateWageCompliance(opts: {
  dobIso: string;
  hourlyRate: number | null;
  referenceDate?: Date;
  isApprentice?: boolean;
}): WageComplianceResult {
  const ref = opts.referenceDate ?? new Date();
  const age = calculateAgeYears(opts.dobIso, ref);

  if (age === null) {
    return {
      age: null,
      band: null,
      bandLabel: "",
      requiredMinimum: null,
      currentRate: opts.hourlyRate,
      status: "unknown",
      message: "Add date of birth to check minimum wage compliance.",
      delta: null,
    };
  }

  const band = getWageBandForAge(age, opts.isApprentice);
  const rateSet = getApplicableRateSet(ref);
  const required = rateSet.rates[band];
  const current = opts.hourlyRate;

  if (current === null || isNaN(current) || current <= 0) {
    return {
      age,
      band,
      bandLabel: BAND_LABELS[band],
      requiredMinimum: required,
      currentRate: current,
      status: "unknown",
      message: `Age: ${age} · Required minimum: £${required.toFixed(2)} · Enter an hourly rate to check.`,
      delta: null,
    };
  }

  const delta = current - required;
  let status: ComplianceStatus;
  let label: string;
  if (delta < 0) {
    status = "below";
    label = "Below legal minimum";
  } else if (delta < 0.25) {
    status = "close";
    label = "Close to minimum";
  } else {
    status = "compliant";
    label = "Compliant";
  }

  return {
    age,
    band,
    bandLabel: BAND_LABELS[band],
    requiredMinimum: required,
    currentRate: current,
    status,
    message: `Age: ${age} · Required minimum: £${required.toFixed(2)} · Current rate: £${current.toFixed(2)} · ${label}`,
    delta,
  };
}
