/**
 * Food Safety and Personal Hygiene — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const foodSafetyLesson: LessonContent = {
  module_title: "Food Safety and Personal Hygiene",
  version: "1.0",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  sources: [
    {
      id: "ec-852-2004",
      name: "Retained EU Regulation (EC) No 852/2004 — Hygiene of Foodstuffs",
      type: "legal_requirement",
      jurisdiction: "UK (retained EU law)",
      url: "https://www.legislation.gov.uk/eur/2004/852/contents",
      relevance: "Primary legal basis requiring food businesses to implement food safety management procedures based on HACCP principles, including temperature control and personal hygiene.",
    },
    {
      id: "food-safety-act-1990",
      name: "Food Safety Act 1990",
      type: "legal_requirement",
      jurisdiction: "England, Wales, Scotland",
      url: "https://www.legislation.gov.uk/ukpga/1990/16/contents",
      relevance: "Establishes the offence of placing unsafe food on the market. Makes it an offence to sell food that does not comply with food safety requirements.",
    },
    {
      id: "fsa-sfbb",
      name: "Food Standards Agency — Safer Food, Better Business (SFBB)",
      type: "official_guidance",
      jurisdiction: "England and Wales",
      url: "https://www.food.gov.uk/business-guidance/safer-food-better-business",
      relevance: "FSA food safety management pack for caterers covering cross-contamination, cleaning, chilling, and cooking. Provides the operational framework for food safety compliance.",
    },
    {
      id: "fsa-temperature",
      name: "Food Standards Agency — Chilling and Cooking Guidance",
      type: "official_guidance",
      jurisdiction: "England, Wales, Northern Ireland",
      url: "https://www.food.gov.uk/safety-hygiene/chilling",
      relevance: "FSA guidance on safe temperature ranges for chilling, cooking, and hot-holding of food.",
    },
    {
      id: "nhs-food-handlers",
      name: "NHS — Food Handlers: Fitness to Work Guidance",
      type: "official_guidance",
      jurisdiction: "UK",
      url: "https://www.nhs.uk/conditions/food-poisoning/",
      relevance: "NHS guidance on exclusion periods for food handlers with symptoms of foodborne illness.",
    },
    {
      id: "internal-hygiene",
      name: "UGLŌ Internal Hygiene Standards",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific uniform standards, jewellery policy, and daily temperature logging requirements.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Food safety and personal hygiene are legal requirements for everyone who handles food. Poor food safety can cause foodborne illness, enforcement action, and closure of the business.",
        "This module covers the legal rules, official guidance, and our company standards for keeping food safe from preparation through to service.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "Food businesses must have food safety management procedures in place based on HACCP (Hazard Analysis and Critical Control Points) principles. This is a legal requirement under retained EU Regulation 852/2004.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "It is an offence to sell food that is unsafe or not of the nature, substance, or quality demanded by the consumer under the Food Safety Act 1990.",
          classification: "legal_requirement",
          source_id: "food-safety-act-1990",
        },
        {
          text: "Customer review patterns show that food temperature and cleanliness are recurring complaint themes. Visible hygiene failures damage customer confidence and review scores.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
      ],
    },
    {
      heading: "Key Rules: Temperature Control",
      type: "key_rules",
      points: [
        {
          text: "Chilled food must be kept at 8°C or below. The FSA recommends setting fridges to 5°C to provide a safety margin.",
          classification: "official_guidance",
          source_id: "fsa-temperature",
        },
        {
          text: "Cooked food must reach a core temperature of at least 70°C for 2 minutes (or equivalent time/temperature combination) to kill harmful bacteria.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Hot food being held for service must be kept at 63°C or above.",
          classification: "official_guidance",
          source_id: "fsa-temperature",
        },
        {
          text: "The temperature danger zone is between 8°C and 63°C. Bacteria multiply most rapidly in this range. Food should not remain in this zone longer than necessary.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Deliveries of chilled goods should be checked on arrival. If chilled food arrives above 8°C, it should be rejected or assessed based on SFBB guidance.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
      ],
    },
    {
      heading: "Key Rules: Handwashing",
      type: "key_rules",
      points: [
        {
          text: "Adequate handwashing facilities must be provided in food handling areas. These must have hot and cold running water, soap, and hygienic drying facilities.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Staff must wash hands thoroughly: wet hands, apply soap, rub all surfaces including between fingers and under nails for at least 20 seconds, rinse under running water, and dry with a disposable towel or air dryer.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Hands must be washed before handling food, after handling raw food, after touching bins or waste, after using the toilet, after coughing, sneezing, or touching your face, after a break, and after handling cleaning chemicals.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
      ],
    },
    {
      heading: "Key Rules: Personal Hygiene and Fitness to Work",
      type: "key_rules",
      points: [
        {
          text: "Staff handling food must maintain a high degree of personal cleanliness and wear suitable, clean clothing. This is a legal requirement.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Any person suffering from or carrying a disease likely to be transmitted through food must not handle food or enter food handling areas. Staff must report symptoms of vomiting, diarrhoea, infected skin conditions, or sores to their manager before starting work.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "The FSA SFBB guidance recommends that staff with diarrhoea or vomiting should not return to work until at least 48 hours after symptoms have stopped.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Cuts and sores must be covered with a brightly coloured waterproof dressing (typically blue plasters in food environments) to prevent contamination and aid visibility if a dressing falls off.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Our company standard: staff must wear clean uniform with hair tied back, no watches or jewellery (except a plain wedding band) in food preparation areas. Nails must be short, clean, and free of nail varnish.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
      ],
    },
    {
      heading: "Step-by-Step: Start of Shift",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Report illness: If you have any symptoms of vomiting, diarrhoea, infected skin conditions, or other illness that could affect food safety, tell your manager before entering the kitchen.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Step 2 — Change into clean uniform: Wear your clean, designated work uniform. Remove watches, rings (except plain wedding band), and tie back long hair.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Step 3 — Wash hands thoroughly before touching any food, equipment, or surfaces in the kitchen.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Step 4 — Check temperatures: Verify fridge and freezer temperatures are within safe range and record readings on the temperature log.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Skipping handwashing between handling raw and ready-to-eat food — this is one of the most common cross-contamination risks.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Not probing food deliveries on arrival — temperature-abused deliveries can introduce unsafe food into your supply chain.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Coming to work while symptomatic and not disclosing illness — this creates a legal risk and can cause outbreaks of foodborne illness.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Wearing rings, watches, or loose jewellery in food prep areas.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Failing to record temperatures accurately or filling in logs retrospectively rather than at the time of the check.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A chilled delivery arrives at 10°C. This is above the 8°C legal threshold. You should check it against SFBB guidance — if it has been above 8°C for an extended period, the delivery should be rejected. Record the temperature and the decision taken.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Scenario 2: A team member has a plaster on their hand. The plaster must be a brightly coloured waterproof dressing. If the original plaster is a skin-coloured plaster from home, they must replace it with a blue catering plaster before entering the kitchen.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Scenario 3: You sneeze while prepping food. Stop immediately, move away from food and surfaces, wash your hands thoroughly, and then return to the task. If you have sneezed directly onto food, that food must be discarded.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Scenario 4: During a busy service, hot-held soup has dropped to 55°C. This is below 63°C. The food should be reheated to at least 70°C for 2 minutes or discarded. It must not continue to be served at 55°C.",
          classification: "official_guidance",
          source_id: "fsa-temperature",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Wash hands after every task change, break, and toilet visit.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "Probe-check temperatures on receipt of deliveries, during holding, and before service.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Wear clean uniform with hair tied back and no exposed jewellery in food areas.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Report illness symptoms before starting a shift — this is both a legal duty and a company requirement.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are handwashing facilities stocked with soap, warm water, and drying materials?",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Are temperature logs being completed accurately and at the correct times?",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Are staff in correct, clean uniform with no watches or jewellery?",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Are illness reporting procedures being followed? Are staff disclosing symptoms before shifts?",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Are SFBB diary pages being maintained and available for inspection?",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Demonstrate correct handwashing technique and identify when handwashing is required.",
          classification: "official_guidance",
          source_id: "fsa-sfbb",
        },
        {
          text: "State the temperature danger zone and explain safe holding, cooking, and chilling temperatures.",
          classification: "official_guidance",
          source_id: "fsa-temperature",
        },
        {
          text: "Apply personal hygiene standards including uniform and jewellery rules.",
          classification: "internal_standard",
          source_id: "internal-hygiene",
        },
        {
          text: "Explain the legal duty to report illness symptoms before handling food.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific bacteria names and incubation periods (e.g. Salmonella 6–72 hours) — excluded because exact clinical data varies by source and is not needed for operational training at this level.",
    "Specific EHO scoring criteria and rating methodology — excluded because this is enforcement-specific and not a direct staff training point.",
    "Claim that food safety offences carry 'unlimited fines' — excluded because penalty specifics depend on circumstances and court discretion.",
  ],

  remaining_gaps: [
    "Exact company temperature logging schedule (frequency, who signs off) — referenced as internal standard but specific procedure document not available in current materials.",
    "Whether UGLŌ uses physical SFBB diary packs or an electronic equivalent — operational detail not confirmed.",
  ],

  quiz_support_notes: [
    "Questions on temperature thresholds (8°C, 63°C, 70°C) — supported by FSA guidance.",
    "Questions on handwashing triggers and technique — supported by SFBB.",
    "Questions on illness reporting duty — supported by EC 852/2004.",
    "Questions on personal hygiene and uniform — company policy supported by internal standards.",
    "Do NOT quiz on specific bacteria names, EHO ratings, or penalty amounts.",
  ],

  refresher_recommendation: "Annual refresher aligned with SFBB review cycle. UGLŌ sets a 365-day refresher as an internal standard.",

  practical_signoff_points: [
    "Demonstrate correct handwashing technique (observed by manager)",
    "Correctly probe-check temperature of a delivered item and record it",
    "Identify at least 3 situations requiring handwashing",
    "State the temperature danger zone and safe cooking core temperature",
    "Demonstrate correct uniform and hygiene presentation",
  ],

  manager_observation_notes: [
    "Check handwashing compliance during busy service periods",
    "Verify temperature log entries match actual fridge/probe readings",
    "Observe uniform and hygiene compliance at shift start",
    "Confirm illness reporting culture — staff feel safe to disclose symptoms",
  ],
};
