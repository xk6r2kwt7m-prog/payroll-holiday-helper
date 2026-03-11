// Quick-pick shift templates for mobile wizard
export interface ShiftPreset {
  label: string;
  department: string;
  start: string;
  end: string;
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  { label: "FOH Lunch", department: "FOH", start: "11:30", end: "17:00" },
  { label: "FOH Dinner", department: "FOH", start: "17:00", end: "23:30" },
  { label: "FOH Full Day", department: "FOH", start: "11:30", end: "22:30" },
  { label: "BOH Prep", department: "BOH", start: "10:00", end: "16:00" },
  { label: "BOH Close", department: "BOH", start: "16:00", end: "23:30" },
  { label: "BOH Full Day", department: "BOH", start: "10:00", end: "22:30" },
  { label: "CPU Morning", department: "CPU", start: "09:30", end: "14:00" },
  { label: "CPU Full Day", department: "CPU", start: "09:30", end: "19:00" },
];

export function getPresetsForDepartment(department: string): ShiftPreset[] {
  return SHIFT_PRESETS.filter((p) => p.department === department);
}
