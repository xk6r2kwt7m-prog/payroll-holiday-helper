/**
 * Slips, Trips and Manual Handling — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const slipsTripsLesson: LessonContent = {
  module_title: "Slips, Trips and Manual Handling",
  version: "1.0",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  sources: [
    {
      id: "hswa-1974",
      name: "Health and Safety at Work etc. Act 1974",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/ukpga/1974/37/contents",
      relevance: "Requires employers to ensure, so far as is reasonably practicable, the health, safety, and welfare at work of all employees. Also requires employees to take reasonable care for their own safety and that of others.",
    },
    {
      id: "workplace-regs-1992",
      name: "Workplace (Health, Safety and Welfare) Regulations 1992",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/uksi/1992/3004/contents",
      relevance: "Requires floors to be suitable, in good condition, and free from obstructions and substances likely to cause slips, trips, or falls.",
    },
    {
      id: "mhor-1992",
      name: "Manual Handling Operations Regulations 1992 (as amended)",
      type: "legal_requirement",
      jurisdiction: "Great Britain",
      url: "https://www.legislation.gov.uk/uksi/1992/2793/contents",
      relevance: "Requires employers to avoid the need for manual handling where reasonably practicable, assess risk where it cannot be avoided, and reduce the risk of injury.",
    },
    {
      id: "hse-slips",
      name: "HSE — Slips and Trips: Causes and Prevention",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/slips/index.htm",
      relevance: "HSE guidance on identifying slip and trip hazards, contamination, cleaning, footwear, and environmental factors.",
    },
    {
      id: "hse-catering",
      name: "HSE — Catering and Hospitality Health and Safety",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.hse.gov.uk/catering/index.htm",
      relevance: "HSE sector-specific guidance for catering covering slips, musculoskeletal disorders, and common workplace hazards.",
    },
    {
      id: "internal-safety",
      name: "UGLŌ Internal Safety Standards",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific spill response procedures, footwear policy, and hazard reporting process.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Slips, trips, and falls are the most common cause of workplace injury in the hospitality and catering sector. Most are preventable through good housekeeping, proper footwear, and prompt hazard reporting.",
        "This module covers the legal duties of both employers and employees, official HSE guidance for preventing slips and trips, safe manual handling principles, and our company procedures.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "Employers must ensure, so far as is reasonably practicable, the health, safety, and welfare at work of all employees. Employees must also take reasonable care for their own safety and that of others affected by their actions.",
          classification: "legal_requirement",
          source_id: "hswa-1974",
        },
        {
          text: "Floors and traffic routes must be suitable, in good condition, and free from obstructions and substances likely to cause a person to slip, trip, or fall.",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
        {
          text: "The HSE identifies slips and trips as the single most common cause of major injury in the workplace. In catering, wet floors, grease spills, and cluttered walkways are the primary hazards.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
      ],
    },
    {
      heading: "Key Rules: Slip and Trip Prevention",
      type: "key_rules",
      points: [
        {
          text: "Clean up spills immediately. If immediate cleaning is not possible, place a warning sign and arrange cleaning as quickly as possible.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Keep walkways, corridors, and fire exits clear of obstructions including delivery boxes, equipment, and personal belongings.",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
        {
          text: "Use appropriate cleaning methods — some cleaning can temporarily increase slip risk (e.g. wet mopping a busy area). The HSE recommends cleaning at quiet times where possible and using appropriate wet floor signs.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Wear slip-resistant footwear. The HSE identifies footwear as one of the key controls for preventing slips in workplaces with wet or contaminated floors.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Report damaged, broken, or uneven floor surfaces to your manager immediately. Flooring in poor condition is a common trip hazard.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
      ],
    },
    {
      heading: "Key Rules: Manual Handling",
      type: "key_rules",
      points: [
        {
          text: "Employers must, so far as reasonably practicable, avoid the need for employees to undertake manual handling operations that involve a risk of injury.",
          classification: "legal_requirement",
          source_id: "mhor-1992",
        },
        {
          text: "Where manual handling cannot be avoided, the employer must assess the risk and take steps to reduce it — for example by providing equipment, splitting loads, or training staff.",
          classification: "legal_requirement",
          source_id: "mhor-1992",
        },
        {
          text: "When lifting: plan the lift, stand close to the load, bend at the knees (not the waist), keep the load close to your body, lift smoothly, and avoid twisting while carrying.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "If a load is too heavy or awkward to lift safely alone, ask for help or use equipment. Do not attempt to carry more than you can safely manage.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
      ],
    },
    {
      heading: "Step-by-Step: Responding to a Spill",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Stop and assess: Is anyone at immediate risk of slipping? Warn people in the area verbally.",
          classification: "internal_standard",
          source_id: "internal-safety",
        },
        {
          text: "Step 2 — Place a wet floor sign immediately if one is available nearby.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Step 3 — Clean the spill as quickly as possible using appropriate materials. For grease, use a degreaser rather than just water.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Step 4 — Dry the floor or ensure it is no longer slippery before removing the sign.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Step 5 — Our company standard: spills in customer-facing areas must be addressed within 2 minutes. If you cannot clean it immediately, stay near the spill and ask a colleague for help.",
          classification: "internal_standard",
          source_id: "internal-safety",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Ignoring a spill because 'someone else will get it.' Under the law, employees have a duty to take reasonable care for the safety of themselves and others.",
          classification: "legal_requirement",
          source_id: "hswa-1974",
        },
        {
          text: "Carrying too many items at once to save trips — this increases the risk of dropping items, tripping, and obstructing your own view.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "Not wearing correct slip-resistant footwear. Trainers, fashion shoes, or worn-out soles significantly increase slip risk.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Leaving delivery boxes or equipment in walkways during busy service.",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: There is a wet floor near the pass during service. Immediate action: warn staff verbally, place a wet floor sign, clean as quickly as possible. Do not leave it for 'after service.'",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Scenario 2: A delivery of 20kg boxes arrives. Assess whether you can safely lift each box alone. If not, ask for help or use a trolley. Bend at the knees, hold the load close to your body, and avoid twisting.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "Scenario 3: You notice a broken tile near the entrance to the kitchen. Report it to your manager immediately. Place a temporary warning sign if the area is uneven enough to cause a trip.",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Clean up spills immediately or place a warning sign and arrange cleaning within minutes.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Wear slip-resistant footwear at all times during shifts.",
          classification: "internal_standard",
          source_id: "internal-safety",
        },
        {
          text: "Keep walkways clear — do not leave boxes, bags, or equipment in corridors or doorways.",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
        {
          text: "Use correct lifting technique: bend at the knees, keep the load close, do not twist.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "Report broken or uneven floor surfaces immediately.",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are spills being cleaned immediately during service?",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
        {
          text: "Are all staff wearing correct slip-resistant footwear?",
          classification: "internal_standard",
          source_id: "internal-safety",
        },
        {
          text: "Are walkways and fire exits kept clear, including during deliveries?",
          classification: "legal_requirement",
          source_id: "workplace-regs-1992",
        },
        {
          text: "Are wet floor signs available and in good condition?",
          classification: "official_guidance",
          source_id: "hse-slips",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Identify common slip, trip, and fall hazards in a hospitality environment.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "Describe the legal duty of both employers and employees regarding workplace safety.",
          classification: "legal_requirement",
          source_id: "hswa-1974",
        },
        {
          text: "Apply correct manual handling technique for lifting heavy items.",
          classification: "official_guidance",
          source_id: "hse-catering",
        },
        {
          text: "Report hazards promptly using the correct company process.",
          classification: "internal_standard",
          source_id: "internal-safety",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific injury statistics (e.g. '30% of all workplace injuries') — excluded because HSE statistics change annually and citing a specific number without a dated source risks becoming inaccurate.",
    "Maximum safe lifting weight thresholds (e.g. '25kg') — excluded because the Manual Handling Regulations do not set a single maximum weight. Safe weight depends on the individual, the task, the load, and the environment.",
    "Specific cost of slip/trip claims — excluded because claim values vary and citing a specific figure could be misleading.",
  ],

  remaining_gaps: [
    "Company-specific approved footwear list or supplier — referenced as internal standard but specific details not available.",
    "Company-specific hazard reporting form or digital process — procedure referenced but exact form not confirmed.",
  ],

  quiz_support_notes: [
    "Questions on legal duties (employer and employee) — supported by HSWA 1974.",
    "Questions on spill response steps — supported by HSE guidance.",
    "Questions on manual handling principles — supported by HSE catering guidance.",
    "Questions on walkway obstruction rules — supported by Workplace Regulations 1992.",
    "Do NOT quiz on specific weight limits, injury statistics, or claim costs.",
  ],

  refresher_recommendation: "Annual refresher. UGLŌ sets a 365-day refresher as an internal standard.",

  practical_signoff_points: [
    "Demonstrate correct spill response procedure including signage and cleaning",
    "Demonstrate safe lifting technique with a delivery-weight box",
    "Identify at least 3 common slip/trip hazards in the workplace",
    "Show where wet floor signs are stored and demonstrate correct placement",
  ],

  manager_observation_notes: [
    "Check spill response times during service",
    "Observe footwear compliance at shift start",
    "Walk the floor before and during service to check for obstructions",
    "Verify hazard reports are being submitted when issues are found",
  ],
};
