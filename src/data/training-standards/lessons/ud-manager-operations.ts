/**
 * Restaurant Operations for Managers.
 *
 * Manager and supervisor material — never included in staff induction packs.
 * Source document: UD Restaurant Operations Guide for Managers.
 */

import type { LessonContent } from "../lesson-types";

export const udManagerOperationsLesson: LessonContent = {
  module_title: "Restaurant Operations for Managers",
  version: "1.0",
  last_reviewed: "2026-09-17",
  confidence_level: "medium",

  sources: [
    {
      id: "ud-manager-ops",
      name: "UD Restaurant Operations Guide for Managers",
      type: "internal_standard",
      jurisdiction: "Managers and supervisors",
      relevance:
        "Daily operating rhythm for a duty manager: opening, pre-service briefing, running service, cash and closing, plus people and compliance duties.",
    },
    {
      id: "wtr-1998-mgr",
      name: "Working Time Regulations 1998",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/uksi/1998/1833/contents",
      relevance:
        "Rest break and working time duties the duty manager is responsible for delivering on the floor.",
    },
    {
      id: "licensing-act-2003",
      name: "Licensing Act 2003",
      type: "legal_requirement",
      jurisdiction: "England and Wales",
      url: "https://www.legislation.gov.uk/ukpga/2003/17/contents",
      relevance:
        "Alcohol may only be sold under the authority of a personal licence holder; premises licence conditions must be complied with at all times.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      staff_visible: false,
      paragraphs: [
        "This is the duty manager's operating rhythm: what you do before service, during service and at close, and what you are accountable for.",
        "Restricted to managers and supervisors.",
      ],
    },
    {
      heading: "Why this matters",
      type: "why_this_matters",
      staff_visible: false,
      paragraphs: [
        "On shift, you are the person the law, the guests and the team look to. Licensing conditions, break entitlements and food safety records are all your responsibility while you hold the keys.",
      ],
    },
    {
      heading: "Opening",
      type: "step_by_step",
      staff_visible: false,
      points: [
        {
          text: "Walk the building: check security, lighting, heating, plant and any overnight issues.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm fridge and freezer temperatures have been recorded and are in range.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Check the rota against who has actually arrived, and resolve gaps before service.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm prep status, items off, and specials with the kitchen.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Check the till, floats and card terminals are working.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm the room: cleanliness, temperature between 18 and 20°C, lighting, music and table setup.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Pre-service briefing",
      type: "step_by_step",
      staff_visible: false,
      points: [
        {
          text: "Cover bookings, expected covers, items off, specials and any known allergy bookings.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Allocate sections and confirm who is on breaks and when.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm who is authorised to sell alcohol on shift before service starts.",
          classification: "legal_requirement",
          source_id: "licensing-act-2003",
        },
        {
          text: "Name one thing to improve on from the previous service.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Running service",
      type: "expected_behaviours",
      staff_visible: false,
      points: [
        {
          text: "Hold the pass: nothing burnt, broken or badly presented leaves the kitchen.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Monitor ticket times and step in before guests have to ask about a delay.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Deliver breaks as rostered — at least 30 minutes for every 4 hours worked.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Adult workers must receive an uninterrupted rest break of at least 20 minutes on shifts longer than 6 hours.",
          classification: "legal_requirement",
          source_id: "wtr-1998-mgr",
        },
        {
          text: "Own complaints personally: listen, apologise, resolve, and record anything significant.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Enforce the floor standards — no phones, no leaning, no crowding at the bar.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Licensing and age verification",
      type: "key_rules",
      staff_visible: false,
      points: [
        {
          text: "Alcohol may only be sold under the authority of a personal licence holder, and premises licence conditions apply at all times.",
          classification: "legal_requirement",
          source_id: "licensing-act-2003",
        },
        {
          text: "Only staff with a recorded written authorisation from the DPS may sell alcohol. Check the authorisation list before allowing a sale.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Record refusals and any incident that a licence condition requires, within the time the condition specifies.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Cash and closing",
      type: "step_by_step",
      staff_visible: false,
      points: [
        {
          text: "Reconcile takings against the till report and investigate any difference before you leave.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm cash tips are pooled and shared according to company practice — never retained by an individual.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm the closing cleaning checklist and food safety records are complete and signed.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm all food is covered, labelled, dated and stored, and waste removed.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Secure the building: gas, electrics, doors, alarm.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Confirm every team member has clocked out correctly, and correct any error with a recorded reason.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "People and compliance duties",
      type: "key_rules",
      staff_visible: false,
      points: [
        {
          text: "New starters must not work unsupervised until their induction is complete and their right to work has been reviewed.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Record incidents, accidents and near misses in the incident book the same shift.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Never amend a submitted record. Add a dated amendment instead.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Keep certificates and licence documents current, and escalate anything expiring rather than letting it lapse.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Common mistakes",
      type: "common_mistakes",
      staff_visible: false,
      points: [
        {
          text: "Skipping the pre-service briefing when the shift looks quiet.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Letting breaks slip because service is busy.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Allowing an alcohol sale by someone not on the authorisation list.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "Signing off records at close without checking they were completed at the time.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
    {
      heading: "Learning outcomes",
      type: "learning_outcomes",
      staff_visible: false,
      points: [
        {
          text: "You can open, run and close a site to standard on your own.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "You know your licensing, break and record-keeping duties as duty manager.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
        {
          text: "You know what must never be altered after the fact, and how to correct it properly.",
          classification: "internal_standard",
          source_id: "ud-manager-ops",
        },
      ],
    },
  ],

  excluded_points: [
    "Cash handling limits, banking arrangements and safe codes — deliberately excluded from training content.",
    "Disciplinary and grievance steps — covered by the HR process, not this lesson.",
    "Sales targets and labour cost percentages — commercially specific and not stated in the source.",
  ],
  remaining_gaps: [
    "Site-specific opening and closing checklists should be attached to this lesson per branch.",
    "Escalation contact list, including the Operations Manager, needs confirming per site.",
  ],
  quiz_support_notes: [
    "Manager assessment only. Questions may cover the opening walk, briefing content, break duties, alcohol authorisation checks, closing reconciliation and record integrity.",
    "Do not ask about cash limits, safe procedures or commercial targets.",
  ],
  refresher_recommendation:
    "Annually, on promotion into a duty manager role, and after any licensing change.",
  practical_signoff_points: [
    "Completed a supervised opening and pre-service briefing.",
    "Ran a full service holding the pass.",
    "Completed a supervised close including reconciliation and record checks.",
  ],
  manager_observation_notes: [
    "Does the duty manager check the alcohol authorisation list before service?",
    "Are breaks delivered as rostered even under pressure?",
    "Are records checked, not just signed?",
  ],
};
