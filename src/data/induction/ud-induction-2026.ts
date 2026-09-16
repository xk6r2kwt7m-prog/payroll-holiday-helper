/**
 * Ugly Dumpling Staff Induction & Training — UD-IND-2026.1
 *
 * Mobile-first, section-by-section version of the controlled induction pack.
 * Pure content only: no side effects, no DB access. The signed PDF master copy
 * stays in the Document library; this file is what staff read on their phone.
 *
 * Wording is taken from the controlled document. Do not reword compliance
 * statements without updating the document version.
 */

export const INDUCTION_VERSION = "UD-IND-2026.1";

export type InductionBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "callout"; title: string; text: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "site"; fields: SiteFieldKey[] };

export interface InductionModule {
  key: string;
  title: string;
  summary: string;
  minutes: number;
  /** Roles this module applies to. Empty = everyone. */
  roles?: string[];
  blocks: InductionBlock[];
}

/* ── Site-specific fields, filled from each location's settings ── */

export type SiteFieldKey =
  | "fire_exit_routes"
  | "fire_assembly_point"
  | "fire_alarm_call_points"
  | "evacuation_report_to"
  | "fire_hazard_reporting_route"
  | "first_aid_kit_location"
  | "accident_book_location"
  | "temperature_check_times";

export const SITE_FIELD_LABELS: Record<SiteFieldKey, string> = {
  fire_exit_routes: "Fire exits and escape routes",
  fire_assembly_point: "Assembly point",
  fire_alarm_call_points: "Fire alarm call point and extinguishers",
  evacuation_report_to: "Who to report to after evacuation",
  fire_hazard_reporting_route: "How to report a fire hazard",
  first_aid_kit_location: "First-aid box location",
  accident_book_location: "Accident and near-miss reporting",
  temperature_check_times: "Fridge and freezer check times",
};

export const SITE_FIELD_HELP: Record<SiteFieldKey, string> = {
  fire_exit_routes: "Example: two exits — main door upstairs, and the fire exit at the back of the stairs.",
  fire_assembly_point: "Where staff gather once outside.",
  fire_alarm_call_points: "Nearest call point and where extinguishers are kept.",
  evacuation_report_to: "Usually the manager on duty.",
  fire_hazard_reporting_route: "Example: report to the manager on duty and by email.",
  first_aid_kit_location: "Example: staff room.",
  accident_book_location: "Where accidents and near misses are recorded and who to tell.",
  temperature_check_times: "Example: opening and closing, every day.",
};

/* ── Modules ── */

