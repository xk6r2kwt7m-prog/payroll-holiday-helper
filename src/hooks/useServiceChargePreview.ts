import { useMemo } from "react";
import type { Employee } from "@/hooks/useEmployees";
import type {
  ServiceChargeRoleRate,
  ServiceChargeEmployeeRate,
  ServiceChargeLocationSetting,
} from "@/hooks/useServiceCharge";

/* ─── Types ─── */

export type DistributionModel =
  | "none"
  | "equal_by_hours"
  | "role_points"
  | "percentage_split"
  | "fixed_employee"
  | "fixed_role"
  | "hybrid";

export type CalculationSource =
  | "none"
  | "company_default"
  | "location_rule"
  | "role_rule"
  | "employee_rule"
  | "custom_formula";

export interface SimulationInput {
  pool: number;
  model: DistributionModel;
  locationFilter: string; // "all" or branch key
  companyEnabled: boolean;
  /** Override role rates for simulation */
  roleRates: { role_name: string; rate_per_hour: number }[];
  /** Override employee rates for simulation */
  employeeRates: { employee_id: string; custom_rate_per_hour: number }[];
}

export interface EmployeeHoursRow {
  employee: Employee;
  branch: string;
  hoursWorked: number;
  role: string;
}

export interface PreviewRow {
  employeeId: string;
  employeeName: string;
  branch: string;
  hoursWorked: number;
  role: string;
  serviceChargeAmount: number;
  calculationSource: CalculationSource;
}

export interface PreviewResult {
  rows: PreviewRow[];
  totalPool: number;
  totalDistributed: number;
  remainder: number;
  employeeCount: number;
  warnings: PreviewWarning[];
}

export interface PreviewWarning {
  type: "error" | "warning" | "info";
  message: string;
}

/* ─── Simulation Engine ─── */

export function runSimulation(
  input: SimulationInput,
  employeeHours: EmployeeHoursRow[],
  locationSettings: ServiceChargeLocationSetting[],
): PreviewResult {
  const warnings: PreviewWarning[] = [];

  // Company disabled
  if (!input.companyEnabled) {
    return {
      rows: [],
      totalPool: input.pool,
      totalDistributed: 0,
      remainder: input.pool,
      employeeCount: 0,
      warnings: [{ type: "info", message: "Service charge is disabled at company level." }],
    };
  }

  if (input.model === "none") {
    return {
      rows: [],
      totalPool: input.pool,
      totalDistributed: 0,
      remainder: input.pool,
      employeeCount: 0,
      warnings: [{ type: "info", message: "Distribution model set to 'none'." }],
    };
  }

  // Filter by location
  let filtered = employeeHours;
  if (input.locationFilter !== "all") {
    filtered = filtered.filter((r) => r.branch === input.locationFilter);
  }

  // Check location-level disabled
  filtered = filtered.filter((r) => {
    const ls = locationSettings.find((l) => l.branch === r.branch);
    if (ls && !ls.enabled) {
      warnings.push({
        type: "warning",
        message: `Service charge disabled for ${r.branch} — ${r.employee.forename} ${r.employee.surname} excluded.`,
      });
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    warnings.push({ type: "warning", message: "No eligible employees found for the selected criteria." });
    return { rows: [], totalPool: input.pool, totalDistributed: 0, remainder: input.pool, employeeCount: 0, warnings };
  }

  if (input.pool <= 0) {
    warnings.push({ type: "warning", message: "Service charge pool is £0 or negative." });
  }

  // Build role rate map & employee rate map
  const roleMap = new Map(input.roleRates.map((r) => [r.role_name.toLowerCase(), r.rate_per_hour]));
  const empMap = new Map(input.employeeRates.map((r) => [r.employee_id, r.custom_rate_per_hour]));

  const totalHours = filtered.reduce((s, r) => s + r.hoursWorked, 0);

  const rows: PreviewRow[] = filtered.map((r) => {
    let amount = 0;
    let source: CalculationSource = "company_default";

    // Rule priority: employee > role > location > company default
    const empRate = empMap.get(r.employee.id);
    const roleRate = roleMap.get(r.role.toLowerCase());

    if (empRate !== undefined) {
      amount = round(r.hoursWorked * empRate);
      source = "employee_rule";
    } else if (
      (input.model === "fixed_role" || input.model === "hybrid") &&
      roleRate !== undefined
    ) {
      amount = round(r.hoursWorked * roleRate);
      source = "role_rule";
    } else if (input.model === "equal_by_hours" && totalHours > 0) {
      amount = round((r.hoursWorked / totalHours) * input.pool);
      source = "company_default";
    } else if (input.model === "fixed_role" && roleRate === undefined) {
      // Missing role rule
      warnings.push({
        type: "warning",
        message: `No role rate for "${r.role}" — ${r.employee.forename} ${r.employee.surname} gets £0.`,
      });
      amount = 0;
      source = "none";
    } else {
      // Fallback: equal by hours
      if (totalHours > 0) {
        amount = round((r.hoursWorked / totalHours) * input.pool);
      }
      source = "company_default";
    }

    return {
      employeeId: r.employee.id,
      employeeName: `${r.employee.forename} ${r.employee.surname}`,
      branch: r.branch,
      hoursWorked: r.hoursWorked,
      role: r.role,
      serviceChargeAmount: amount,
      calculationSource: source,
    };
  });

  const totalDistributed = round(rows.reduce((s, r) => s + r.serviceChargeAmount, 0));
  const remainder = round(input.pool - totalDistributed);

  // Validation warnings
  if (totalDistributed > input.pool) {
    warnings.push({ type: "error", message: `Total distributed (£${totalDistributed.toFixed(2)}) exceeds pool (£${input.pool.toFixed(2)}).` });
  }
  if (rows.some((r) => r.serviceChargeAmount === 0)) {
    const zeroEmps = rows.filter((r) => r.serviceChargeAmount === 0);
    warnings.push({
      type: "warning",
      message: `${zeroEmps.length} employee(s) received £0 — check rules.`,
    });
  }
  if (totalHours === 0) {
    warnings.push({ type: "warning", message: "No hours found for the selected period." });
  }

  return {
    rows,
    totalPool: input.pool,
    totalDistributed,
    remainder,
    employeeCount: rows.length,
    warnings,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/* ─── Comparison helper ─── */

export interface ComparisonRow {
  employeeId: string;
  employeeName: string;
  amountA: number;
  amountB: number;
  diff: number;
  sourceA: CalculationSource;
  sourceB: CalculationSource;
}

export function compareScenarios(a: PreviewResult, b: PreviewResult): ComparisonRow[] {
  const map = new Map<string, ComparisonRow>();

  for (const row of a.rows) {
    map.set(row.employeeId, {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      amountA: row.serviceChargeAmount,
      amountB: 0,
      diff: 0,
      sourceA: row.calculationSource,
      sourceB: "none",
    });
  }

  for (const row of b.rows) {
    const existing = map.get(row.employeeId);
    if (existing) {
      existing.amountB = row.serviceChargeAmount;
      existing.sourceB = row.calculationSource;
    } else {
      map.set(row.employeeId, {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        amountA: 0,
        amountB: row.serviceChargeAmount,
        diff: 0,
        sourceA: "none",
        sourceB: row.calculationSource,
      });
    }
  }

  return Array.from(map.values()).map((r) => ({
    ...r,
    diff: round(r.amountB - r.amountA),
  }));
}
