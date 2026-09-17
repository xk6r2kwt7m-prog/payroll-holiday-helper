/**
 * Welcome to Ugly Dumpling — source-backed lesson content.
 *
 * Source document: Ugly Dumpling Guide Book (new members).
 * Company standards are classified as internal_standard; nothing here is
 * presented as law.
 */

import type { LessonContent } from "../lesson-types";

export const udWelcomeLesson: LessonContent = {
  module_title: "Welcome to Ugly Dumpling",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "high",

  sources: [
    {
      id: "ud-guide-book",
      name: "Ugly Dumpling Guide Book — A guide for Ugly Dumpling's new members",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance:
        "Company welcome, vision, core values, menu structure, how new starters are expected to work and how to begin a shift.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Ugly Dumpling combines Western ingredients with Asian home recipes, taking the humble dumpling from an Asian street snack to an easy dining experience.",
        "Our vision is to create the world's finest ingredient-led dumplings. Every person on the team plays a part in that — in the kitchen, on the floor and behind the scenes.",
        "This first lesson covers who we are, what we expect from you, and the menu you will be talking about from your first shift.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "Guests judge us on consistency. The same dish, the same welcome, the same standards, every visit.",
        "Knowing the menu and the values behind it means you can answer questions confidently instead of guessing — and guessing is how allergy and quality mistakes happen.",
      ],
    },
    {
      heading: "Our core values",
      type: "key_rules",
      points: [
        {
          text: "Creativity, inclusivity and a passion for quality sit behind every decision we make.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Teamwork is at the heart of everything — we work together to deliver memorable dining experiences.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "We hold the highest standards of service so that every guest leaves with a smile.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
    {
      heading: "How you can impress us",
      type: "expected_behaviours",
      points: [
        {
          text: "Work efficiently: speed without compromising quality, especially when we are busy. Manage your time and stay in sync with the rest of the team.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Attention to detail: double-check orders and make sure every dish is presented properly before it leaves the pass.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Be active: anticipate what is needed, step in to help others, and stay ready to assist wherever you are needed.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Be sharp: prioritise tasks, think ahead and solve problems on the go rather than waiting to be told.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
    {
      heading: "Menu knowledge",
      type: "key_rules",
      paragraphs: [
        "You need to know these by heart. Guests ask about them constantly.",
      ],
      points: [
        {
          text: "Meal deal: 5 dumplings with a choice of noodles or cucumber salad. Monday to Friday, from opening until 5pm, excluding bank holidays.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "GMZ meal deal: 3 dumplings with a small (half) portion of noodles.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Normal portion: 3 dumplings of one flavour — pork, duck, chicken, prawn, cheeseburger, mushroom, halloumi, paneer, spinach or Sichuan vegan pork.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Specials and desserts: 4 dumplings of one flavour — lamb, beef Korean bulgogi or varenyky.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Platters: 8 dumplings across 4 flavours. The dessert platter is the exception at 6 pieces.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Sides: tempura aubergine, cucumber salad, noodles and laksa soup.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
    {
      heading: "Platters at a glance",
      type: "step_by_step",
      points: [
        {
          text: "Classic: 2 pork, 2 duck, 2 chicken, 2 prawn.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Meat: 2 pork, 2 duck, 2 chicken, 2 cheeseburger.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Vegetarian: 2 mushroom, 2 halloumi, 2 paneer, 2 spinach.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Vegan: 4 spinach, 4 Sichuan vegan pork.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "New favourite: 2 cheeseburger, 2 mushroom, 2 halloumi, 2 paneer.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Dessert: 2 Nutella, 2 apple pie, 2 pecan pie.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
    {
      heading: "Starting your shift",
      type: "step_by_step",
      points: [
        {
          text: "Change into clean, comfortable clothing suitable for work before you clock in.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Put on your apron, and a hairnet if you are working in the kitchen.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Clock in on the rota app to officially start your shift.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Wash your hands with soap at the designated handwash sink.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "Introduce yourself to the team on shift and confirm you are ready to take on your tasks.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "You can explain what Ugly Dumpling is and what our vision is.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "You can describe the meal deal, portions, platters and sides without checking a menu.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
        {
          text: "You can start a shift correctly, in the right order, without being prompted.",
          classification: "internal_standard",
          source_id: "ud-guide-book",
        },
      ],
    },
  ],

  excluded_points: [
    "Pay, holiday and break entitlements — these come from your contract and the company handbook, not from this lesson.",
  ],
  remaining_gaps: [
    "Site-specific opening times and bank-holiday exceptions are not listed here; confirm with your manager for your site.",
  ],
  quiz_support_notes: [
    "Questions may cover menu structure, platter contents, core values and the shift-start sequence only.",
    "Do not ask about pay, holiday, or anything not stated in the Guide Book.",
  ],
  refresher_recommendation:
    "Revisit whenever the menu changes; otherwise on the first anniversary of joining.",
  practical_signoff_points: [
    "Described the menu to a manager without notes.",
    "Started a shift correctly and unprompted.",
  ],
  manager_observation_notes: [
    "Does the new starter know platter contents when a guest asks?",
    "Do they clock in and wash hands before touching anything?",
  ],
};