export const INDUCTION_MODULES: InductionModule[] = [
  {
    key: "how_to_use",
    title: "How this induction works",
    summary: "What you need to do, and what your manager shows you in person.",
    minutes: 2,
    blocks: [
      {
        kind: "text",
        text:
          "This induction must be completed by new employees before, or as part of, starting work. Reading the training material is only one part of induction. Site-specific hazards, fire arrangements, equipment and practical tasks must be demonstrated by a competent manager or trainer.",
      },
      {
        kind: "list",
        items: [
          "Work through each section and confirm it — you can stop and come back at any time.",
          "Complete the health declaration honestly.",
          "Answer the 10-question knowledge check.",
          "Sign at the end. Your manager then verifies the practical items with you on site.",
        ],
      },
      {
        kind: "callout",
        title: "Your record",
        text:
          `Your name, role, site, induction version (${INDUCTION_VERSION}), completion date and time, assessment result, your acknowledgement, manager verification and any outstanding practical training are kept in your training record.`,
      },
    ],
  },
  {
    key: "food_hygiene",
    title: "Essential food hygiene",
    summary: "Contamination, temperatures, cooling, pests, personal hygiene and cleaning.",
    minutes: 8,
    blocks: [
      {
        kind: "text",
        text:
          "Food can become unsafe through contamination or through the growth or survival of harmful microorganisms. Staff must prevent contamination, control bacterial growth and use correct cooking, cleaning and disinfection controls.",
      },
      {
        kind: "list",
        items: [
          "Friendly bacteria may be intentionally used in food production.",
          "Spoilage bacteria make food deteriorate.",
          "Pathogenic bacteria can cause food poisoning.",
          "Bacterial growth is encouraged by suitable food, moisture, time and warmth.",
          "High-risk and ready-to-eat foods need particularly careful control because they may receive no further cooking before service.",
        ],
      },
      {
        kind: "text",
        text:
          "Ugly Dumpling's food-safety management system identifies hazards, the controls needed and the checks and records that show those controls are working. Complete any monitoring assigned to your role accurately and at the correct time.",
      },
      {
        kind: "list",
        items: [
          "Use a clean, disinfected probe thermometer where a temperature check is required.",
          "Record checks immediately; never invent or back-fill a temperature.",
          "Escalate any out-of-limit result to the manager and follow the corrective action for that control.",
          "Do not serve or use food where safety cannot be established.",
        ],
      },
      {
        kind: "table",
        head: ["Control", "Benchmark", "Action"],
        rows: [
          ["Chilled delivery", "8°C or below", "Reject or escalate if above limit"],
          ["Frozen delivery", "-15°C or below", "Reject or escalate if above limit"],
          ["Chilled storage", "8°C or below", "Record checks; move food if out of limit"],
          ["Frozen storage", "-18°C or below", "Escalate and protect stock if out of limit"],
          ["Cooking / reheating", "70°C for 2 minutes", "Check centre or core where required"],
          ["Hot holding", "Above 63°C", "Check and record during service"],
        ],
      },
      {
        kind: "callout",
        title: "Which limit applies",
        text:
          "These are the training benchmarks from the induction booklet. Where the site food-safety system or a recipe control sets a stricter or product-specific validated limit, that takes priority.",
      },
      {
        kind: "text",
        text: "Cooling and ready-to-eat food",
      },
      {
        kind: "list",
        items: [
          "Cool cooked high-risk food as rapidly as the approved site procedure requires; the booklet states refrigeration within 90 minutes.",
          "Use shallow containers, blast chilling or another approved rapid-cooling method.",
          "Record cooling time and temperature where the site system requires it.",
          "Keep ready-to-eat food protected from raw food and other contamination.",
          "Store raw or non-ready-to-eat food below and away from ready-to-eat food.",
        ],
      },
      {
        kind: "text",
        text:
          "Cross-contamination may be bacterial, physical or chemical, and can happen directly or indirectly through hands, cloths, utensils, boards, equipment, sinks or surfaces.",
      },
      {
        kind: "list",
        items: [
          "Use the correct separate equipment and preparation areas for ready-to-eat and non-ready-to-eat food.",
          "Wash hands between incompatible tasks.",
          "Clean and disinfect food-contact and hand-contact surfaces correctly.",
          "Keep food covered during storage.",
          "Keep glass and other foreign-body risks controlled in food areas.",
          "Never decant chemicals into unlabelled containers, and keep chemical containers closed.",
        ],
      },
      {
        kind: "text",
        text: "Pest control",
      },
      {
        kind: "list",
        items: [
          "Keep food covered and off the floor.",
          "Keep food areas clean and complete daily and weekly cleaning.",
          "Report sightings, droppings or signs of pests immediately.",
          "Do not touch or move pest-control bait boxes unless authorised.",
        ],
      },
      {
        kind: "text",
        text: "Personal hygiene",
      },
      {
        kind: "list",
        items: [
          "Arrive clean and wear clean work clothing or uniform.",
          "Wear clean, closed, suitable non-slip footwear.",
          "Keep long hair secured.",
          "Keep fingernails short and clean; no false nails in food-handling roles.",
          "Follow Ugly Dumpling's jewellery rules for your role.",
          "Cover cuts and sores with a clean blue waterproof dressing and replace it when necessary.",
          "Do not chew gum, eat, cough, sneeze or spit over food.",
          "Use a clean utensil for tasting; never use fingers.",
          "Do not wear strong perfume or aftershave where it could taint food.",
        ],
      },
      {
        kind: "steps",
        items: [
          "Palm to palm.",
          "Backs of hands.",
          "Between and interlocked fingers.",
          "Backs of fingers.",
          "Thumbs, fingertips and all parts of the hands.",
          "Rinse and dry thoroughly.",
        ],
      },
      {
        kind: "text",
        text:
          "Wash hands at the designated handwash basin using the site handwashing procedure. Dry hands thoroughly using the approved method and avoid re-contaminating clean hands.",
      },
      {
        kind: "text",
        text: "Cleaning and disinfection",
      },
      {
        kind: "list",
        items: [
          "Clean as you go.",
          "Clean and disinfect food-contact equipment after use and between incompatible tasks.",
          "Follow the correct dilution, method and contact time for the product in use.",
          "Regularly disinfect high-touch points such as handles and taps where required.",
          "Never use equipment used for raw food on ready-to-eat food until it has been properly cleaned and disinfected.",
          "Empty and clean waste bins as required.",
        ],
      },
    ],
  },
  {
    key: "allergens",
    title: "Food allergen safety",
    summary: "The 14 allergens, the customer procedure and what to do in an emergency.",
    minutes: 6,
    blocks: [
      {
        kind: "callout",
        title: "Never guess",
        text:
          "Allergen information must be accurate. Always use the current Ugly Dumpling allergen information when answering a customer. If anything is unclear, stop and ask the manager.",
      },
      {
        kind: "list",
        items: [
          "Celery",
          "Cereals containing gluten",
          "Crustaceans",
          "Eggs",
          "Fish",
          "Lupin",
          "Milk",
          "Molluscs",
          "Mustard",
          "Peanuts",
          "Sesame",
          "Soya",
          "Sulphur dioxide and sulphites",
          "Tree nuts",
        ],
      },
      {
        kind: "steps",
        items: [
          "Ask the customer to tell us about allergies or intolerances before ordering.",
          "Take the declaration seriously and record it accurately in the approved ordering/POS process.",
          "A manager must be involved every time an allergy is declared.",
          "Communicate the requirement to the kitchen using the approved written or system process — verbal alone is not sufficient.",
          "The kitchen follows the relevant recipe, segregation, equipment, cleaning and cross-contact controls.",
          "A manager or senior team member carries out the final check at the pass, and the dish must be clearly identifiable.",
          "The server verbally reconfirms the declared allergy when serving.",
          "If safety cannot be established, tell the customer clearly that we cannot confirm the dish is suitable. Never guess.",
        ],
      },
      {
        kind: "callout",
        title: "Gluten-free controls",
        text:
          "Gluten-free items and regular items are separate variants. Use the designated black plates and ramekins and separate pans and equipment. Gluten-free products are stored in designated fridge and freezer areas, clearly separated from regular products. Use the current allergen matrix — never assume two versions of a flavour have identical ingredients.",
      },
      {
        kind: "callout",
        title: "Suspected anaphylaxis",
        text:
          "Treat a suspected severe allergic reaction as an emergency. Call 999 and say anaphylaxis is suspected. Follow current first-aid training, keep the person under observation and send someone to meet the ambulance where appropriate. Do not give food or drink. If the person has prescribed emergency medication, follow their instructions and the training applicable to your role.",
      },
    ],
  },
  {
    key: "health_safety",
    title: "Health & safety",
    summary: "Accidents, slips, knives, burns, lifting, chemicals, electricity and fire.",
    minutes: 8,
    blocks: [
      {
        kind: "text",
        text:
          "Every employee must take reasonable care of their own safety and that of others, cooperate with safety arrangements, attend required training, use equipment only as trained, and report hazards, defects, accidents and concerns promptly.",
      },
      {
        kind: "text",
        text: "Accidents and first aid",
      },
      {
        kind: "list",
        items: [
          "Report every accident, injury and near miss to the manager, however minor.",
          "Get a trained first aider or emergency help when needed.",
          "Do not move an injured person unless necessary for immediate safety or you are trained to do so.",
          "Know where the first-aid kit is and how to identify the first aider on duty.",
        ],
      },
      { kind: "site", fields: ["first_aid_kit_location", "accident_book_location"] },
      {
        kind: "text",
        text: "Slips and trips",
      },
      {
        kind: "list",
        items: [
          "Clean spillages immediately and use a warning sign where appropriate.",
          "Keep walkways, stairs and work areas clear.",
          "Do not leave trailing cables or other trip hazards.",
          "Wear suitable footwear.",
          "Report damaged flooring or other hazards promptly.",
        ],
      },
      {
        kind: "text",
        text: "Cuts and knives",
      },
      {
        kind: "list",
        items: [
          "Use the correct knife for the task and a stable cutting surface.",
          "Keep knives suitably sharp and store them safely.",
          "Carry knives with the blade pointing down.",
          "Never try to catch a falling knife — step clear.",
          "Do not leave knives hidden in sinks.",
          "Report defective knives or equipment, and do not use unsafe equipment.",
        ],
      },
      {
        kind: "text",
        text: "Burns, hot surfaces and liquids",
      },
      {
        kind: "list",
        items: [
          "Use provided oven cloths, gloves, mitts, tongs or other suitable controls.",
          "Assume pans, trays, handles and equipment may be hot unless confirmed otherwise.",
          "Allow equipment and oil to cool before cleaning or moving it where required.",
          "Warn colleagues when moving hot items through shared areas.",
        ],
      },
      {
        kind: "text",
        text: "Manual handling",
      },
      {
        kind: "list",
        items: [
          "Stop and assess the load and route before lifting.",
          "Do not lift something too heavy or awkward for you — get help.",
          "Use a trolley or other aid where available.",
          "Adopt a stable position, bend appropriately, keep the load close and avoid twisting.",
          "Report any concern that makes a manual-handling task unsafe.",
        ],
      },
      {
        kind: "text",
        text: "Cleaning chemicals and COSHH",
      },
      {
        kind: "list",
        items: [
          "Only use chemicals you have been trained and authorised to use.",
          "Read and follow the product instructions and site COSHH controls.",
          "Never mix cleaning chemicals.",
          "Wear required PPE.",
          "Keep chemicals in labelled containers and away from food and drink.",
          "Deal with spillages according to the product or site procedure.",
          "Report exposure, symptoms, damaged containers or missing PPE immediately.",
        ],
      },
      {
        kind: "text",
        text: "Work at height, PPE, electricity and equipment",
      },
      {
        kind: "list",
        items: [
          "Avoid work at height where possible; use only approved access equipment, and only if trained.",
          "Check steps and ladders before use and report defects.",
          "Use PPE where the risk assessment or site procedure requires it, and report PPE that is missing, damaged, dirty or does not fit.",
          "Visually check equipment, plugs, cables and connections before use where appropriate.",
          "Report defects and remove unsafe equipment from use in line with site procedure.",
          "Do not overload sockets or use electrical equipment in unsuitable wet conditions.",
          "Do not carry out repairs unless competent and authorised.",
          "Do not use equipment or machinery you have not been trained to use.",
        ],
      },
      {
        kind: "text",
        text: "Fire and evacuation",
      },
      {
        kind: "list",
        items: [
          "Know how to raise the alarm.",
          "Leave by the nearest safe exit when the alarm sounds.",
          "Do not stop to collect personal belongings.",
          "Go directly to the assembly point and report as instructed.",
          "Do not re-enter until authorised.",
          "Keep fire exits and fire doors clear.",
          "Only trained and authorised people should consider using firefighting equipment, and only when it is safe.",
        ],
      },
    ],
  },
  {
    key: "site_information",
    title: "Your site: fire, first aid and checks",
    summary: "The details for the restaurant you work in.",
    minutes: 3,
    blocks: [
      {
        kind: "text",
        text:
          "These details apply to your site. Your manager will also show you each location in person during your site induction.",
      },
      {
        kind: "site",
        fields: [
          "fire_exit_routes",
          "fire_assembly_point",
          "fire_alarm_call_points",
          "evacuation_report_to",
          "fire_hazard_reporting_route",
          "first_aid_kit_location",
          "temperature_check_times",
        ],
      },
      {
        kind: "callout",
        title: "In an emergency",
        text:
          "Call 999 immediately and inform the manager on duty. Evacuation is the priority. Never attempt to fight a fire unless you are trained, it is safe to do so and you have a clear escape route. Nobody re-enters until the emergency services or another authorised person confirms it is safe.",
      },
      {
        kind: "text",
        text: "Temperature monitoring",
      },
      {
        kind: "list",
        items: [
          "Fridge and freezer temperatures are checked and recorded twice every day, at opening and at closing, by the senior team member or manager responsible.",
          "If a temperature is out of range, tell the manager immediately.",
          "If urgent, move affected goods to another suitable working fridge or freezer.",
          "If food safety cannot be assured, the food must not be used and must be disposed of.",
        ],
      },
    ],
  },
  {
    key: "conduct",
    title: "Dress, conduct and hand hygiene",
    summary: "Uniform, jewellery, phones, breaks, gloves, cuts and broken glass.",
    minutes: 4,
    blocks: [
      {
        kind: "list",
        items: [
          "Front of house: no fixed uniform — smart-casual dress standard.",
          "Kitchen: Ugly Dumpling branded T-shirt, apron and closed-toe non-slip work shoes.",
          "Long hair must be tied back while working.",
          "No acrylic or false nails and no nail extensions for food handlers. Nail polish is permitted provided nails are clean and well maintained.",
          "No jewellery while working, front of house or kitchen.",
          "No strong perfume, aftershave or other strong scents while working.",
          "Smoking and vaping are not permitted during working hours.",
          "Personal mobile phone use is not permitted during shifts.",
          "If you need to eat, take an appropriate break and eat only in the designated staff area.",
          "Water may be consumed during the shift where it is kept and consumed appropriately and creates no food-hygiene risk.",
        ],
      },
      {
        kind: "text",
        text: "Hand hygiene, gloves, cuts and broken glass",
      },
      {
        kind: "list",
        items: [
          "Wash hands before starting work, after using the toilet, after handling raw food, after handling waste or cleaning materials, after eating, and whenever hands may have become contaminated.",
          "Kitchen staff use disposable gloves when handling food. Gloves do not replace handwashing and must be changed whenever contaminated and between incompatible tasks.",
          "Cuts and wounds must be cleaned and completely covered with a blue waterproof dressing before returning to food handling.",
          "If glass breaks, stop work in the affected area, inform the manager, remove and dispose of potentially contaminated food, clean thoroughly and confirm all fragments are removed before service resumes.",
        ],
      },
      {
        kind: "callout",
        title: "Chemicals on site",
        text:
          "Bleach, beer-line cleaner, disinfectant, floor cleaner, limescale remover, window cleaner and degreaser are kept in the designated chemical store, separate from food. Every container, including refillable spray bottles, must be clearly labelled. Never use an unlabelled container. Follow the product label and COSHH information for dilution, contact time and PPE.",
      },
    ],
  },
  {
    key: "practical_training",
    title: "Practical training and what it does not cover",
    summary: "Reading this does not authorise you to use equipment.",
    minutes: 2,
    blocks: [
      {
        kind: "text",
        text:
          "Specific practical training is provided for fryer use, knives and cooking equipment, and for beer-line cleaning and beer or keg handling where these tasks form part of your duties. Follow the training and safe working method provided.",
      },
      {
        kind: "callout",
        title: "Important",
        text:
          "Completing this induction does not authorise you to operate equipment or perform a task that needs practical training until that training has been completed and recorded by your manager.",
      },
    ],
  },
];

