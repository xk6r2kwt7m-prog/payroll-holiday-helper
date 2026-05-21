/**
 * Phase 3 — Rota terms-awareness hook.
 *
 * Resolves the active `employee_contract_terms` row for each scheduled
 * employee on a given shift date. Returns base / service charge rates split
 * cleanly so the rota grid, schedule summary and shift dialogs can show:
 *
 *     Base £X.XX/hr  +  SC £Y.YY/hr
 *
 * Rules:
 *   - National Minimum Wage and any labour-percentage / compliance
 *     calculation MUST use `base_rate` only.
 *   - Service charge is never folded back into a single hidden rate.
 *   - When no active terms row exists, the employee profile is used as a
 *     fallback and the caller can render a small "profile fallback" badge.
 */
import { useMemo } from "react";
import {
  useEmploymentTermsByEmployee,
  pickActiveTermsForDate,
  computeShiftLabourCost,
  type ShiftLabourCost,
  type TermsRow,
  type ProfileFallback,
} from "@/lib/labour-costing";

export interface RotaRates {
  base_rate: number;
  guaranteed_sc_rate: number;
  estimated_sc_rate: number;
  /** base + guaranteed SC. NOT to be used for NMW or labour% — see helpers. */
  committed_rate: number;
  source: "employment_terms" | "profile_fallback";
  warning: string | null;
}

export interface ShiftCostInput {
  employeeId: string | null | undefined;
  dateIso: string;
  hours: number;
}

export interface RotaTermsApi {
  isLoading: boolean;
  /** Pick rates for an employee on a date. Always returns a value, even with no terms (uses fallback). */
  getRates: (employeeId: string | null | undefined, dateIso: string) => RotaRates;
  /** Full split labour cost for a single shift. */
  getShiftCost: (input: ShiftCostInput) => ShiftLabourCost;
  /** Has at least one employee fallen back to profile? Useful for surfacing a banner. */
  hasFallbacks: boolean;
}

interface EmployeeLike {
  id: string;
  hourly_rate?: number | null;
  service_charge?: number | null;
}

export function useRotaTerms(
  employees: EmployeeLike[],
  windowStartIso: string | undefined,
  windowEndIso: string | undefined,
): RotaTermsApi {
  const ids = useMemo(() => employees.map((e) => e.id), [employees]);
  const fallbackByEmp = useMemo(() => {
    const m = new Map<string, ProfileFallback>();
    for (const e of employees) {
      m.set(e.id, { hourly_rate: e.hourly_rate ?? 0, service_charge: e.service_charge ?? 0 });
    }
    return m;
  }, [employees]);

  const { data: termsByEmployee, isLoading } = useEmploymentTermsByEmployee(
    ids,
    windowStartIso,
    windowEndIso,
  );

  const getRates: RotaTermsApi["getRates"] = (employeeId, dateIso) => {
    const fallback = (employeeId && fallbackByEmp.get(employeeId)) || {
      hourly_rate: 0,
      service_charge: 0,
    };
    const list: TermsRow[] | undefined = employeeId
      ? termsByEmployee?.get(employeeId)
      : undefined;
    const active = pickActiveTermsForDate(list, dateIso);
    const cost = computeShiftLabourCost(1, active, fallback);
    return {
      base_rate: cost.base_rate,
      guaranteed_sc_rate: cost.guaranteed_service_charge_rate,
      estimated_sc_rate: cost.estimated_service_charge_rate,
      committed_rate: +(cost.base_rate + cost.guaranteed_service_charge_rate).toFixed(2),
      source: cost.source,
      warning: cost.warning,
    };
  };

  const getShiftCost: RotaTermsApi["getShiftCost"] = ({ employeeId, dateIso, hours }) => {
    const fallback = (employeeId && fallbackByEmp.get(employeeId)) || {
      hourly_rate: 0,
      service_charge: 0,
    };
    const list: TermsRow[] | undefined = employeeId
      ? termsByEmployee?.get(employeeId)
      : undefined;
    const active = pickActiveTermsForDate(list, dateIso);
    return computeShiftLabourCost(hours, active, fallback);
  };

  const hasFallbacks = useMemo(() => {
    if (!termsByEmployee) return employees.length > 0;
    for (const e of employees) {
      const list = termsByEmployee.get(e.id);
      if (!list || list.length === 0) return true;
    }
    return false;
  }, [termsByEmployee, employees]);

  return { isLoading, getRates, getShiftCost, hasFallbacks };
}
