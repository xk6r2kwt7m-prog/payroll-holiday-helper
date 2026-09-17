/**
 * Quality Control in Food Preparation and Stock Management.
 *
 * Manager and supervisor material — not part of the staff induction packs.
 * Source document: "Implementing Quality Control in Food Preparation and
 * Stock Management".
 */

import type { LessonContent } from "../lesson-types";

export const udQualityControlLesson: LessonContent = {
  module_title: "Quality Control and Stock Management",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "medium",

  sources: [
    {
      id: "ud-quality-control",
      name: "Implementing Quality Control in Food Preparation and Stock Management",
      type: "internal_standard",
      jurisdiction: "Managers and supervisors",
      relevance:
        "Company approach to consistency checks, portion control, stock rotation, waste analysis and corrective action.",
    },
    {
      id: "fsa-safer-food-3",
      name: "Food Standards Agency — Safer Food, Better Business",
      type: "official_guidance",
      jurisdiction: "United Kingdom",
      url: "https://www.food.gov.uk/business-guidance/safer-food-better-business-for-caterers",
      relevance:
        "Guidance on stock rotation, date labelling and the management checks that support a food safety management system.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Quality control is the manager's job: making sure the standard holds when nobody is watching.",
        "This lesson is restricted to managers and supervisors. It covers consistency checks, portion discipline, stock rotation, waste analysis and how to act on what you find.",
      ],
      staff_visible: false,
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      paragraphs: [
        "Quality drift is gradual. Portions creep, garnishes get dropped, dates get guessed — and margin and reputation go with them.",
        "Waste and stock variance are the earliest measurable signals that a process has slipped.",
      ],
      staff_visible: false,
    },
    {
      heading: "Consistency checks",
      type: "key_rules",
      staff_visible: false,
      points: [
        {
          text: "Check dishes against the specification at the pass during each service, not only at the start of the day.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Check portion weights and counts on a sample basis and record what you found.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Taste-check sauces and prepared items daily before service.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Reject and remake anything that does not meet the specification, and record the reason as waste.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
    {
      heading: "Stock management",
      type: "step_by_step",
      staff_visible: false,
      points: [
        {
          text: "Operate first in, first out on every item, checked visually during each shift.",
          classification: "official_guidance",
          source_id: "fsa-safer-food-3",
        },
        {
          text: "Confirm every prepared item is covered, labelled and dated with a use-by that matches the specification.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Count key lines at agreed intervals and reconcile against usage and sales.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Investigate variance rather than adjusting the count to match.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
    {
      heading: "Waste analysis",
      type: "step_by_step",
      staff_visible: false,
      points: [
        {
          text: "Record every instance of waste with quantity, item and reason at the time it occurs.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Review waste by reason weekly and identify the top recurring cause.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Agree one corrective action per recurring cause, with a named owner and a review date.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Close the loop: confirm at the next review whether the action worked.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
    {
      heading: "Corrective action and records",
      type: "key_rules",
      staff_visible: false,
      points: [
        {
          text: "Any quality or safety failure gets a recorded corrective action — verbal fixes are not evidence.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Where a failure has a food safety dimension, log it against the site compliance record as well as the quality review.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Never alter a historical record. Add a dated correction alongside it.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
    {
      heading: "Manager observation points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are portion checks actually being sampled, or assumed?",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Is waste recorded at the moment it happens, by the person who caused it?",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "Does each recurring waste reason have an owner and a review date?",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      staff_visible: false,
      points: [
        {
          text: "You can run a consistency and portion check and record the result.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "You can reconcile stock and investigate variance without adjusting the count.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
        {
          text: "You can turn a waste review into a specific corrective action with an owner.",
          classification: "internal_standard",
          source_id: "ud-quality-control",
        },
      ],
    },
  ],

  excluded_points: [
    "Target waste percentages, gross margin figures and supplier pricing — commercially specific and not stated in the source document.",
    "Individual performance management steps — these belong to the HR process, not this lesson.",
  ],
  remaining_gaps: [
    "Agreed stock count frequency per site is not stated and needs confirming.",
    "The portion specification sheet referenced by these checks should be filed alongside this lesson.",
  ],
  quiz_support_notes: [
    "Manager assessment only. Questions may cover consistency checks, FIFO, variance investigation, waste review cadence and corrective action recording.",
    "Do not ask for numeric waste or margin targets.",
  ],
  refresher_recommendation: "Annually for managers and supervisors, or on promotion into the role.",
  practical_signoff_points: [
    "Completed a recorded portion and consistency check.",
    "Completed a stock count and documented a variance investigation.",
    "Produced one waste corrective action with an owner and review date.",
  ],
  manager_observation_notes: [
    "Is the weekly waste review happening, with evidence?",
    "Are corrective actions closed out rather than left open?",
  ],
};
