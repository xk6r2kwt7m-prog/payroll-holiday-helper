export interface ContractVariables {
  employeeName: string;
  homeAddress: string;
  jobTitle: string;
  effectiveDate: string;
  hourlyRate: string;
  weeklyHours: string;
  noticePeriod: string;
  probationPeriod: string;
  workLocation: string;
  employmentType: EmploymentType;
}

export type EmploymentType = "full_time" | "part_time" | "variable_hours";

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "variable_hours", label: "Variable Hours" },
];

export function getEmploymentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
}

// Keep ContractType for backward compat in form (FOH vs Kitchen selection)
export type ContractType = "foh" | "kitchen";

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "foh", label: "Front of House (FOH)" },
  { value: "kitchen", label: "Kitchen / Back of House (BOH)" },
];

export function getDefaultJobTitle(type: ContractType) {
  return type === "foh" ? "Front of House Team Member" : "Kitchen Team Member";
}

export const WORK_LOCATIONS = [
  "30 Rathbone Place, London, W1T 1JJ (Fitzrovia)",
  "1 Newburgh Street, London, W1F 7RB (Carnaby)",
  "Brixton Village, Unit 7, Coldharbour Lane, London, SW9 8PR (Brixton)",
];
