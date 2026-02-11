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
}

export type ContractType = "foh" | "kitchen";

const FOH_RESPONSIBILITIES = [
  "Responding to customer queries and complaints",
  "Providing excellent customer service",
  "Taking food orders and processing them in timely fashion",
  "Taking card payments and providing receipt upon request",
  "Making menu recommendations, answering questions and sharing additional information upon request",
  "Quick and timely service in total",
];

const FOH_GENERAL_DUTIES = [
  "Acting with integrity and honesty, ensuring that the Company is a successful and reputable business",
  "Ensuring compliance with health & safety policies set by the Company",
  "Preparation of food items to Company specifications maintaining highest level of food quality and hygiene",
  "Fulfilling all FOH of house paperwork on the daily basis",
  "Completing food orders based on business requirements",
  "Ensuring Bar area is always clean and tidy",
  "Maintaining staff and guest toilet, office and storage room clean and tidy",
  "Supervision cleaning scheduling on daily basis",
];

const KITCHEN_RESPONSIBILITIES = [
  "Supporting the General Manager in the daily management of kitchen operations, including staff rotas and workflow planning",
  "Supervising food preparation to ensure consistently high standards of quality, presentation, and taste",
  "Upholding food hygiene standards, allergen control procedures, and overall cleanliness in strict adherence to HACCP and current UK food safety legislation",
  "Overseeing stock control processes, including placing orders, receiving deliveries, and conducting quality assurance checks",
  "Providing training, guidance, and supervision to junior kitchen staff, promoting team development and optimal performance",
  "Completing and monitoring all required kitchen documentation, including temperature logs, cleaning schedules, and allergen charts",
  "Ensuring health and safety compliance in accordance with UK statutory requirements and internal company policies",
  "Assuming responsibility as the most senior kitchen authority in the absence of the Head Chef",
  "Contributing to menu development, seasonal updates, and the introduction of new dishes",
  "Supporting the achievement of cost control objectives, portion management, and the reduction of food waste",
];

const KITCHEN_GENERAL_DUTIES = [
  "Maintaining the highest standards of food quality and hygiene in line with all relevant legislation and company protocols",
  "Ensuring proper care and maintenance of all kitchen equipment owned or used by the Company",
  "Carrying out basic cleaning duties promptly and efficiently",
  "Washing pots, pans, utensils, and other kitchenware",
  "Cleaning food preparation areas, equipment, crockery, and cutlery to the required standard",
  "Unloading and storing food and equipment deliveries appropriately",
  "Keeping the storeroom clean, organized, and properly stocked",
  "Ensuring all work surfaces, walls, and floors are kept clean and always sanitized",
];

export function getResponsibilities(type: ContractType) {
  return type === "foh" ? FOH_RESPONSIBILITIES : KITCHEN_RESPONSIBILITIES;
}

export function getGeneralDuties(type: ContractType) {
  return type === "foh" ? FOH_GENERAL_DUTIES : KITCHEN_GENERAL_DUTIES;
}

export function getReportingLine(type: ContractType) {
  return type === "foh"
    ? "reporting firstly to the FOH Duty Manager or directly to Operations Manager, as the case may be"
    : "reporting directly to the General Manager, or as otherwise directed by the Company";
}

export function getDefaultJobTitle(type: ContractType) {
  return type === "foh" ? "Front of House Team Member" : "Kitchen Deputy Manager";
}

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "foh", label: "Front of House (FOH)" },
  { value: "kitchen", label: "Kitchen / Back of House (BOH)" },
];
