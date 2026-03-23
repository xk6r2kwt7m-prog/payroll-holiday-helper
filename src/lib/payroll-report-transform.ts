/**
 * Payroll report data transformation layer.
 * Single source of truth for grouping payroll data by department, location, or employee.
 * Used by both PDF and CSV export paths.
 */

import type { PayrollEntryLocation } from "@/hooks/usePayrollLocations";

export interface PayrollEntryForReport {
  id: string;
  employee_id: string;
  hourly_rate: number;
  service_charge: number | null;
  timesheet_hours: number;
  performance_bonus: number | null;
  special_bonus: number | null;
  holiday_accrued_hours: number | null;
  total_pay: number;
  notes: string | null;
  employees: {
    forename: string;
    surname: string;
    department: string;
    status: string;
    ni_number: string | null;
    hourly_rate: number;
    service_charge: number | null;
  } | null;
}

export interface GroupSection {
  groupLabel: string;
  entries: PayrollEntryForReport[];
  /** For location grouping, per-employee hours at this location */
  locationHours?: Map<string, number>;
  subtotalHours: number;
  subtotalPay: number;
}

export interface LocationSplitRow {
  entry: PayrollEntryForReport;
  locationName: string;
  locationDepartment: string | null;
  locationHours: number;
  employeeTotalHours: number;
}

/**
 * Group entries by department (existing behaviour).
 */
export function groupByDepartment(entries: PayrollEntryForReport[]): GroupSection[] {
  const deptMap = new Map<string, PayrollEntryForReport[]>();
  for (const e of entries) {
    const dept = e.employees?.department || "Other";
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push(e);
  }
  const deptOrder: Record<string, number> = { FOH: 0, BOH: 1, CPU: 2 };
  return Array.from(deptMap.entries())
    .sort(([a], [b]) => (deptOrder[a] ?? 99) - (deptOrder[b] ?? 99))
    .map(([dept, de]) => ({
      groupLabel: dept,
      entries: de.sort((a, b) => {
        const fA = (a.employees?.forename || "").toLowerCase();
        const fB = (b.employees?.forename || "").toLowerCase();
        if (fA !== fB) return fA.localeCompare(fB);
        return (a.employees?.surname || "").localeCompare(b.employees?.surname || "");
      }),
      subtotalHours: de.reduce((s, e) => s + Number(e.timesheet_hours), 0),
      subtotalPay: de.reduce((s, e) => s + Number(e.total_pay), 0),
    }));
}

/**
 * Group entries by location using payroll_entry_locations data.
 * Each employee appears under every location they worked at, with location-specific hours shown.
 * Total pay is NOT split — it stays on the employee's main entry — but subtotals
 * pro-rate based on hours proportion for meaningful location cost analysis.
 */
export function groupByLocation(
  entries: PayrollEntryForReport[],
  locations: PayrollEntryLocation[]
): GroupSection[] {
  if (locations.length === 0) return [];

  const locMap = new Map<string, { entries: Map<string, PayrollEntryForReport>; hours: Map<string, number> }>();

  for (const loc of locations) {
    if (!locMap.has(loc.location_name)) {
      locMap.set(loc.location_name, { entries: new Map(), hours: new Map() });
    }
    const group = locMap.get(loc.location_name)!;
    const entry = entries.find((e) => e.employee_id === loc.employee_id);
    if (entry) {
      group.entries.set(entry.employee_id, entry);
      group.hours.set(entry.employee_id, (group.hours.get(entry.employee_id) || 0) + Number(loc.hours));
    }
  }

  return Array.from(locMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => {
      const sectionEntries = Array.from(data.entries.values()).sort((a, b) => {
        const fA = (a.employees?.forename || "").toLowerCase();
        const fB = (b.employees?.forename || "").toLowerCase();
        if (fA !== fB) return fA.localeCompare(fB);
        return (a.employees?.surname || "").localeCompare(b.employees?.surname || "");
      });
      const subtotalHours = Array.from(data.hours.values()).reduce((s, h) => s + h, 0);
      // Pro-rate pay by hours proportion
      const subtotalPay = sectionEntries.reduce((s, e) => {
        const empTotalHours = Number(e.timesheet_hours) || 1;
        const empLocHours = data.hours.get(e.employee_id) || 0;
        return s + Number(e.total_pay) * (empLocHours / empTotalHours);
      }, 0);
      return {
        groupLabel: name,
        entries: sectionEntries,
        locationHours: data.hours,
        subtotalHours,
        subtotalPay,
      };
    });
}

/**
 * Single flat group — no grouping.
 */
export function groupByEmployee(entries: PayrollEntryForReport[]): GroupSection[] {
  const sorted = [...entries].sort(
    (a, b) => (a.employees?.surname || "").localeCompare(b.employees?.surname || "")
  );
  return [
    {
      groupLabel: "All Employees",
      entries: sorted,
      subtotalHours: sorted.reduce((s, e) => s + Number(e.timesheet_hours), 0),
      subtotalPay: sorted.reduce((s, e) => s + Number(e.total_pay), 0),
    },
  ];
}

/**
 * Build flat location-split rows for CSV export.
 * One row per employee-location combination.
 */
export function buildLocationSplitRows(
  entries: PayrollEntryForReport[],
  locations: PayrollEntryLocation[]
): LocationSplitRow[] {
  const rows: LocationSplitRow[] = [];
  const entryMap = new Map(entries.map((e) => [e.employee_id, e]));

  for (const loc of locations) {
    const entry = entryMap.get(loc.employee_id);
    if (!entry) continue;
    rows.push({
      entry,
      locationName: loc.location_name,
      locationDepartment: loc.department,
      locationHours: Number(loc.hours),
      employeeTotalHours: Number(entry.timesheet_hours),
    });
  }

  return rows.sort((a, b) => {
    const locCmp = a.locationName.localeCompare(b.locationName);
    if (locCmp !== 0) return locCmp;
    return (a.entry.employees?.surname || "").localeCompare(b.entry.employees?.surname || "");
  });
}
