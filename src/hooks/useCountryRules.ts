import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CountryLeaveRule {
  id: string;
  country_code: string;
  country_name: string;
  statutory_weeks: number;
  max_statutory_days: number;
  accrual_rate: number;
  standard_week_hours: number;
  standard_day_hours: number;
  workdays_per_week: number;
  max_carryover_days: number;
  max_carryover_sickness_days: number;
  max_carryover_family_leave_days: number;
  default_leave_year_start_month: number;
  default_leave_year_start_day: number;
  public_holidays_included: boolean;
  public_holiday_count: number;
  notes: string | null;
}

/**
 * Fetch all supported country leave rules.
 */
export function useCountryRules() {
  return useQuery({
    queryKey: ["country_leave_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_leave_rules")
        .select("*")
        .order("country_name");
      if (error) throw error;
      return data as CountryLeaveRule[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch rules for a specific country code.
 */
export function useCountryRule(countryCode: string | null) {
  return useQuery({
    queryKey: ["country_leave_rules", countryCode],
    queryFn: async () => {
      if (!countryCode) return null;
      const { data, error } = await supabase
        .from("country_leave_rules")
        .select("*")
        .eq("country_code", countryCode)
        .maybeSingle();
      if (error) throw error;
      return data as CountryLeaveRule | null;
    },
    enabled: !!countryCode,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Calculate Cape Verde proportional leave for contracts under 1 year.
 * CV law: 2 days per month of service for first year.
 */
export function calculateCapeVerdeProportionalLeave(monthsWorked: number): number {
  if (monthsWorked >= 12) return 22;
  return Math.min(Math.floor(monthsWorked * 2), 22);
}

/**
 * Determine if a time falls within Cape Verde night work period (22:00-06:00).
 */
export function isCapeVerdeNightWork(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

/** Supported pay types */
export const PAY_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "daily_rate", label: "Daily Rate" },
  { value: "monthly_salary", label: "Monthly Salary" },
  { value: "monthly_salary_overtime", label: "Monthly Salary + Overtime" },
  { value: "monthly_salary_service_charge", label: "Monthly Salary + Service Charge" },
  { value: "hourly_service_charge", label: "Hourly + Service Charge" },
  { value: "no_service_charge", label: "No Service Charge" },
] as const;

export type PayType = typeof PAY_TYPES[number]["value"];

/** Supported overtime models */
export const OVERTIME_MODELS = [
  { value: "none", label: "None" },
  { value: "time_and_half", label: "Time and a Half (1.5x)" },
  { value: "double_time", label: "Double Time (2x)" },
  { value: "custom", label: "Custom Rate" },
] as const;

/** Supported holiday entitlement methods */
export const HOLIDAY_ENTITLEMENT_METHODS = [
  { value: "accrual", label: "Accrual (hours worked × rate)" },
  { value: "fixed_days", label: "Fixed Days Per Year" },
  { value: "proportional", label: "Proportional (pro-rata)" },
] as const;
