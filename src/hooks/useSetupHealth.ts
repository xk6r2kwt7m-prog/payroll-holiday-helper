import { useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLeaveRules } from "@/hooks/useLeaveRules";
import { useTenant } from "@/hooks/useTenant";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  priority: "required" | "recommended";
}

export interface SetupHealth {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isFullySetup: boolean;
  alerts: { message: string; href: string }[];
}

export function useSetupHealth(): SetupHealth {
  const { tenantId, tenantName, tenantCountry } = useTenant();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocationSettings();
  const { data: companySettings } = useCompanySettings();
  const { data: leaveRules } = useLeaveRules();

  return useMemo(() => {
    const steps: SetupStep[] = [
      {
        id: "company_profile",
        label: "Company Profile",
        description: "Set your company name, legal entity, country, and currency",
        completed: !!(tenantName && tenantName.length > 0 && tenantCountry),
        href: "/settings?section=company",
        priority: "required",
      },
      {
        id: "leave_rules",
        label: "Holiday & Leave Rules",
        description: "Configure leave entitlement, accrual rates, and leave year",
        completed: !!(leaveRules && leaveRules.accrualRate > 0),
        href: "/settings?section=leave",
        priority: "required",
      },
      {
        id: "branches",
        label: "Branches / Locations",
        description: "Add at least one work location for your company",
        completed: locations.length > 0,
        href: "/settings?section=locations",
        priority: "required",
      },
      {
        id: "departments",
        label: "Departments",
        description: "Define your team structure (e.g. Kitchen, Front of House)",
        completed: !!(companySettings), // departments exist via enum — always true if settings exist
        href: "/settings?section=departments",
        priority: "recommended",
      },
      {
        id: "payroll_settings",
        label: "Payroll Settings",
        description: "Set pay period, pay day, and overtime preferences",
        completed: !!(companySettings?.pay_period && companySettings?.default_pay_day),
        href: "/settings?section=payroll",
        priority: "recommended",
      },
      {
        id: "first_employee",
        label: "Add First Employee",
        description: "Create your first team member to start using the platform",
        completed: employees.filter(e => e.status === "active").length > 0,
        href: "/employees",
        priority: "required",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const alerts: { message: string; href: string }[] = [];
    if (locations.length === 0) alerts.push({ message: "No branches created", href: "/settings?section=locations" });
    if (employees.filter(e => e.status === "active").length === 0) alerts.push({ message: "No employees added", href: "/employees" });
    if (!companySettings?.pay_period) alerts.push({ message: "Payroll settings incomplete", href: "/settings?section=payroll" });
    if (!leaveRules || leaveRules.accrualRate <= 0) alerts.push({ message: "Holiday rules not configured", href: "/settings?section=leave" });

    return {
      steps,
      completedCount,
      totalCount,
      percentage,
      isFullySetup: completedCount === totalCount,
      alerts,
    };
  }, [tenantName, tenantCountry, employees, locations, companySettings, leaveRules]);
}
