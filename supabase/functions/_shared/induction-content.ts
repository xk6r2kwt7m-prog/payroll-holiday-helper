/**
 * Server-side mirror of the induction structure (UD-IND-2026.1).
 *
 * Only keys, titles and ordering live here — the readable content itself is
 * rendered by the staff portal from src/data/induction/ud-induction-2026.ts.
 * Keep the keys and labels in step with that file.
 */

export const INDUCTION_MODULE_SEED: { key: string; title: string }[] = [
  { key: "how_to_use", title: "How this induction works" },
  { key: "food_hygiene", title: "Essential food hygiene" },
  { key: "allergens", title: "Food allergen safety" },
  { key: "health_safety", title: "Health & safety" },
  { key: "site_information", title: "Your site: fire, first aid and checks" },
  { key: "conduct", title: "Dress, conduct and hand hygiene" },
  { key: "practical_training", title: "Practical training and what it does not cover" },
];

export const PRACTICAL_SEED: { group: string; label: string; roles?: string[] }[] = [
  { group: "role_task", label: "Slips and trips" },
  { group: "role_task", label: "Working at height" },
  { group: "role_task", label: "Contact with heat" },
  { group: "role_task", label: "Food handling" },
  { group: "role_task", label: "Knives", roles: ["Kitchen", "Supervisor", "Manager"] },
  { group: "role_task", label: "Dangerous machines and powered equipment", roles: ["Kitchen", "Supervisor", "Manager"] },
  { group: "role_task", label: "Gas equipment", roles: ["Kitchen", "Supervisor", "Manager"] },
  { group: "role_task", label: "Electrical equipment" },
  { group: "role_task", label: "Fire procedure" },
  { group: "role_task", label: "Cleaning chemicals" },
  { group: "role_task", label: "Handling glass" },
  { group: "role_task", label: "Carrying food and plates through the restaurant", roles: ["Front of House", "Supervisor", "Manager"] },
  { group: "role_task", label: "Encountering aggressive behaviour" },
  { group: "role_task", label: "Beer line and keg handling (where applicable)", roles: ["Front of House", "Supervisor", "Manager"] },
  { group: "manual_handling", label: "Stock deliveries and distribution" },
  { group: "manual_handling", label: "Stock pots and containers", roles: ["Kitchen", "Supervisor", "Manager"] },
  { group: "manual_handling", label: "Refuse and waste" },
  { group: "manual_handling", label: "Furniture" },
  { group: "manual_handling", label: "Beer kegs", roles: ["Front of House", "Supervisor", "Manager"] },
  { group: "manual_handling", label: "Gas cylinders (where applicable)", roles: ["Kitchen", "Supervisor", "Manager"] },
  { group: "site_induction", label: "Fire exits and escape route" },
  { group: "site_induction", label: "Assembly point" },
  { group: "site_induction", label: "Fire alarm call point" },
  { group: "site_induction", label: "Fire extinguishers" },
  { group: "site_induction", label: "Gas shut-off (where applicable)" },
  { group: "site_induction", label: "First-aid box" },
  { group: "site_induction", label: "Designated staff area" },
  { group: "site_induction", label: "Chemical storage" },
  { group: "site_induction", label: "Gluten-free storage and equipment controls" },
];

export const SITE_FIELDS = [
  "fire_exit_routes",
  "fire_assembly_point",
  "fire_alarm_call_points",
  "evacuation_report_to",
  "fire_hazard_reporting_route",
  "first_aid_kit_location",
  "accident_book_location",
  "temperature_check_times",
] as const;

export const ASSESSMENT_TOTAL = 10;
export const ASSESSMENT_PASS_MARK = 8;

/** Correct option index per question key. Server-side marking. */
export const ASSESSMENT_KEY: Record<string, number> = {
  q1: 2,
  q2: 1,
  q3: 1,
  q4: 1,
  q5: 1,
  q6: 1,
  q7: 1,
  q8: 1,
  q9: 1,
  q10: 1,
};

export const DECLARATION_KEYS = [
  "diarrhoea",
  "vomiting",
  "infected_skin",
  "jaundice",
  "bowel_disorder",
  "recurring_infection",
  "typhoid_history",
  "salmonella_carrier",
  "typhoid_contact",
  "travel_illness",
];
