/**
 * Cleaning and Sanitisation Basics — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const cleaningSanitisationLesson: LessonContent = {
  module_title: "Cleaning and Sanitisation Basics",
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
      relevance: "Requires food premises, equipment, and surfaces to be kept clean and, where necessary, disinfected. Sets the legal duty to maintain hygiene.",
    },
    {
      id: "fsa-sfbb-cleaning",
      name: "Food Standards Agency — SFBB Cleaning Section",
      type: "official_guidance",
      jurisdiction: "England and Wales",
      url: "https://www.food.gov.uk/business-guidance/safer-food-better-business",
      relevance: "SFBB cleaning guidance covers the two-stage clean process, cleaning schedules, and disinfection procedures for food businesses.",
    },
    {
      id: "hse-coshh",
      name: "HSE — Control of Substances Hazardous to Health (COSHH) Regulations 2002",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/coshh/index.htm",
      relevance: "Employers must assess and control risks from hazardous substances including cleaning chemicals. Staff must be informed about risks and trained on safe use.",
    },
    {
      id: "internal-cleaning",
      name: "UGLŌ Internal Cleaning Standards",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific colour-coded cloth system, cleaning schedule accountability, chemical dilution station setup, and reporting procedures.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Cleaning and sanitisation are separate steps that together prevent bacterial contamination. A surface can look clean but still harbour harmful bacteria if it has not been properly sanitised.",
        "This module covers the legal requirements for cleanliness in food premises, the correct two-stage cleaning process, safe chemical handling, and our company's cleaning standards.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "Food premises and all equipment and surfaces that come into contact with food must be kept clean and, where necessary, disinfected. This is a legal requirement.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
        {
          text: "Employers must assess the risks from hazardous substances (including cleaning chemicals) and ensure staff are informed and trained in their safe use under COSHH Regulations.",
          classification: "legal_requirement",
          source_id: "hse-coshh",
        },
        {
          text: "Customer reviews frequently mention cleanliness as a key factor in their experience. Visible dirt or poor hygiene perception directly affects review scores and return visits.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
      ],
    },
    {
      heading: "Key Rules",
      type: "key_rules",
      points: [
        {
          text: "Cleaning removes visible dirt, grease, and food debris from a surface. Sanitising (disinfecting) kills bacteria on the surface. Both steps are required — cleaning alone does not make a surface safe for food preparation.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "The two-stage process: Stage 1 — clean the surface with detergent and warm water to remove visible dirt. Stage 2 — apply sanitiser or disinfectant and allow the required contact time before wiping or rinsing.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Sanitiser must remain in contact with the surface for the time specified on the product label. Wiping it off immediately reduces its effectiveness.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Cleaning chemicals must be used at the correct dilution ratio as specified by the manufacturer. Too weak — ineffective. Too strong — can leave chemical residue on food contact surfaces and may be hazardous to staff.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Under COSHH, employers must provide information on the hazardous substances staff use, including cleaning chemicals. Staff should know what chemicals they are using, the correct dilution, and what to do in case of spillage or skin contact.",
          classification: "legal_requirement",
          source_id: "hse-coshh",
        },
        {
          text: "Cleaning materials and chemicals must be stored separately from food and food packaging to prevent contamination.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
      ],
    },
    {
      heading: "Step-by-Step: The Two-Stage Clean",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Remove loose debris: Clear food waste, crumbs, or spillage from the surface.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Step 2 — Clean with detergent: Apply detergent and warm water using the correct cloth. Scrub to remove grease and visible dirt.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Step 3 — Rinse: Rinse the surface with clean water to remove detergent residue.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Step 4 — Apply sanitiser: Spray or wipe sanitiser onto the surface. Allow the contact time specified on the product label.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Step 5 — Air dry or use clean disposable paper: Allow the surface to air dry where possible. Use a clean disposable paper towel if immediate drying is needed.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Step 6 — Sign the cleaning schedule: Our company standard requires signing the cleaning schedule immediately after completing the task — not before, not hours later.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
      ],
    },
    {
      heading: "Colour-Coded Cloths and Equipment",
      type: "key_rules",
      points: [
        {
          text: "The FSA SFBB guidance recommends using different cloths and equipment for different areas to prevent cross-contamination (e.g. separate cloths for raw food areas, ready-to-eat food areas, and general surfaces).",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Our company uses a colour-coded cloth system. Staff must use the correct colour for each area. Using the wrong cloth in the wrong area risks cross-contamination.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Cloths must be changed regularly during service. Reusing a dirty cloth spreads bacteria rather than removing them.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Using the same cloth for multiple areas — this transfers bacteria from one surface to another.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Signing the cleaning schedule without actually completing the task. This creates a false record and can lead to failed inspections.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Not allowing sanitiser contact time before wiping — the sanitiser needs time on the surface to kill bacteria.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Using incorrect dilution ratios — either guessing or using neat chemical when diluted is specified.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Storing cleaning chemicals next to food or food packaging.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A surface looks clean after wiping with a cloth. Can food be prepped on it? No — visual cleanliness does not mean the surface is safe. The two-stage clean (detergent then sanitiser with contact time) must be completed before food preparation.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Scenario 2: The cleaning chemical runs out mid-shift. What should you do? Do not improvise with a random substitute. Report the shortage to the manager. Use an approved alternative if one is available, at the correct dilution. Record the issue.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Scenario 3: You get cleaning chemical on your skin. Rinse the affected area with plenty of water immediately. Check the product safety data sheet or label for further instructions. Report the incident to your manager.",
          classification: "legal_requirement",
          source_id: "hse-coshh",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Always follow the two-stage clean process — clean then sanitise. Never skip sanitisation.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Use the correct colour-coded cloth for the area you are cleaning.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Sign the cleaning schedule immediately after completing the task — not before, not later.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Report empty chemical containers before they fully run out so replacements can be arranged.",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are cleaning schedules being completed honestly and on time?",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Are colour-coded cloths being used correctly in the right areas?",
          classification: "internal_standard",
          source_id: "internal-cleaning",
        },
        {
          text: "Are chemical dilution stations set up properly with clear labels?",
          classification: "legal_requirement",
          source_id: "hse-coshh",
        },
        {
          text: "Is the two-stage clean process being followed, or are staff skipping sanitisation?",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Are COSHH data sheets accessible for all cleaning chemicals in use?",
          classification: "legal_requirement",
          source_id: "hse-coshh",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Explain the difference between cleaning and sanitising and why both are required.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Demonstrate the correct two-stage clean process including sanitiser contact time.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Use correct chemical dilution ratios as specified by the manufacturer.",
          classification: "official_guidance",
          source_id: "fsa-sfbb-cleaning",
        },
        {
          text: "Identify where cleaning chemicals must be stored and why.",
          classification: "legal_requirement",
          source_id: "ec-852-2004",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific cleaning chemical brand names and dilution ratios — excluded because these are product-specific and vary. Staff should follow the label on the actual product in use.",
    "Specific colour assignments for the cloth system (e.g. red = raw meat) — excluded because this varies by company. The system is referenced as an internal standard.",
    "Claim that 'sanitiser kills 99.9% of bacteria' — excluded because this is a marketing claim and varies by product and application.",
  ],

  remaining_gaps: [
    "Exact company colour-coded cloth assignments — referenced as an internal standard but specific colour map not available in current materials.",
    "Company-specific COSHH assessment for cleaning chemicals currently in use — should be maintained on-site.",
  ],

  quiz_support_notes: [
    "Questions on the two-stage clean process — supported by SFBB.",
    "Questions on why sanitiser contact time matters — supported by SFBB.",
    "Questions on chemical storage rules — supported by EC 852/2004.",
    "Questions on COSHH duty to inform staff — supported by COSHH Regulations.",
    "Do NOT quiz on specific chemical brand names, exact dilution ratios, or colour-code assignments.",
  ],

  refresher_recommendation: "Annual refresher aligned with SFBB review cycle. UGLŌ sets a 365-day refresher as an internal standard.",

  practical_signoff_points: [
    "Demonstrate the two-stage clean process on a food contact surface (observed by manager)",
    "Identify the correct colour-coded cloth for at least 2 different areas",
    "Show where cleaning chemicals are stored and explain why",
    "Read a chemical label and state the correct dilution ratio and contact time",
  ],

  manager_observation_notes: [
    "Spot-check cleaning schedule entries against actual cleanliness",
    "Observe whether sanitiser is being given proper contact time",
    "Verify COSHH data sheets are accessible near chemical storage",
    "Check cloth usage — correct colours in correct areas",
  ],
};