/* ── Health declaration ── */

export interface DeclarationQuestion {
  key: string;
  text: string;
}

export const HEALTH_DECLARATION_QUESTIONS: DeclarationQuestion[] = [
  { key: "diarrhoea", text: "At present, or in the last 7 days, have you had diarrhoea?" },
  { key: "vomiting", text: "At present, or in the last 7 days, have you had vomiting, stomach pain, nausea or fever?" },
  { key: "infected_skin", text: "Do you currently have an infected cut, sore, boil, skin infection or discharge affecting the hands, arms or face?" },
  { key: "jaundice", text: "Do you currently have jaundice?" },
  { key: "bowel_disorder", text: "Do you have a recurring bowel disorder that could affect food handling?" },
  { key: "recurring_infection", text: "Do you have recurring infections of the skin, ear or throat that could affect food handling?" },
  { key: "typhoid_history", text: "Have you ever had typhoid or paratyphoid fever, or been told you are a carrier of Salmonella Typhi or Paratyphi?" },
  { key: "salmonella_carrier", text: "Are you known to be a carrier of Salmonella?" },
  { key: "typhoid_contact", text: "In the last 21 days, have you been in close contact with someone who may have had typhoid or paratyphoid?" },
  { key: "travel_illness", text: "Have you been unwell while travelling recently in a way that may be relevant to food handling?" },
];

