import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * Resolved leave rules: tenant overrides merged on top of country defaults.
 */
export interface ResolvedLeaveRules {
  countryCode: string;
  countryName: string;
  // Entitlement
  statutoryWeeks: number;
  maxStatutoryDays: number;
  accrualRate: number;
  // Workweek
  standardWeekHours: number;
  standardDayHours: number;
  workdaysPerWeek: number;
  // Carry-over
  maxCarryoverDays: number;
  maxCarryoverSicknessDays: number;
  maxCarryoverFamilyLeaveDays: number;
  // Leave year
  leaveYearStartMonth: number;
  leaveYearStartDay: number;
  // Public holidays
  publicHolidaysIncluded: boolean;
  publicHolidayCount: number;
  // Tenant-specific
  autoCalculateAccrual: boolean;
  includeServiceChargeInHoliday: boolean;
  roundingPrecision: number;
}

/**
 * Hook that resolves the effective leave rules for the current tenant.
 * Merges tenant_leave_settings overrides on top of country_leave_rules defaults.
 */
export function useLeaveRules() {
  const { tenantId, tenantCountry } = useTenant();

  return useQuery({
    queryKey: ["leave_rules", tenantId, tenantCountry],
    queryFn: async (): Promise<ResolvedLeaveRules> => {
      // 1. Fetch country defaults
      const { data: countryRules, error: countryErr } = await supabase
        .from("country_leave_rules")
        .select("*")
        .eq("country_code", tenantCountry ?? "GB")
        .maybeSingle();

      if (countryErr) throw countryErr;

      // Fallback to GB defaults if country not found
      const cr = countryRules ?? {
        country_code: "GB",
        country_name: "United Kingdom",
        statutory_weeks: 5.6,
        max_statutory_days: 28,
        accrual_rate: 0.1207,
        standard_week_hours: 40,
        standard_day_hours: 8,
        workdays_per_week: 5,
        max_carryover_days: 8,
        max_carryover_sickness_days: 20,
        max_carryover_family_leave_days: 28,
        default_leave_year_start_month: 1,
        default_leave_year_start_day: 1,
        public_holidays_included: true,
        public_holiday_count: 8,
      };

      // 2. Fetch tenant overrides (if any)
      let tenantOverrides: any = null;
      if (tenantId) {
        const { data, error: tenantErr } = await supabase
          .from("tenant_leave_settings")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (!tenantErr) tenantOverrides = data;
      }

      // 3. Merge: tenant overrides win where non-null
      return {
        countryCode: cr.country_code,
        countryName: cr.country_name,
        statutoryWeeks: Number(cr.statutory_weeks),
        maxStatutoryDays: Number(cr.max_statutory_days),
        accrualRate: Number(tenantOverrides?.accrual_rate ?? cr.accrual_rate),
        standardWeekHours: Number(tenantOverrides?.standard_week_hours ?? cr.standard_week_hours),
        standardDayHours: Number(tenantOverrides?.standard_day_hours ?? cr.standard_day_hours),
        workdaysPerWeek: Number(tenantOverrides?.workdays_per_week ?? cr.workdays_per_week),
        maxCarryoverDays: Number(tenantOverrides?.max_carryover_days ?? cr.max_carryover_days),
        maxCarryoverSicknessDays: Number(cr.max_carryover_sickness_days),
        maxCarryoverFamilyLeaveDays: Number(cr.max_carryover_family_leave_days),
        leaveYearStartMonth: Number(tenantOverrides?.leave_year_start_month ?? cr.default_leave_year_start_month),
        leaveYearStartDay: Number(tenantOverrides?.leave_year_start_day ?? cr.default_leave_year_start_day),
        publicHolidaysIncluded: cr.public_holidays_included,
        publicHolidayCount: Number(cr.public_holiday_count),
        autoCalculateAccrual: tenantOverrides?.auto_calculate_accrual ?? true,
        includeServiceChargeInHoliday: tenantOverrides?.include_service_charge_in_holiday ?? false,
        roundingPrecision: tenantOverrides?.rounding_precision ?? 2,
      };
    },
    enabled: !!tenantCountry,
    staleTime: 5 * 60 * 1000, // Cache for 5 mins — rules rarely change
  });
}

/**
 * Calculate holiday accrual using resolved rules.
 */
export function calculateAccrual(hoursWorked: number, accrualRate: number, precision = 2): number {
  return Number((hoursWorked * accrualRate).toFixed(precision));
}

/**
 * Calculate annual entitlement from weekly hours and statutory weeks.
 */
export function calculateAnnualEntitlement(weeklyHours: number, statutoryWeeks: number): number {
  return weeklyHours * statutoryWeeks;
}
