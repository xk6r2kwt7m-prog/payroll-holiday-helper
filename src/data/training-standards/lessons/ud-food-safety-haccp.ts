/**
 * Food Safety and HACCP Basics — source-backed lesson content.
 *
 * Source documents: Ugly Dumpling FS HACCP (restaurant) and
 * Ugly Dumpling Market FS HACCP (market unit).
 * Legal framing from Regulation (EC) 852/2004 as retained in UK law.
 */

import type { LessonContent } from "../lesson-types";

export const udFoodSafetyHaccpLesson: LessonContent = {
  module_title: "Food Safety and HACCP Basics",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "high",

  sources: [
    {
      id: "ud-haccp-restaurant",
      name: "Ugly Dumpling Food Safety and HACCP — Restaurant",
      type: "internal_standard",
      jurisdiction: "Restaurant sites",
      relevance:
        "The company's documented food safety management system for restaurant sites: hazards, critical control points, monitoring and records.",
    },
    {
      id: "ud-haccp-market",
      name: "Ugly Dumpling Food Safety and HACCP — Market unit",
      type: "internal_standard",
      jurisdiction: "Market unit",
      relevance:
        "The market-specific version of the food safety management system, covering transport, limited facilities and open-air trading.",
    },
    {
      id: "eu-852-2004",
      name: "Regulation (EC) No 852/2004 on the hygiene of foodstuffs (retained UK law)",
      type: "legal_requirement",
      jurisdiction: "United Kingdom",
      url: "https://www.legislation.gov.uk/eur/2004/852/contents",
      relevance:
        "Requires food business operators to put in place, implement and maintain a permanent procedure based on HACCP principles.",
    },
    {
      id: "fsa-safer-food-2",
      name: "Food Standards Agency — Safer Food, Better Business",
      type: "official_guidance",
      jurisdiction: "United Kingdom",
      url: "https://www.food.gov.uk/business-guidance/safer-food-better-business-for-caterers",
      relevance:
        "FSA's recommended approach to the 4Cs and to daily diary records used as due-diligence evidence.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "HACCP means Hazard Analysis and Critical Control Points. In plain terms: work out where food can become unsafe, control those points, and write down that you did.",
        "This lesson explains our system and the records you are personally responsible for.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      points: [
        {
          text: "Food businesses are legally required to put in place, implement and maintain a permanent procedure based on HACCP principles.",
          classification: "legal_requirement",
          source_id: "eu-852-2004",
        },
        {
          text: "Our records are the evidence we show an environmental health officer. Missing records are treated as controls not happening.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
    {
      heading: "The 4Cs",
      type: "key_rules",
      points: [
        {
          text: "Cleaning — clean as you go, and follow the cleaning schedule for your area.",
          classification: "official_guidance",
          source_id: "fsa-safer-food-2",
        },
        {
          text: "Cooking — cook thoroughly to the stated specification for each item.",
          classification: "official_guidance",
          source_id: "fsa-safer-food-2",
        },
        {
          text: "Chilling — keep chilled food cold, cool hot food quickly, and record temperatures.",
          classification: "official_guidance",
          source_id: "fsa-safer-food-2",
        },
        {
          text: "Cross-contamination — keep raw and ready-to-eat foods, equipment and hands separate.",
          classification: "official_guidance",
          source_id: "fsa-safer-food-2",
        },
      ],
    },
    {
      heading: "Our critical control points",
      type: "key_rules",
      points: [
        {
          text: "Delivery: check the condition, date and temperature of chilled and frozen goods on arrival, and reject anything out of specification.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Storage: keep chilled and frozen goods at the temperatures stated in the system, covered, labelled and dated.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Preparation: separate raw and ready-to-eat handling, and limit the time food spends at room temperature.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Cooking: cook to the site specification and check the result before the dish leaves the kitchen.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Hot holding and cooling: hold and cool within the limits set out in the system, and record checks.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Service: protect food from contamination at the pass and in display units.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
    {
      heading: "Extra controls at the market unit",
      type: "key_rules",
      points: [
        {
          text: "Transport: food must be moved in clean, covered, temperature-controlled containers and checked on arrival at the unit.",
          classification: "internal_standard",
          source_id: "ud-haccp-market",
        },
        {
          text: "Water and handwashing: confirm a working handwash facility with soap before trading starts.",
          classification: "internal_standard",
          source_id: "ud-haccp-market",
        },
        {
          text: "Open-air trading: protect food from dust, insects and weather, and keep display units covered.",
          classification: "internal_standard",
          source_id: "ud-haccp-market",
        },
        {
          text: "Limited storage: prepare to demand and never hold surplus beyond the limits in the market system.",
          classification: "internal_standard",
          source_id: "ud-haccp-market",
        },
      ],
    },
    {
      heading: "Records you must complete",
      type: "step_by_step",
      points: [
        {
          text: "Fridge and freezer temperature checks, at the start of the shift and as scheduled.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Delivery checks, including anything rejected and why.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Cooking and hot-holding checks where the specification requires them.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Cleaning schedule sign-off for your area.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Record it when you do it. Never sign for a check you did not personally carry out.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
    {
      heading: "When something goes wrong",
      type: "emergency_response",
      points: [
        {
          text: "If a temperature is out of range, tell the person in charge immediately and record the corrective action taken.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "If food safety may have been compromised, do not serve it. Withdraw it and escalate.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Record any suspected food-related illness, pest sighting or equipment failure in the incident book the same shift.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
    {
      heading: "Common mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Backfilling records at the end of the day.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Recording an out-of-range temperature but not recording what was done about it.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "Accepting a delivery without checking dates and temperatures because the driver is in a hurry.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can explain what HACCP is and why we keep records.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "You can name our critical control points from delivery through to service.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
        {
          text: "You know which records you are responsible for and what to do when a check fails.",
          classification: "internal_standard",
          source_id: "ud-haccp-restaurant",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific numeric temperature and time limits — these are stated in the site HACCP documents and cooking specifications, which must be read on site rather than memorised from this page.",
    "Pest control contractor details and visit schedules.",
  ],
  remaining_gaps: [
    "The numeric critical limits table from each HACCP document should be filed as an attachment to this lesson.",
    "Confirmation of which staff hold a current Level 2 Food Safety certificate at each site is tracked separately under certificates.",
  ],
  quiz_support_notes: [
    "Questions may cover what HACCP means, the 4Cs, which control points exist, record-keeping duties and corrective action only.",
    "Do not ask for numeric temperatures, times or pH values — this lesson deliberately does not state them.",
  ],
  refresher_recommendation:
    "Every 12 months, and whenever the HACCP documents are reviewed or a new process is introduced.",
  practical_signoff_points: [
    "Observed completing a temperature record correctly and at the right time.",
    "Observed a delivery check including rejection criteria.",
    "Can describe corrective action for an out-of-range fridge.",
  ],
  manager_observation_notes: [
    "Are records completed contemporaneously?",
    "Does the staff member know where the site HACCP document is kept?",
  ],
};
