/**
 * UK National Minimum Wage age bands (April 2024 rates).
 * These are WARNING thresholds only — not legal advice.
 * Rates should be reviewed annually against HMRC guidance.
 */

export interface AgeBand {
  label: string;
  minAge: number;
  maxAge: number | null; // null = no upper bound
  minWage: number; // £/hour — UK NMW/NLW as of April 2024
}

export const UK_AGE_BANDS: AgeBand[] = [
  { label: "Under 18", minAge: 0, maxAge: 17, minWage: 6.40 },
  { label: "18–20", minAge: 18, maxAge: 20, minWage: 8.60 },
  { label: "21+", minAge: 21, maxAge: null, minWage: 11.44 },
];

/**
 * Calculate age from date of birth.
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get the applicable age band for a given DOB.
 */
export function getAgeBand(dateOfBirth: string | null | undefined): AgeBand | null {
  const age = calculateAge(dateOfBirth);
  if (age === null) return null;
  return UK_AGE_BANDS.find(
    (band) => age >= band.minAge && (band.maxAge === null || age <= band.maxAge)
  ) ?? null;
}

export interface PayRiskResult {
  hasRisk: boolean;
  ageBand: AgeBand | null;
  age: number | null;
  currentRate: number;
  minimumRate: number | null;
  shortfall: number | null;
}

/**
 * Check whether an employee's pay rate is below the applicable minimum
 * wage band based on their age. Returns a risk assessment.
 *
 * ⚠️ This is a WARNING flag only — not a compliance guarantee.
 */
export function checkPayRisk(
  dateOfBirth: string | null | undefined,
  hourlyRate: number
): PayRiskResult {
  const age = calculateAge(dateOfBirth);
  const ageBand = getAgeBand(dateOfBirth);

  if (!ageBand || age === null) {
    return { hasRisk: false, ageBand: null, age, currentRate: hourlyRate, minimumRate: null, shortfall: null };
  }

  const shortfall = ageBand.minWage - hourlyRate;
  return {
    hasRisk: shortfall > 0,
    ageBand,
    age,
    currentRate: hourlyRate,
    minimumRate: ageBand.minWage,
    shortfall: shortfall > 0 ? Math.round(shortfall * 100) / 100 : null,
  };
}
