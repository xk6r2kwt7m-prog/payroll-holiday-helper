import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useEmployees } from "@/hooks/useEmployees";
import { matchEmployee, type MatchableEmployee } from "@/lib/payroll-matching";

export interface PayrollImportIssue {
  csvName: string;
  issue: "not_in_database" | "exists_not_added" | "leaver_in_csv";
  employeeId?: string;
  employeeName?: string;
  employeeStatus?: string;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function usePayrollImportStatus(periodId?: string, currentEmployeeIds: string[] = []) {
  const { tenantId } = useTenant();
  const { data: employees = [] } = useEmployees(true);

  const { data: importRecord, isLoading } = useQuery({
    queryKey: ["payroll_import_status", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return null;

      const { data, error } = await supabase
        .from("payroll_imports")
        .select("id, created_at, file_name, errors")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!periodId,
  });

  const unresolvedIssues = useMemo<PayrollImportIssue[]>(() => {
    const unmatchedNames = toStringArray((importRecord as any)?.errors?.unmatched);
    if (unmatchedNames.length === 0) return [];

    const employeeIdSet = new Set(currentEmployeeIds);
    const matchableEmployees: MatchableEmployee[] = employees.map((employee: any) => ({
      id: employee.id,
      forename: employee.forename,
      surname: employee.surname,
      department: employee.department,
      hourly_rate: employee.hourly_rate,
      service_charge: employee.service_charge,
      status: employee.status,
      email: employee.email,
      preferred_name: employee.preferred_name ?? null,
      import_aliases: employee.import_aliases ?? [],
    }));

    const issues: PayrollImportIssue[] = [];

    for (const csvName of unmatchedNames) {
      const { employee } = matchEmployee(csvName, matchableEmployees);

      if (!employee) {
        issues.push({ csvName, issue: "not_in_database" });
        continue;
      }

      if (employeeIdSet.has(employee.id)) {
        continue;
      }

      issues.push({
        csvName,
        issue: "exists_not_added",
        employeeId: employee.id,
        employeeName: `${employee.forename} ${employee.surname}`,
        employeeStatus: employee.status,
      });
    }

    return issues;
  }, [currentEmployeeIds, employees, importRecord]);

  const excludedNames = useMemo(
    () => toStringArray((importRecord as any)?.errors?.excluded),
    [importRecord]
  );

  return {
    importRecord,
    unresolvedIssues,
    excludedNames,
    hasBlockingUnresolvedIssues: unresolvedIssues.length > 0,
    isLoading,
  };
}