export const DECLARATION_STATEMENT =
  "I confirm that the information above is accurate to the best of my knowledge and I will promptly report relevant illness or symptoms to my manager.";

export const ILLNESS_RULE =
  "If you have diarrhoea or vomiting, do not handle food and report it immediately. Return to food-handling duties only when the exclusion period and manager assessment have been satisfied. The induction states 48 hours symptom-free, applied consistently with current FSA fitness-to-work guidance.";

/* ── Knowledge check ── */

export interface AssessmentQuestion {
  key: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export const ASSESSMENT_PASS_MARK = 8;

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    key: "q1",
    text: "A customer says they have a severe sesame allergy. What is the correct first action?",
    options: ["Guess from memory", "Remove visible sesame", "Record and escalate it, and follow the allergen procedure"],
    correctIndex: 2,
  },
  {
    key: "q2",
    text: "A fridge check is outside the approved limit. What should you do?",
    options: ["Ignore it", "Record and escalate it, and follow the corrective action", "Change the number"],
    correctIndex: 1,
  },
  {
    key: "q3",
    text: "You have vomiting or diarrhoea. What should you do?",
    options: ["Work as normal", "Tell the manager and do not handle food", "Only avoid desserts"],
    correctIndex: 1,
  },
  {
    key: "q4",
    text: "You spill liquid on the floor during service. What should you do?",
    options: ["Leave it until close", "Clean and control it immediately", "Put a chair over it"],
    correctIndex: 1,
  },
  {
    key: "q5",
    text: "You are unsure whether a dish contains an allergen. What should you tell the customer?",
    options: ["It should be fine", "Check the approved information and the manager; never guess", "Taste it"],
    correctIndex: 1,
  },
  {
    key: "q6",
    text: "A knife starts to fall. What should you do?",
    options: ["Catch it", "Step clear and let it fall safely", "Grab the blade"],
    correctIndex: 1,
  },
  {
    key: "q7",
    text: "Can cleaning chemicals be mixed to make them stronger?",
    options: ["Yes", "No"],
    correctIndex: 1,
  },
  {
    key: "q8",
    text: "Can you use equipment you have not been trained to use?",
    options: ["Yes if busy", "No"],
    correctIndex: 1,
  },
  {
    key: "q9",
    text: "When the fire alarm sounds, what is the priority?",
    options: ["Finish the order", "Evacuate by the nearest safe route", "Collect belongings"],
    correctIndex: 1,
  },
  {
    key: "q10",
    text: "Who is responsible for reporting hazards?",
    options: ["Managers only", "Everyone"],
    correctIndex: 1,
  },
];

