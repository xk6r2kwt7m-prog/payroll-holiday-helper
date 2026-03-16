/**
 * Incident Reporting and Escalation — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const incidentReportingLesson: LessonContent = {
  module_title: "Incident Reporting and Escalation",
  version: "1.0",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  sources: [
    {
      id: "riddor-2013",
      name: "Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013 (RIDDOR)",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/uksi/2013/1471/contents",
      relevance: "Legal requirement to report specified workplace accidents, occupational diseases, and dangerous occurrences to HSE. Sets reporting timelines and thresholds.",
    },
    {
      id: "hse-riddor-when",
      name: "HSE — When Do I Need to Report an Incident?",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/riddor/when-do-i-report.htm",
      relevance: "HSE guidance explaining RIDDOR reporting timelines: immediate notification for deaths, specified injuries, non-fatal accidents to non-workers requiring hospital treatment, and dangerous occurrences. 15-day deadline for over-7-day incapacitation injuries.",
    },
    {
      id: "hse-riddor-types",
      name: "HSE — Types of Reportable Incidents",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/riddor/reportable-incidents.htm",
      relevance: "HSE guidance listing what is reportable under RIDDOR including specified injuries, occupational diseases, and dangerous occurrences.",
    },
    {
      id: "hswa-1974",
      name: "Health and Safety at Work etc. Act 1974",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/ukpga/1974/37/contents",
      relevance: "General duty on employers to ensure health, safety, and welfare. Recording and investigating incidents is part of this duty.",
    },
    {
      id: "internal-incident",
      name: "UGLŌ Internal Incident Reporting Procedures",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific incident forms, near-miss reporting culture, escalation thresholds, and internal investigation process.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Incident reporting is both a legal requirement and an essential part of keeping the workplace safe. Every accident, injury, near-miss, and dangerous occurrence must be recorded so that patterns can be identified and prevented.",
        "This module covers when and how to report incidents, the RIDDOR legal requirements, and our company's internal reporting and escalation procedures.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "Under RIDDOR 2013, employers must report specified workplace incidents to the enforcing authority (HSE). Failure to report is a criminal offence.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Recording all incidents (including near-misses) helps identify patterns and prevent future accidents. This is part of the employer's general duty under the Health and Safety at Work Act 1974.",
          classification: "legal_requirement",
          source_id: "hswa-1974",
        },
        {
          text: "Under-reporting of incidents prevents learning and creates legal exposure if a serious incident later occurs that could have been predicted from earlier events.",
          classification: "official_guidance",
          source_id: "hse-riddor-types",
        },
      ],
    },
    {
      heading: "Key Rules: What Must Be Reported Under RIDDOR",
      type: "key_rules",
      points: [
        {
          text: "Deaths: any death arising from a work-related accident must be reported to HSE immediately (without delay).",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Specified injuries to workers include: fractures (other than fingers, thumbs, and toes), amputations, any injury likely to lead to permanent loss of sight, crush injuries, burns or scalds requiring hospital treatment, loss of consciousness, and any injury requiring resuscitation or admittance to hospital for more than 24 hours.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Over-7-day incapacitation: if a worker is incapacitated for more than 7 consecutive days (not counting the day of the accident) as a result of a work-related accident, a RIDDOR report must be submitted within 15 days of the incident.",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
        {
          text: "Non-worker injuries: accidents involving members of the public or customers that result in them being taken directly to hospital for treatment must be reported.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Dangerous occurrences: certain 'near-miss' events that could have resulted in a reportable injury must be reported, even if no one was actually injured.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "A RIDDOR report must be received by HSE within 10 days of the incident for deaths, specified injuries, non-worker hospital treatment, and dangerous occurrences. Over-7-day incapacitation must be reported within 15 days.",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
      ],
    },
    {
      heading: "Key Rules: Internal Reporting",
      type: "key_rules",
      points: [
        {
          text: "All incidents — including near-misses — must be reported internally regardless of whether they meet the RIDDOR threshold. Our company requires this to build a complete safety picture.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Incidents involving a customer injury or a staff injury requiring first aid must be escalated to the manager on duty immediately.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "All internal incident reports must record: date and time, location, people involved, what happened, what action was taken, and who was informed.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
      ],
    },
    {
      heading: "Step-by-Step: Reporting an Incident",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Make the area safe: if someone is injured, ensure the immediate area is safe for you and others before providing assistance.",
          classification: "official_guidance",
          source_id: "hse-riddor-types",
        },
        {
          text: "Step 2 — Provide first aid if trained to do so, or call for a trained first aider. Call 999 if the injury is serious.",
          classification: "official_guidance",
          source_id: "hse-riddor-types",
        },
        {
          text: "Step 3 — Inform your manager immediately. If a customer is injured or the incident is serious, the manager must assess whether RIDDOR reporting is required.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Step 4 — Complete an incident report: record the date, time, location, people involved, what happened, and what action was taken. Do this as soon as possible while details are fresh.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Step 5 — For RIDDOR-reportable incidents, the responsible person must report online via the HSE RIDDOR reporting system or by phone (0345 300 9923 for fatal/specified injuries only).",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
      ],
    },
    {
      heading: "Near-Miss Reporting",
      type: "key_rules",
      points: [
        {
          text: "A near-miss is an event that could have caused injury but did not. Examples: a knife falling from a shelf, a pan of hot oil nearly spilling, or a trip hazard narrowly avoided.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Our company requires near-misses to be reported internally. The purpose is to identify hazards before someone gets hurt. Near-miss reporting is a positive safety behaviour, not a failure.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Some near-misses may meet the definition of a 'dangerous occurrence' under RIDDOR and require formal reporting to HSE. The manager must assess this.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Not reporting near-misses because 'nothing actually happened.' Near-misses are warning signs — today's near-miss is tomorrow's injury.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Incomplete incident records that miss key details — this makes investigation and pattern analysis difficult and creates legal risk.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Not knowing the RIDDOR threshold — for example, not realising that a customer taken to hospital for treatment requires a RIDDOR report.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Delaying the report. RIDDOR requires reports within 10 days (15 days for over-7-day incapacitation). Internal reports should be completed the same day.",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A customer slips on a wet floor and injures their wrist. They are taken to hospital by ambulance. This is a RIDDOR-reportable incident (non-worker taken to hospital for treatment). The manager must report online within 10 days. An internal incident report must also be completed immediately.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Scenario 2: A knife falls from a shelf in the kitchen but nobody is hit. This is a near-miss. It must be reported internally. The manager should assess whether it qualifies as a dangerous occurrence under RIDDOR (in most cases, a falling knife would not meet the RIDDOR threshold, but the internal report helps identify the hazard).",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Scenario 3: A team member burns their hand on a hot pan. They receive on-site first aid and continue their shift after treatment. This does not meet the RIDDOR threshold unless the injury results in over 7 days of incapacitation. It must still be recorded internally.",
          classification: "official_guidance",
          source_id: "hse-riddor-when",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Report all incidents and near-misses, no matter how minor they seem.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Record the time, location, people involved, and what happened — while details are fresh.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Escalate immediately if someone is injured or a customer is involved.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Treat near-miss reporting as a positive contribution to safety, not a blame exercise.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are staff reporting near-misses regularly? An absence of near-miss reports may indicate under-reporting, not a safe workplace.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Are incident forms being completed fully with all required details?",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Is there a recurring pattern of incidents in any area? Use incident data to identify and fix systemic hazards.",
          classification: "official_guidance",
          source_id: "hse-riddor-types",
        },
        {
          text: "Are RIDDOR-reportable incidents being identified and reported within the legal timelines?",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Distinguish between incidents that require immediate RIDDOR reporting and those that require internal reporting only.",
          classification: "legal_requirement",
          source_id: "riddor-2013",
        },
        {
          text: "Complete an incident report with the correct level of detail.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
        {
          text: "Explain the RIDDOR reporting timelines: 10 days for most reportable incidents, 15 days for over-7-day incapacitation.",
          classification: "legal_requirement",
          source_id: "hse-riddor-when",
        },
        {
          text: "Explain why near-miss reporting matters and is encouraged.",
          classification: "internal_standard",
          source_id: "internal-incident",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific HSE penalty amounts for RIDDOR non-compliance — excluded because fines are determined by courts based on circumstances.",
    "Full list of RIDDOR 'specified injuries' — abbreviated in lesson for operational relevance. Full list available at HSE website.",
    "Detailed investigation methodology — this is a management/HSE responsibility, not a frontline staff training requirement.",
  ],

  remaining_gaps: [
    "Company-specific incident report form or digital system — referenced as internal standard but exact form/tool not confirmed.",
    "Named first aiders per branch and their locations — should be posted on-site and communicated during induction.",
    "Company-specific dangerous occurrence examples relevant to hospitality — should be identified through risk assessment.",
  ],

  quiz_support_notes: [
    "Questions on RIDDOR thresholds (what must be reported) — supported by RIDDOR 2013.",
    "Questions on reporting timelines (10 days, 15 days) — supported by HSE guidance.",
    "Questions on near-miss vs reportable incident distinction — supported by RIDDOR + internal standards.",
    "Questions on what details to record in an incident report — supported by internal standards.",
    "Do NOT quiz on specific penalty amounts, full lists of specified injuries, or investigation methodology.",
  ],

  refresher_recommendation: "Annual refresher. UGLŌ sets a 365-day refresher as an internal standard.",

  practical_signoff_points: [
    "Complete a sample incident report with correct details for a given scenario",
    "Identify whether a given scenario requires RIDDOR reporting",
    "State the RIDDOR reporting timelines for different incident types",
    "Explain who to escalate to in the company for different incident severities",
  ],

  manager_observation_notes: [
    "Track near-miss reporting frequency — low volume may indicate a reporting culture problem",
    "Review incident reports for completeness and accuracy",
    "Verify RIDDOR-reportable incidents are being identified and reported on time",
    "Use incident patterns to inform team briefings and risk assessments",
  ],
};
