// Default operating hours and staffing minimums
// NOTE: These are generic defaults. Tenant-specific values come from location_settings.

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface OperatingHours {
  open: string;
  close: string;
}

export interface StaffingMinimum {
  min: number;
  note?: string;
}

// Generic default start times
export const DEFAULT_FOH_BOH_START = "11:30";
export const DEFAULT_CPU_START = "09:30";
export const DEFAULT_CPU_END = "19:00";

// Generic closing times by day (tenants can override via location_settings)
export const CLOSING_TIMES: Record<DayOfWeek, string> = {
  Mon: "22:30",
  Tue: "22:30",
  Wed: "22:30",
  Thu: "23:30",
  Fri: "23:30",
  Sat: "23:30",
  Sun: "20:30",
};

// Get default shift times for a department + day
export function getDefaultTimes(
  department: string,
  day: DayOfWeek
): { start: string; end: string } {
  if (department === "CPU") {
    return { start: DEFAULT_CPU_START, end: DEFAULT_CPU_END };
  }
  return { start: DEFAULT_FOH_BOH_START, end: CLOSING_TIMES[day] };
}

// Default minimum staffing — no longer hardcodes specific branch names.
// Returns a safe generic default; tenants configure real minimums in location_settings.
export function getMinimumStaff(
  _branch: string,
  department: string,
  _day: DayOfWeek
): number {
  if (department === "BOH") return 2;
  if (department === "CPU") return 2;
  // Generic FOH default
  return 2;
}

export const DAY_ABBR: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
