import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import type { Employee } from "@/hooks/useEmployees";

/**
 * Returns a function that filters an employee list to only those
 * the current user is allowed to see.
 *
 * Admin: sees all employees.
 * Manager: sees employees assigned to same branch(es).
 * Supervisor+below: same as manager for report purposes.
 */
export function useManagerScope() {
  const { isAdmin } = useAuth();
  const { employee: currentEmployee } = useCurrentEmployee();
  const { data: allBranches = [] } = useAllEmployeeBranches();

  const myBranches = useMemo(() => {
    if (isAdmin || !currentEmployee) return null; // null = no restriction
    return allBranches
      .filter((b) => b.employee_id === currentEmployee.id)
      .map((b) => b.branch);
  }, [isAdmin, currentEmployee, allBranches]);

  const scopedEmployeeIds = useMemo(() => {
    if (!myBranches) return null; // admin — no restriction
    if (myBranches.length === 0) return new Set<string>();
    const ids = new Set<string>();
    allBranches.forEach((b) => {
      if (myBranches.includes(b.branch)) ids.add(b.employee_id);
    });
    // always include own employee
    if (currentEmployee) ids.add(currentEmployee.id);
    return ids;
  }, [myBranches, allBranches, currentEmployee]);

  /** Filter a list of employees (or records with employee_id) to the user's scope */
  function filterByScope<T extends { employee_id?: string; id?: string }>(items: T[], employeeIdAccessor?: (item: T) => string | undefined): T[] {
    if (!scopedEmployeeIds) return items; // admin
    return items.filter((item) => {
      const eid = employeeIdAccessor ? employeeIdAccessor(item) : (item as any).employee_id ?? (item as any).employees?.id;
      return eid && scopedEmployeeIds.has(eid);
    });
  }

  /** Filter Employee[] directly */
  function filterEmployees(employees: Employee[]): Employee[] {
    if (!scopedEmployeeIds) return employees;
    return employees.filter((e) => scopedEmployeeIds.has(e.id));
  }

  return { filterByScope, filterEmployees, isAdmin, scopedEmployeeIds };
}
