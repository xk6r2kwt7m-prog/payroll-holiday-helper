import { useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLeaveRules } from "@/hooks/useLeaveRules";
import { useTenant } from "@/hooks/useTenant";
import { useI18n } from "@/hooks/useI18n";

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
  const { t } = useI18n();

  return useMemo(() => {
    const steps: SetupStep[] = [
      {
        id: "company_profile",
        label: t("setup.company_profile"),
        description: t("setup.company_profile_desc"),
        completed: !!(tenantName && tenantName.length > 0 && tenantCountry),
        href: "/settings?group=company&section=profile",
        priority: "required",
      },
      {
        id: "leave_rules",
        label: t("setup.leave_rules"),
        description: t("setup.leave_rules_desc"),
        completed: !!(leaveRules && leaveRules.accrualRate > 0),
        href: "/settings?group=time-leave&section=leave-rules",
        priority: "required",
      },
      {
        id: "branches",
        label: t("setup.branches"),
        description: t("setup.branches_desc"),
        completed: locations.length > 0,
        href: "/settings?group=workplaces&section=locations",
        priority: "required",
      },
      {
        id: "departments",
        label: t("setup.departments"),
        description: t("setup.departments_desc"),
        completed: !!(companySettings),
        href: "/settings?group=people&section=departments",
        priority: "recommended",
      },
      {
        id: "payroll_settings",
        label: t("setup.payroll_settings"),
        description: t("setup.payroll_settings_desc"),
        completed: !!(companySettings?.pay_period && companySettings?.default_pay_day),
        href: "/settings?group=payroll&section=pay-settings",
        priority: "recommended",
      },
      {
        id: "first_employee",
        label: t("setup.first_employee"),
        description: t("setup.first_employee_desc"),
        completed: employees.filter(e => e.status === "active").length > 0,
        href: "/employees",
        priority: "required",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const alerts: { message: string; href: string }[] = [];
    if (locations.length === 0) alerts.push({ message: t("setup.no_branches"), href: "/settings?group=workplaces&section=locations" });
    if (employees.filter(e => e.status === "active").length === 0) alerts.push({ message: t("setup.no_employees"), href: "/employees" });
    if (!companySettings?.pay_period) alerts.push({ message: t("setup.payroll_incomplete"), href: "/settings?group=payroll&section=pay-settings" });
    if (!leaveRules || leaveRules.accrualRate <= 0) alerts.push({ message: t("setup.holiday_not_configured"), href: "/settings?group=time-leave&section=leave-rules" });

    return {
      steps,
      completedCount,
      totalCount,
      percentage,
      isFullySetup: completedCount === totalCount,
      alerts,
    };
  }, [tenantName, tenantCountry, employees, locations, companySettings, leaveRules, t]);
}
