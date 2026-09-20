/**
 * Table Service Steps — source-backed lesson content.
 *
 * Source: management-supplied Ugly Dumpling Table Service Steps.
 * These are internal service standards, not legal requirements.
 */
import type { LessonContent } from "../lesson-types";

const SOURCE_ID = "ud-table-service-steps";

export const udTableServiceStepsLesson: LessonContent = {
  module_title: "Table Service Steps",
  version: "1.0",
  last_reviewed: "2026-09-20",
  confidence_level: "high",

  sources: [
    {
      id: SOURCE_ID,
      name: "Ugly Dumpling Table Service Steps — management-approved source notes",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance:
        "The eight-stage table-service sequence for welcoming guests, taking orders, checking tables, serving food and closing the visit.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Good table service is warm, clear and consistent from the moment a guest arrives until they leave.",
        "Follow these eight steps in order while adapting naturally to the needs of each table.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "A clear service sequence helps guests feel welcome, keeps the team informed and reduces missed details.",
        "Allergy and dietary information needs particular care. Never guess: check with the manager or kitchen team whenever confirmation is needed.",
      ],
    },
    {
      heading: "1. Warm welcome",
      type: "step_by_step",
      points: [
        {
          text: "Greet every guest promptly with a warm, friendly smile and natural eye contact so they feel welcome as soon as they enter.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Ask whether they have a reservation or are visiting as a walk-in.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "2. Reservations and walk-ins",
      type: "step_by_step",
      points: [
        {
          text: "For a reservation, show the guests to their table and explain that they can scan the QR code to view the menu.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Explain that allergen information is available online and ask guests to tell you about any allergies.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "For a walk-in, explain whether a table is available and give an estimated waiting time when necessary.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "3. Taking the order",
      type: "step_by_step",
      points: [
        {
          text: "Tell the guests that you will return shortly to take their order.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "When you return, ask whether they need any help or are ready to order.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Before taking the order, ask about allergies. Check with the manager or kitchen team whenever confirmation is needed; never guess.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Help the guests place their order and suggest a side dish if they have not selected one.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Repeat the complete order back to the guests to confirm it is correct.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Let the guests know that their food should arrive in approximately 15 minutes.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "4. Homemade sauces and chopsticks",
      type: "step_by_step",
      points: [
        {
          text: "Immediately after taking the order, bring the appropriate homemade chilli sauce, soy sauce and chopsticks to the table.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Make sure guests receive the correct sauce option for any stated dietary requirement. Check with the manager or kitchen team if you are unsure.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "5. Check-ins",
      type: "step_by_step",
      points: [
        {
          text: "After 10 to 15 minutes, check whether the food is on its way from the kitchen.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "If there is a delay, tell the guests that their meal is being prepared and will arrive shortly.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Check the table four times during the visit to see whether the guests need anything.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "6. Food delivery and explanation",
      type: "step_by_step",
      points: [
        {
          text: "Bring the food to the table and explain each dish as you place it down.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Pay particular attention to stated allergies and special dietary requirements, and make sure the correct dish reaches the correct guest.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Wish the guests ‘bon appétit’ once the dishes have been served.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "7. Suggestions",
      type: "step_by_step",
      points: [
        {
          text: "When the guests have finished, clear the dirty plates promptly.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "If they have not tried the dumplings, ask whether they would like to order some.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "If they do not want more savoury food, offer dessert, such as pecan pie, and ask whether they would like another drink.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "When necessary, politely explain how long the table is available for.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "8. Bill and feedback",
      type: "step_by_step",
      points: [
        {
          text: "Bring the bill when requested. Before taking payment, politely invite the guests to scan the QR code on the bill and review their experience.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Thank the guests for visiting, say that it was a pleasure to serve them, and wish them a good afternoon or evening.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "Common mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Do not assume that a guest has no allergies because they have not mentioned one; ask before taking the order.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Do not guess about an allergen, ingredient or dietary requirement. Check with the manager or kitchen team.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Do not leave guests to discover a kitchen delay for themselves; update them promptly.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Do not clear the table and forget to offer dessert, another drink or the bill.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "Real service scenarios",
      type: "scenarios",
      points: [
        {
          text: "A guest asks whether a sauce is suitable for their allergy. Tell them you will check, then confirm with the manager or kitchen team before serving it.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "The food has not left the kitchen after 15 minutes. Check its progress and update the table before the guests need to ask.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "A later reservation needs the table. Explain the remaining time politely and early enough that the guests do not feel rushed at the last moment.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "Manager observation points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Observe whether the team member follows all eight stages naturally rather than treating them as a script.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Confirm that allergy questions are asked and uncertainty is escalated instead of guessed.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "Check that delays are communicated promptly and the table receives regular attention.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can follow the eight table-service stages in the correct order.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "You know when and how to ask about allergies and when to seek confirmation.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
        {
          text: "You can keep guests informed, check their table and close the visit warmly.",
          classification: "internal_standard",
          source_id: SOURCE_ID,
        },
      ],
    },
  ],

  excluded_points: [
    "Exact allergen content of sauces and dishes — use the current approved allergen information rather than this service lesson.",
    "Reservation-system procedures and site-specific table-turn rules — these were not included in the source notes.",
  ],
  remaining_gaps: [
    "Confirm whether sauce choices or table-availability wording differ by site before adding site-specific instructions.",
  ],
  quiz_support_notes: [
    "Questions may cover the eight-stage sequence, allergy escalation, stated timing and guest check-ins.",
    "Do not test specific dish allergens or ingredients from this lesson.",
  ],
  refresher_recommendation:
    "Review during induction and whenever the approved table-service process changes.",
  practical_signoff_points: [
    "Welcomed and seated a guest using the agreed sequence.",
    "Asked about allergies and escalated an uncertainty correctly.",
    "Completed the table-service sequence through bill and farewell.",
  ],
  manager_observation_notes: [
    "Does the team member communicate naturally while completing every required stage?",
    "Do they check allergy information rather than guessing?",
    "Do they keep guests informed about delays and table availability?",
  ],
};
