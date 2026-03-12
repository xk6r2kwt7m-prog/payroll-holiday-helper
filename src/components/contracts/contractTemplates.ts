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

// Department selection for contract form
export type ContractType = "foh" | "kitchen" | "management" | "supervisor";

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string; emoji: string }[] = [
  { value: "foh", label: "Front of House (FOH)", emoji: "🍽️" },
  { value: "kitchen", label: "Kitchen / Back of House (BOH)", emoji: "👨‍🍳" },
  { value: "management", label: "Management", emoji: "👔" },
  { value: "supervisor", label: "Supervisor", emoji: "📋" },
];

// Pre-built job titles grouped by department
export const JOB_TITLES: Record<ContractType, string[]> = {
  foh: [
    "Front of House Team Member",
    "Waiter",
    "Waitress",
    "Wrapper",
    "Wrapper Team Member",
    "Host / Hostess",
    "Runner",
    "Barista",
    "Bar Staff",
    "Cashier",
  ],
  kitchen: [
    "Kitchen Team Member",
    "Chef",
    "Line Chef",
    "Sous Chef",
    "Kitchen Porter",
    "Prep Chef",
    "Commis Chef",
    "Pastry Chef",
  ],
  management: [
    "Restaurant Manager",
    "Assistant Manager",
    "Kitchen Manager",
    "General Manager",
    "Area Manager",
    "Operations Manager",
  ],
  supervisor: [
    "FOH Supervisor",
    "Kitchen Supervisor",
    "Shift Supervisor",
    "Team Leader",
  ],
};

export function getDefaultJobTitle(type: ContractType) {
  return JOB_TITLES[type]?.[0] || "Team Member";
}

// WORK_LOCATIONS is now dynamically loaded from tenant location_settings.
// Use useLocationSettings() to fetch the current tenant's locations.
export const WORK_LOCATIONS: string[] = [];
