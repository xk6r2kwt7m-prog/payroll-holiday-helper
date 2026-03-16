/**
 * Fire Safety and Emergency Response — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const fireSafetyLesson: LessonContent = {
  module_title: "Fire Safety and Emergency Response",
  version: "1.0",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  sources: [
    {
      id: "rro-2005",
      name: "Regulatory Reform (Fire Safety) Order 2005",
      type: "legal_requirement",
      jurisdiction: "England and Wales",
      url: "https://www.legislation.gov.uk/uksi/2005/1541/contents",
      relevance: "Primary fire safety legislation for non-domestic premises in England and Wales. Requires the 'responsible person' to carry out fire risk assessments, provide fire safety training, and maintain fire safety measures.",
    },
    {
      id: "gov-fire-safety",
      name: "GOV.UK — Fire Safety in the Workplace",
      type: "official_guidance",
      jurisdiction: "England and Wales",
      url: "https://www.gov.uk/workplace-fire-safety-your-responsibilities",
      relevance: "Government guidance explaining the responsibilities of the 'responsible person' including risk assessment, staff training, fire safety measures, and emergency planning.",
    },
    {
      id: "hse-fire",
      name: "HSE — Fire Safety at Work Guidance",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/toolbox/fire.htm",
      relevance: "HSE guidance on fire prevention, evacuation, extinguisher types, and emergency procedures in workplaces.",
    },
    {
      id: "internal-fire",
      name: "UGLŌ Internal Fire Safety Procedures",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific evacuation routes, assembly point locations, staff duties during evacuation, and customer management procedures.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Fire safety training is a legal requirement for all staff in non-domestic premises. Every team member must know the evacuation procedure, the location of fire exits and extinguishers, and what to do if the fire alarm sounds.",
        "This module covers legal requirements under the Regulatory Reform (Fire Safety) Order 2005, official government guidance, and our company's specific evacuation and emergency procedures.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "The 'responsible person' (employer, owner, or occupier) must provide staff with fire safety instruction and training. This is a legal requirement under the Regulatory Reform (Fire Safety) Order 2005.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Responsible persons must carry out a fire risk assessment, tell staff about the risks identified, put in place and maintain appropriate fire safety measures, and plan for an emergency.",
          classification: "legal_requirement",
          source_id: "gov-fire-safety",
        },
        {
          text: "You could be fined or go to prison if you do not follow fire safety regulations.",
          classification: "legal_requirement",
          source_id: "gov-fire-safety",
        },
      ],
    },
    {
      heading: "Key Rules: Fire Prevention",
      type: "key_rules",
      points: [
        {
          text: "Fire exits and escape routes must be kept clear and unobstructed at all times. This includes not blocking exits with deliveries, furniture, or equipment.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Fire doors must not be propped open unless they are fitted with an approved automatic release mechanism connected to the fire alarm system.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Electrical equipment should be switched off when not in use (where safe to do so). Overloaded plug sockets and damaged cables are common fire hazards.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Waste and combustible materials must not be allowed to accumulate in or near the premises, especially near heat sources or escape routes.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Kitchen-specific: grease build-up in extraction systems, filters, and cooking equipment is a significant fire risk. Filters must be cleaned regularly.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
      ],
    },
    {
      heading: "Key Rules: Fire Extinguisher Types",
      type: "key_rules",
      points: [
        {
          text: "Water extinguishers (red label): suitable for Class A fires (solid materials like wood, paper, textiles). MUST NOT be used on electrical fires or cooking oil/fat fires.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "CO2 extinguishers (black label): suitable for electrical fires. Can also be used on Class B fires (flammable liquids). Not effective on cooking oil fires.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Wet chemical extinguishers (yellow label): specifically designed for Class F fires (cooking oils and fats). This is the correct type for kitchen fat fires.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Foam extinguishers (cream label): suitable for Class A and B fires. Should not be used on cooking oil fires or live electrical equipment.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "NEVER use water on a grease or cooking oil fire. This can cause a fireball as the water vaporises instantly and spreads the burning oil.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
      ],
    },
    {
      heading: "Step-by-Step: When the Fire Alarm Sounds",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Stop what you are doing immediately. Turn off any cooking equipment if it is safe to do so within a few seconds.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Step 2 — Guide customers calmly toward the nearest fire exit. Use clear, direct language: 'Please follow me to the exit.'",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Step 3 — Do NOT use lifts. Use stairs only.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Step 4 — Do NOT stop to collect personal belongings, coats, or bags.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Step 5 — Go to the designated assembly point and report to the person conducting the headcount.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Step 6 — Do NOT re-enter the building until you are told it is safe to do so by the fire service or the responsible person.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "New starters not being shown fire exits during induction. The responsible person must provide fire safety training to all staff.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Fire exit routes blocked by deliveries, furniture, or cleaning equipment.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Staff unsure which extinguisher type to use — using the wrong type on a grease fire can worsen the fire and cause injury.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Propping open fire doors to improve ventilation or make movement easier.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A grease fire starts on the hob. Which extinguisher must NOT be used? NEVER use a water extinguisher on a grease fire. Use a wet chemical extinguisher (yellow label) if trained to do so. If the fire is beyond a single extinguisher, evacuate and call 999.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Scenario 2: The fire alarm sounds during a fully booked service with 60 customers. Your first action is to stop service, remain calm, and begin guiding customers toward the nearest exits. Do not attempt to complete orders or process payments.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Scenario 3: You notice a fire door propped open with a wedge. Remove the wedge immediately and inform your manager. Fire doors must remain closed to prevent the spread of fire and smoke.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Know the location of all fire exits and extinguishers on your floor.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Guide customers calmly toward exits during an evacuation.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Never use a lift during a fire evacuation.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Report to the assembly point and confirm headcount.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Never prop open fire doors.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Can every team member identify the nearest fire exit from their work station?",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Are fire routes and exits clear and unobstructed at all times including during deliveries?",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
        {
          text: "Has the team practised evacuation procedures? The responsible person should plan regular drills.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Are fire extinguishers in date, accessible, and not blocked?",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Locate fire exits, extinguishers, and the assembly point for your workplace.",
          classification: "official_guidance",
          source_id: "gov-fire-safety",
        },
        {
          text: "Select the correct extinguisher type for different fire classes, especially kitchen grease fires.",
          classification: "official_guidance",
          source_id: "hse-fire",
        },
        {
          text: "Follow the company evacuation procedure including customer management.",
          classification: "internal_standard",
          source_id: "internal-fire",
        },
        {
          text: "Explain the legal responsibility to keep fire exits clear and fire doors closed.",
          classification: "legal_requirement",
          source_id: "rro-2005",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific fire drill frequency (e.g. 'every 6 months') — excluded because the legislation does not prescribe a specific frequency. The responsible person must ensure arrangements are adequate based on risk assessment.",
    "Specific fine amounts for fire safety non-compliance — excluded because penalties vary and are determined by courts based on circumstances.",
    "Detailed fire risk assessment methodology — this is a management responsibility, not a staff-level training requirement.",
  ],

  remaining_gaps: [
    "Company-specific assembly point location(s) per branch — referenced as internal standard but site-specific details should be confirmed per location.",
    "Whether UGLŌ premises have automatic fire door release systems — affects the guidance on fire door propping.",
    "Specific fire drill schedule per branch — should be maintained by the responsible person.",
  ],

  quiz_support_notes: [
    "Questions on extinguisher types and which to use for kitchen fires — supported by HSE guidance.",
    "Questions on evacuation procedure steps — supported by GOV.UK and internal procedures.",
    "Questions on fire door and exit rules — supported by RRO 2005.",
    "Questions on fire prevention (grease build-up, electrical safety) — supported by HSE.",
    "Do NOT quiz on specific fine amounts, drill frequencies, or risk assessment methodology.",
  ],

  refresher_recommendation: "Annual refresher. Fire safety training is a legal requirement. UGLŌ sets a 365-day refresher as an internal standard.",

  practical_signoff_points: [
    "Walk the fire evacuation route from your normal work position to the assembly point",
    "Identify the location and type of fire extinguishers nearest to your work station",
    "Demonstrate how you would guide customers to exits during an alarm",
    "Identify which extinguisher type is correct for a kitchen grease fire",
  ],

  manager_observation_notes: [
    "Check fire exit accessibility at least once per shift",
    "Ensure new starters are shown fire exits during first-day induction",
    "Verify all fire extinguishers are in date and unobstructed",
    "Conduct or participate in regular evacuation drills",
  ],
};