/** Marks a submitted set of answers. Pure. */
export function scoreAssessment(answers: Record<string, number>): {
  score: number;
  total: number;
  passed: boolean;
  wrongKeys: string[];
} {
  const wrongKeys: string[] = [];
  let score = 0;
  for (const q of ASSESSMENT_QUESTIONS) {
    if (answers[q.key] === q.correctIndex) score += 1;
    else wrongKeys.push(q.key);
  }
  return { score, total: ASSESSMENT_QUESTIONS.length, passed: score >= ASSESSMENT_PASS_MARK, wrongKeys };
}

/* ── Practical items verified by a manager on site ── */

export const PRACTICAL_GROUPS = {
  role_task: "Role and task training",
  manual_handling: "Manual handling",
  site_induction: "Site induction — shown in person",
} as const;

export type PracticalGroupKey = keyof typeof PRACTICAL_GROUPS;

export interface PracticalTask {
  group: PracticalGroupKey;
  label: string;
  /** Roles this task normally applies to. Empty = all roles. */
  roles?: string[];
}

export const PRACTICAL_TASKS: PracticalTask[] = [
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

/** Practical tasks that apply to a role, in display order. */
export function practicalTasksForRole(role?: string | null): PracticalTask[] {
  return PRACTICAL_TASKS.filter((t) => !t.roles || !role || t.roles.includes(role));
}

/** Modules that apply to a role, in display order. */
export function modulesForRole(role?: string | null): InductionModule[] {
  return INDUCTION_MODULES.filter((m) => !m.roles || !role || m.roles.includes(role));
}

export const FINAL_DECLARATION =
  "I confirm that I have completed the Ugly Dumpling induction modules assigned to my role and site. I understand the food hygiene, allergen and health & safety requirements explained to me, and I understand that I must follow current Ugly Dumpling procedures and ask a manager whenever I am unsure. I understand that completing this induction does not authorise me to operate equipment or perform a task for which practical training is required until that training has been completed and recorded.";
