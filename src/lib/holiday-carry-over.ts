interface CarrySummary {
  employeeId: string;
  hoursCarriedOver: number;
  hoursAccrued: number;
  hoursTaken: number;
  balance: number;
}

/** Preserve explicitly recorded carry-over, including zero. Legacy fallback
 * applies only when no balance record exists; eligibility policy is unchanged. */
export function addComputedCarryOver<T extends CarrySummary>(base: T[], previous: T[], balances: { employee_id: string }[]): T[] {
  const recorded = new Set(balances.map(row => row.employee_id));
  const previousById = new Map(previous.map(row => [row.employeeId, row]));
  return base.map(row => {
    if (recorded.has(row.employeeId)) return row;
    const carry = Math.max(0, previousById.get(row.employeeId)?.balance ?? 0);
    if (!carry) return row;
    return {
      ...row,
      hoursCarriedOver: row.hoursCarriedOver + carry,
      balance: row.hoursAccrued + row.hoursCarriedOver + carry - row.hoursTaken,
    };
  });
}
