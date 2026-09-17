/**
 * Front of House Standards — source-backed lesson content.
 *
 * Source document: UD DOs and DON'Ts (Front of House Guidelines).
 * Break entitlement is cross-referenced to the Working Time Regulations 1998
 * only where the company standard is at least as generous as the law.
 */

import type { LessonContent } from "../lesson-types";

export const udFohStandardsLesson: LessonContent = {
  module_title: "Front of House Standards",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "high",

  sources: [
    {
      id: "ud-dos-donts",
      name: "UD DOs and DON'Ts — Front of House Guidelines",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance:
        "The company's own list of what front of house staff must and must not do on shift, covering hygiene, service, presentation, breaks, communication and conduct.",
    },
    {
      id: "wtr-1998",
      name: "Working Time Regulations 1998",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/uksi/1998/1833/contents",
      relevance:
        "Sets the legal minimum rest break entitlement for adult workers of an uninterrupted 20 minutes when working more than 6 hours. The company standard of 30 minutes for every 4 hours worked is more generous.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Front of house sets the tone for the whole visit. This lesson is the company's own DOs and DON'Ts, grouped so you can remember them.",
        "Read it before your first shift on the floor. Your manager will watch for these behaviours during your first weeks.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "Guests notice the small things: a clean table, a smile, being told about a delay before they have to ask.",
        "Several of these rules exist to keep people safe — handwashing, allergen checks and telling the kitchen about special requests. Getting those wrong can make somebody ill.",
      ],
    },
    {
      heading: "Do — guest care and service",
      type: "expected_behaviours",
      points: [
        {
          text: "Follow the service steps every time. Consistency is what makes the experience repeatable.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Always check and double-check allergens with the guest before the order goes to the kitchen.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Monitor waiting times and liaise with the kitchen. Tell guests immediately about any delay or mistake — never let them find out for themselves.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Offer markers to guests while they wait, especially when delays are expected.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Stay in the reception area to greet and assist guests as they arrive.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Check in with tables during the visit to see whether anything is needed.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Handle complaints professionally: listen, apologise, offer a solution, and escalate to a manager when needed.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Practise smiling often. A welcoming room is created deliberately, not by accident.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Do — hygiene, setup and the room",
      type: "step_by_step",
      points: [
        {
          text: "Clock in correctly and on time.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Wash your hands frequently to maintain hygiene standards.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Keep plenty of ramekins, homemade sauce bottles and sanitiser bottles filled and ready.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Restock the fridges frequently so items do not run out mid-service.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Check the dining area regularly — wipe tables and chairs and keep the room clean, charming and cosy.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Check and clean the toilets regularly so they are always presentable.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Keep the room between 18 and 20°C, and adjust playlist and lighting to match the mood.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Watch stock levels of essentials such as napkins and cutlery.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Water the plants once a week.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Complete all paperwork accurately and on time.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Do — looking after yourself and the team",
      type: "expected_behaviours",
      points: [
        {
          text: "Take at least a 30-minute break for every 4 hours worked.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Workers over 18 are legally entitled to an uninterrupted rest break of at least 20 minutes when a shift is longer than 6 hours. Our 30-minute standard meets and exceeds that.",
          classification: "legal_requirement",
          source_id: "wtr-1998",
        },
        {
          text: "Stay hydrated and drink plenty of water through the shift.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Eat a proper meal on your break — bring food from home or prepare it on site.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Take small 5-minute breaks between pushes, and use calming exercises before rush hours.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Brief colleagues about your section and any updates, and communicate with the kitchen about special requests and dietary restrictions.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Help colleagues in other sections when needed to keep the workflow smooth.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Speak up if something does not look right or feels off.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Rest well before your next shift so you arrive refreshed.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Do not",
      type: "common_mistakes",
      points: [
        {
          text: "Do not clock in or out from outside the bar area.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not wear oversized clothing, hoodies, or clothing with politically motivated messages.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not eat at the bar. Use your breaks and the designated areas.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not cross your arms, lean against the bar or lean on the counter, and do not stand on one foot.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not argue with guests or colleagues. Handle issues calmly and professionally.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not serve burnt or poorly presented dishes.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not let dirty plates build up upstairs — clear them promptly.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not have more than two people in the bar area at once.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not use your phone during your shift.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not keep cash tips — they are shared amongst the team.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not leave personal belongings in work areas. Store them in the designated area.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not leave guests waiting or skip checking on tables.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Do not leave the floor without telling the manager.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Real service scenarios",
      type: "scenarios",
      points: [
        {
          text: "The kitchen is 15 minutes behind on a platter. You tell the table straight away, offer markers, and check back — you do not wait for them to ask.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "A guest says a dish arrived burnt. You apologise, remove it, tell the kitchen it must be redone, and let a manager know.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Your phone buzzes during service. It stays in your bag in the designated area until your break.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Manager observation points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Watch for leaning, phone use and bar crowding in the first two weeks — these are the habits that slip first.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "Confirm the allergen double-check is happening verbally with the guest, not assumed from the ticket.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can list the DOs and DON'Ts that apply to your section without prompting.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "You know how to handle a delay, a complaint and a poorly presented dish.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
        {
          text: "You know your break entitlement and how to take it properly.",
          classification: "internal_standard",
          source_id: "ud-dos-donts",
        },
      ],
    },
  ],

  excluded_points: [
    "Tip distribution amounts and methods — the source states only that cash tips are shared amongst the team.",
    "Specific uniform supplier or garment detail — not stated in the source document.",
  ],
  remaining_gaps: [
    "Age verification and refusals procedure is not covered by this document and needs its own lesson.",
    "Site-specific opening and closing checklists are not included.",
  ],
  quiz_support_notes: [
    "Questions must come from the DOs and DON'Ts list or the stated break entitlement only.",
    "Do not ask about tip amounts, pay or disciplinary process.",
  ],
  refresher_recommendation: "Annually, or immediately after any service standards briefing.",
  practical_signoff_points: [
    "Observed greeting and seating a guest.",
    "Observed taking and confirming an allergy order.",
    "Observed clearing and resetting a table to standard.",
  ],
  manager_observation_notes: [
    "Is the guest told about delays before they ask?",
    "Are tables and toilets being checked without being told?",
  ],
};
