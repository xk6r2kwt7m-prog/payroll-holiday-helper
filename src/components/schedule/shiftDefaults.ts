// Default operating hours and staffing minimums

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface OperatingHours {
  open: string;
  close: string;
}

export interface StaffingMinimum {
  min: number;
  note?: string;
}

// FOH/BOH typical start time
export const DEFAULT_FOH_BOH_START = "11:30";

// CPU typical hours
export const DEFAULT_CPU_START = "09:30";
export const DEFAULT_CPU_END = "19:00";

// Closing times by day
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
  department: "FOH" | "BOH" | "CPU",
  day: DayOfWeek
): { start: string; end: string } {
  if (department === "CPU") {
    return { start: DEFAULT_CPU_START, end: DEFAULT_CPU_END };
  }
  return { start: DEFAULT_FOH_BOH_START, end: CLOSING_TIMES[day] };
}

// Minimum staffing per branch/department/day
export function getMinimumStaff(
  branch: string,
  department: "FOH" | "BOH" | "CPU",
  day: DayOfWeek
): number {
  if (department === "BOH") return 2;
  if (department === "CPU") return 2;

  // FOH
  if (branch === "Brixton") {
    // Brixton: 1 on Sun/Wed, 2 otherwise
    if (day === "Sun" || day === "Wed") return 1;
    return 2;
  }

  // Fitzrovia & Carnaby: always 2 FOH
  return 2;
}

export const DAY_ABBR: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
