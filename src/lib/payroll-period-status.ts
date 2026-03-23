export type PayrollMarker = "active" | "starter" | "leaver";

export interface PayrollStatusEmployee {
  id: string;
  status?: string | null;
  end_date?: string | null;
}

export interface PayrollStatusEntry {
  employee_id: string;
  employees?: {
    status?: string | null;
  } | null;
}

export interface PayrollStatusHolidayPayment {
  employee_id?: string | null;
}

export interface PayrollMarkerEmployee<TEmployee extends PayrollStatusEmployee = PayrollStatusEmployee>
  extends TEmployee {
  payroll_marker: Exclude<PayrollMarker, "active">;
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateWithinPeriod(dateValue?: string | null, startDate?: string | null, endDate?: string | null) {
  const date = normalizeDate(dateValue);
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

export function buildHistoricalEmployeeIds(entries: { employee_id: string }[]) {
  return new Set(entries.map((entry) => entry.employee_id).filter(Boolean));
}

export function buildPayrollPeriodLeaverIds({
  entries,
  holidayPayments,
  allEmployees,
  periodStartDate,
  periodEndDate,
}: {
  entries: PayrollStatusEntry[];
  holidayPayments: PayrollStatusHolidayPayment[];
  allEmployees: PayrollStatusEmployee[];
  periodStartDate?: string | null;
  periodEndDate?: string | null;
}) {
  const inPeriodEmployeeIds = new Set(entries.map((entry) => entry.employee_id).filter(Boolean));
  const leaverIds = new Set<string>();

  for (const payment of holidayPayments) {
    if (payment.employee_id) leaverIds.add(payment.employee_id);
  }

  for (const entry of entries) {
    if (entry.employees?.status === "leaver") {
      leaverIds.add(entry.employee_id);
    }
  }

  for (const employee of allEmployees) {
    if (!inPeriodEmployeeIds.has(employee.id) && !leaverIds.has(employee.id)) continue;

    if (employee.status === "leaver") {
      leaverIds.add(employee.id);
      continue;
    }

    if (isDateWithinPeriod(employee.end_date, periodStartDate, periodEndDate)) {
      leaverIds.add(employee.id);
    }
  }

  return leaverIds;
}

export function getPayrollPeriodMarker({
  employeeId,
  historicalEmployeeIds,
  leaverEmployeeIds,
}: {
  employeeId: string;
  historicalEmployeeIds: Set<string>;
  leaverEmployeeIds: Set<string>;
}): PayrollMarker {
  if (leaverEmployeeIds.has(employeeId)) return "leaver";
  if (!historicalEmployeeIds.has(employeeId)) return "starter";
  return "active";
}

export function buildPayrollMarkerEmployees<TEmployee extends PayrollStatusEmployee>({
  allEmployees,
  currentEmployeeIds,
  historicalEmployeeIds,
  leaverEmployeeIds,
}: {
  allEmployees: TEmployee[];
  currentEmployeeIds: string[];
  historicalEmployeeIds: Set<string>;
  leaverEmployeeIds: Set<string>;
}) {
  const currentSet = new Set(currentEmployeeIds.filter(Boolean));

  return allEmployees.reduce<PayrollMarkerEmployee<TEmployee>[]>((result, employee) => {
    const inCurrentPayroll = currentSet.has(employee.id);
    const marker = getPayrollPeriodMarker({
      employeeId: employee.id,
      historicalEmployeeIds,
      leaverEmployeeIds,
    });

    if (!inCurrentPayroll && marker !== "leaver") {
      return result;
    }

    if (marker === "active") {
      return result;
    }

    result.push({
      ...employee,
      payroll_marker: marker,
    });
    return result;
  }, []);
}