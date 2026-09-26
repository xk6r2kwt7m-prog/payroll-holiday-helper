import { isCurrentEmployee, isFormerEmployee, type LifecycleEmployee } from "./employee-lifecycle-display";

export type HolidayTeamScope = "current" | "former" | "all";

/** Display filter only. Never remove historical inputs before calculating balances. */
export function filterHolidayTeam<T extends { employeeId: string }>(
  summaries: readonly T[], employees: readonly LifecycleEmployee[], scope: HolidayTeamScope, today: Date,
): T[] {
  const profiles = new Map(employees.map(employee => [employee.id, employee]));
  return summaries.filter(summary => {
    if (scope === "all") return true;
    const employee = profiles.get(summary.employeeId);
    if (!employee) return false; // Unresolved profiles remain available in All records.
    return scope === "former" ? isFormerEmployee(employee, today) : isCurrentEmployee(employee, today);
  });
}
