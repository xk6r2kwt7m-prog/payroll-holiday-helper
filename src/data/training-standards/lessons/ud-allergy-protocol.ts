/**
 * Allergy Protocol — source-backed lesson content.
 *
 * Source document: Allergy Protocol Training Presentation (Ugly Dumpling).
 * Legal context is drawn from the Food Information Regulations and the
 * Food Information (Amendment) England Regulations 2019 ("Natasha's Law").
 */

import type { LessonContent } from "../lesson-types";

export const udAllergyProtocolLesson: LessonContent = {
  module_title: "Allergy Protocol — Ugly Dumpling",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "high",

  sources: [
    {
      id: "ud-allergy-deck",
      name: "Allergy Protocol Training — Ugly Dumpling",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance:
        "The company's seven-step allergy protocol: acknowledging, communicating, kitchen procedure, pre-service checks, serving, common mistakes and emergency response.",
    },
    {
      id: "fir-2014",
      name: "Food Information Regulations 2014",
      type: "legal_requirement",
      jurisdiction: "United Kingdom",
      url: "https://www.legislation.gov.uk/uksi/2014/1855/contents",
      relevance:
        "Requires food businesses to provide accurate allergen information for the 14 regulated allergens on non-prepacked food sold to consumers.",
    },
    {
      id: "fsa-allergen-guidance",
      name: "Food Standards Agency — Allergen guidance for food businesses",
      type: "official_guidance",
      jurisdiction: "United Kingdom",
      url: "https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses",
      relevance:
        "FSA guidance on handling allergen requests, avoiding cross-contamination and communicating allergen information accurately to customers.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "An allergy order is not a preference. Getting it wrong can put somebody in hospital.",
        "This lesson is our seven-step protocol, from the moment a guest mentions an allergy to what you do if somebody reacts.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "We are legally required to give accurate allergen information for the 14 regulated allergens. Guessing is never acceptable.",
        "Most allergy incidents in hospitality are not caused by the recipe. They are caused by a ticket that was not marked, or a message that was not passed on.",
      ],
      points: [
        {
          text: "Food businesses must provide accurate allergen information for the 14 regulated allergens on non-prepacked food.",
          classification: "legal_requirement",
          source_id: "fir-2014",
        },
      ],
    },
    {
      heading: "Step 1 — Acknowledge the allergy",
      type: "step_by_step",
      points: [
        {
          text: "Listen carefully and give the guest your full attention the moment an allergy is mentioned.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Ask for details. Clarify exactly which allergens they need to avoid — do not assume from the dish they picked.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Step 2 — Communicate it",
      type: "step_by_step",
      points: [
        {
          text: "Notify all relevant staff immediately, including the kitchen. Say it out loud — do not rely on the ticket alone.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Mark the order: draw a bright-coloured cross on the ticket to flag the allergy.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Use a bright colour — pink is preferred — so the mark cannot be missed on a busy pass.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Step 3 — In the kitchen",
      type: "step_by_step",
      points: [
        {
          text: "Double-check that the kitchen team has seen and understood the allergy before cooking starts.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Prevent cross-contamination: clean utensils, clean surfaces, clean cookware, and wash hands often.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Handle the allergen-free order before regular orders wherever possible, so there is nothing to transfer.",
          classification: "internal_standard",
          source_id: "fsa-allergen-guidance",
        },
      ],
    },
    {
      heading: "Step 4 — Before serving",
      type: "step_by_step",
      points: [
        {
          text: "Check the dish yourself before it leaves the pass and confirm no allergens are present.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Verify with the kitchen a second time that the dish is allergen-free.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Step 5 — Serving the guest",
      type: "step_by_step",
      points: [
        {
          text: "State clearly which dish is the allergen-free one as you place it down.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Never assume. If you are unsure about anything, stop and verify before serving.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Common mistakes to avoid",
      type: "common_mistakes",
      points: [
        {
          text: "No note, or the wrong note. Never forget to mark the allergy correctly on the ticket.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Miscommunication between front of house and the kitchen.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Serving the wrong dish. Double-check before it reaches the table.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Emergency response",
      type: "emergency_response",
      points: [
        {
          text: "If a guest reacts: stay calm, inform management immediately, and call emergency services if needed.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Assist the guest and follow any instructions they give you, such as helping them use their own adrenaline auto-injector.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Record the incident in the incident book the same shift — it is a reportable event, not a complaint.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Key reminders",
      type: "key_rules",
      points: [
        {
          text: "Always double-check when dealing with allergies.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Communication is crucial — everyone on shift must know about the allergy.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "Safety first. When in doubt, ask before proceeding.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can run the seven steps in order, from acknowledging an allergy to serving the dish.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "You know how an allergy order is marked and who must be told.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
        {
          text: "You know exactly what to do if a guest has a reaction.",
          classification: "internal_standard",
          source_id: "ud-allergy-deck",
        },
      ],
    },
  ],

  excluded_points: [
    "A dish-by-dish allergen matrix — not part of this source document; use the current allergen matrix held on site.",
    "Any claim that a dish is guaranteed free from traces — we do not have separate preparation areas for every allergen.",
  ],
  remaining_gaps: [
    "The written allergen matrix for each menu item needs to be filed alongside this lesson.",
    "Site-specific location of the first-aid kit and whether any staff hold first-aid certification is not recorded here.",
  ],
  quiz_support_notes: [
    "Questions may cover the seven steps, ticket marking, cross-contamination control and emergency response only.",
    "Do not ask staff to state which allergens are in specific dishes — that comes from the on-site allergen matrix.",
  ],
  refresher_recommendation:
    "Every 12 months, and immediately after any allergy near-miss or menu change.",
  practical_signoff_points: [
    "Observed taking an allergy order and marking the ticket correctly.",
    "Observed verbally confirming the order with the kitchen.",
    "Can describe the emergency steps unprompted.",
  ],
  manager_observation_notes: [
    "Is the bright cross being used consistently on every allergy ticket?",
    "Is the kitchen confirming back, rather than nodding?",
  ],
};
