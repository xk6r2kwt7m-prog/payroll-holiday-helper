export interface PayrollDataCheck {
  label: string;
  isLoading?: boolean;
  isError?: boolean;
}

/** An unavailable safety check must never look like a successful empty result. */
export function payrollDataBlock(checks: PayrollDataCheck[]): string | null {
  const failed = checks.filter(check => check.isError).map(check => check.label);
  if (failed.length) return `Could not load ${failed.join(", ")}. Retry before continuing.`;
  const loading = checks.filter(check => check.isLoading).map(check => check.label);
  if (loading.length) return `Loading ${loading.join(", ")}… Please wait before continuing.`;
  return null;
}
