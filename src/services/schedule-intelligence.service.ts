/**
 * Schedule Intelligence Service
 * Analyses historical shift data to suggest optimal staffing levels.
 * Advisory only — does NOT modify existing schedule logic.
 */

interface HistoricalShift {
  shift_date: string;
  start_time: string; // HH:mm
  end_time: string;
  employees?: { department: string } | null;
}

export interface StaffingSlot {
  dayType: "weekday" | "weekend";
  mealPeriod: "lunch" | "dinner";
}

export interface StaffingRecommendation {
  slot: StaffingSlot;
  label: string;
  byDepartment: Record<string, number>;
  totalStaff: number;
  dataPoints: number;
}

const LUNCH_END = 16; // 16:00 divides lunch/dinner
const WEEKEND_DAYS = [0, 6]; // Sunday, Saturday

function classifyShift(shift: HistoricalShift): StaffingSlot {
  const date = new Date(shift.shift_date + "T00:00:00");
  const dayType = WEEKEND_DAYS.includes(date.getDay()) ? "weekend" : "weekday";
  const startHour = parseInt(shift.start_time.split(":")[0], 10);
  const mealPeriod = startHour < LUNCH_END ? "lunch" : "dinner";
  return { dayType, mealPeriod };
}

function slotKey(slot: StaffingSlot): string {
  return `${slot.dayType}_${slot.mealPeriod}`;
}

const SLOT_LABELS: Record<string, Record<string, string>> = {
  en: {
    weekday_lunch: "Weekday Lunch",
    weekday_dinner: "Weekday Dinner",
    weekend_lunch: "Weekend Lunch",
    weekend_dinner: "Weekend Dinner",
  },
  "pt-PT": {
    weekday_lunch: "Almoço Dias Úteis",
    weekday_dinner: "Jantar Dias Úteis",
    weekend_lunch: "Almoço Fim-de-Semana",
    weekend_dinner: "Jantar Fim-de-Semana",
  },
};

/**
 * Compute staffing recommendations from historical shift data.
 * Returns average headcount per department for each slot.
 */
export function computeStaffingRecommendations(
  shifts: HistoricalShift[],
  locale: string = "en",
): StaffingRecommendation[] {
  // Group by slot + date → departments → count
  const slotDateDepts = new Map<string, Map<string, Map<string, number>>>();

  for (const shift of shifts) {
    if (!shift.employees?.department) continue;
    const slot = classifyShift(shift);
    const key = slotKey(slot);
    const dateKey = shift.shift_date;
    const dept = shift.employees.department;

    if (!slotDateDepts.has(key)) slotDateDepts.set(key, new Map());
    const dateMap = slotDateDepts.get(key)!;
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const deptMap = dateMap.get(dateKey)!;
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  }

  const labels = SLOT_LABELS[locale] || SLOT_LABELS.en;
  const results: StaffingRecommendation[] = [];

  for (const [key, dateMap] of slotDateDepts.entries()) {
    const [dayType, mealPeriod] = key.split("_") as ["weekday" | "weekend", "lunch" | "dinner"];
    const numDays = dateMap.size;
    if (numDays === 0) continue;

    // Aggregate dept totals
    const deptTotals = new Map<string, number>();
    for (const deptMap of dateMap.values()) {
      for (const [dept, count] of deptMap.entries()) {
        deptTotals.set(dept, (deptTotals.get(dept) || 0) + count);
      }
    }

    const byDepartment: Record<string, number> = {};
    let totalStaff = 0;
    for (const [dept, total] of deptTotals.entries()) {
      const avg = Math.round(total / numDays);
      byDepartment[dept] = avg;
      totalStaff += avg;
    }

    results.push({
      slot: { dayType, mealPeriod },
      label: labels[key] || key,
      byDepartment,
      totalStaff,
      dataPoints: numDays,
    });
  }

  // Sort: weekday before weekend, lunch before dinner
  const order = ["weekday_lunch", "weekday_dinner", "weekend_lunch", "weekend_dinner"];
  results.sort((a, b) => order.indexOf(slotKey(a.slot)) - order.indexOf(slotKey(b.slot)));

  return results;
}
