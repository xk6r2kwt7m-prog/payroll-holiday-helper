/**
 * Kitchen Standards — source-backed lesson content.
 *
 * Source document: UD Kitchen Guide Book.
 * Cooking, plating, station discipline and closing standards.
 */

import type { LessonContent } from "../lesson-types";

export const udKitchenStandardsLesson: LessonContent = {
  module_title: "Kitchen Standards",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "high",

  sources: [
    {
      id: "ud-kitchen-guide",
      name: "UD Kitchen Guide Book",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance:
        "Kitchen setup, station discipline, cooking and plating standards, waste control, communication with front of house and end-of-shift close-down.",
    },
    {
      id: "fsa-safer-food",
      name: "Food Standards Agency — Safer Food, Better Business for caterers",
      type: "official_guidance",
      jurisdiction: "United Kingdom",
      url: "https://www.food.gov.uk/business-guidance/safer-food-better-business-for-caterers",
      relevance:
        "FSA guidance underpinning the 4Cs — cleaning, cooking, chilling and avoiding cross-contamination — and the daily records a kitchen is expected to keep.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Our kitchen is small, fast and visible. Order and cleanliness are what make speed possible.",
        "This lesson covers how to set up your station, how dishes must leave the pass, and how to close down properly.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "A dish that leaves the pass badly presented cannot be un-served. Checking takes seconds; a remake costs a table.",
        "Food safety records and cleaning are not paperwork for its own sake — they are the evidence an inspector asks for.",
      ],
    },
    {
      heading: "Setting up your station",
      type: "step_by_step",
      points: [
        {
          text: "Arrive changed into clean kitchen clothing, apron on and hairnet on before entering the kitchen.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Wash your hands at the designated handwash sink before handling any food.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Check fridge and freezer temperatures and record them before service begins.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Check your mise en place: sauces, garnishes, portioned dumplings and sides ready in the correct containers.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Confirm the day's specials, any items off, and any prep shortfalls with the person in charge.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
    {
      heading: "Cooking and plating standards",
      type: "key_rules",
      points: [
        {
          text: "Cook to the stated times and methods for each dumpling type — do not shorten times to catch up.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Portion counts must be exact: 3 for a normal portion, 4 for specials and desserts, 8 across 4 flavours for a platter, 6 for the dessert platter.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Nothing burnt, broken, leaking or badly presented leaves the pass. Remake it.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Wipe plate rims and place garnishes and sauces in the same position every time.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Send the whole table together. Hold and coordinate rather than sending dishes as they finish.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
    {
      heading: "Allergen orders in the kitchen",
      type: "key_rules",
      points: [
        {
          text: "Confirm out loud when you have seen an allergy-marked ticket, so front of house knows it has landed.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Use clean utensils, clean surfaces and clean cookware for allergen orders, and wash hands before starting.",
          classification: "official_guidance",
          source_id: "fsa-safer-food",
        },
        {
          text: "Prepare the allergen-free dish first where the order allows.",
          classification: "official_guidance",
          source_id: "fsa-safer-food",
        },
      ],
    },
    {
      heading: "Cross-contamination and chilling",
      type: "key_rules",
      points: [
        {
          text: "Keep raw and ready-to-eat foods separated at all times — separate boards, separate storage, separate handling.",
          classification: "official_guidance",
          source_id: "fsa-safer-food",
        },
        {
          text: "Cover, label and date everything that goes into the fridge.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Cool hot food quickly before refrigerating, and never return food to the fridge uncovered.",
          classification: "official_guidance",
          source_id: "fsa-safer-food",
        },
      ],
    },
    {
      heading: "Waste and stock",
      type: "expected_behaviours",
      points: [
        {
          text: "Rotate stock first in, first out. Use the oldest dated item first.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Record waste when it happens, with the reason — it is how we find and fix the cause.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Report low stock to the person in charge during the shift, not at the end of it.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
    {
      heading: "Closing down",
      type: "step_by_step",
      points: [
        {
          text: "Break down and clean your station: surfaces, equipment, boards and utensils.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Cover, label, date and store all usable food correctly; discard anything out of date.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Complete the closing cleaning checklist and temperature records before you clock out.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Take out waste and recycling, and leave floors and sinks clean.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Report anything broken or unsafe before leaving — never leave it for the next shift to find.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
    {
      heading: "Common mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Sending a dish without checking the plate rim and garnish position.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Leaving food uncovered, unlabelled or undated in the fridge.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Filling in temperature records at the end of the day from memory.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "Nodding at an allergy ticket instead of confirming it out loud.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can set up and close down a station to standard without supervision.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "You know the portion counts and the presentation standard for every dish type.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
        {
          text: "You know how to handle an allergen order safely in the kitchen.",
          classification: "internal_standard",
          source_id: "ud-kitchen-guide",
        },
      ],
    },
  ],

  excluded_points: [
    "Exact cooking times and core temperatures per dish — these are held on the site cooking specification and must not be memorised from a training page.",
    "Supplier names and delivery schedules — not part of this lesson.",
  ],
  remaining_gaps: [
    "Site-specific cooking specification sheets need to be filed against this lesson.",
    "Site-specific cleaning schedules and chemical dilution charts are held separately.",
  ],
  quiz_support_notes: [
    "Questions may cover setup, portion counts, presentation standards, cross-contamination, waste rotation and close-down only.",
    "Do not ask for numeric cooking times or core temperatures — they are not stated in this lesson.",
  ],
  refresher_recommendation: "Every 12 months, or after any change to the menu or kitchen layout.",
  practical_signoff_points: [
    "Observed setting up a station and recording fridge temperatures.",
    "Observed plating a platter to standard.",
    "Observed a full close-down including checklists.",
  ],
  manager_observation_notes: [
    "Are temperature records completed at the time, or backfilled?",
    "Is food covered, labelled and dated without being told?",
  ],
};
