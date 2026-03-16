/**
 * Respectful Workplace Conduct — Source-Backed Lesson Content
 *
 * Sources verified: 2026-03-16
 * Classification: legal_requirement | official_guidance | internal_standard
 */

import type { LessonContent } from "../lesson-types";

export const respectfulConductLesson: LessonContent = {
  module_title: "Respectful Workplace Conduct",
  version: "1.0",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  sources: [
    {
      id: "equality-act-2010",
      name: "Equality Act 2010",
      type: "legal_requirement",
      jurisdiction: "England, Wales, Scotland",
      url: "https://www.legislation.gov.uk/ukpga/2010/15/contents",
      relevance: "Primary UK legislation prohibiting discrimination, harassment, and victimisation in the workplace based on protected characteristics. Employers have a legal duty to prevent discrimination.",
    },
    {
      id: "acas-discrimination",
      name: "ACAS — Discrimination and the Equality Act 2010",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.acas.org.uk/discrimination-and-the-law",
      relevance: "ACAS guidance explaining what discrimination means in practice, protected characteristics, types of discrimination (direct, indirect, harassment, victimisation), and employer responsibilities.",
    },
    {
      id: "acas-bullying",
      name: "ACAS — Bullying at Work",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.acas.org.uk/bullying-at-work",
      relevance: "ACAS guidance on what bullying is, how it differs from discrimination, and what employers and staff should do about it.",
    },
    {
      id: "acas-handling",
      name: "ACAS — Handling Bullying and Discrimination Complaints",
      type: "official_guidance",
      jurisdiction: "Great Britain",
      url: "https://www.acas.org.uk/handling-a-bullying-discrimination-complaint",
      relevance: "ACAS guidance on how employers should handle complaints — covering informal and formal processes.",
    },
    {
      id: "internal-conduct",
      name: "UGLŌ Internal Conduct Standards",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific reporting routes, escalation procedures, and expected conduct standards.",
    },
  ],

  sections: [
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Every person at work has the right to be treated with dignity and respect. Discrimination, harassment, and bullying are not just wrong — some forms are unlawful under the Equality Act 2010.",
        "This module covers the legal protections in place, what discrimination and harassment look like in practice, how to report concerns, and the behaviour standards we expect at UGLŌ.",
      ],
    },
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "The Equality Act 2010 protects workers from discrimination, harassment, and victimisation based on protected characteristics: age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, and sexual orientation.",
          classification: "legal_requirement",
          source_id: "equality-act-2010",
        },
        {
          text: "All employers must make sure they do not unfairly discriminate, take steps to prevent discrimination, do all they reasonably can to protect people from discrimination by others, and look after the wellbeing of their workers (duty of care).",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Employers can be held responsible for the discriminatory actions of their workers — this is called vicarious liability. Individuals who discriminate are also personally responsible.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
      ],
    },
    {
      heading: "Key Rules: What Counts as Discrimination",
      type: "key_rules",
      points: [
        {
          text: "Direct discrimination: treating someone less favourably because of a protected characteristic. It can still be discrimination even if the less favourable treatment was not intended.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Indirect discrimination: when everyone is treated the same but a rule or practice puts people with a particular protected characteristic at a disadvantage.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Harassment: unwanted behaviour related to a protected characteristic that has the purpose or effect of violating a person's dignity or creating an intimidating, hostile, degrading, humiliating, or offensive environment.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Victimisation: treating someone badly because they have made or supported a discrimination or harassment complaint, or because someone thinks they might do so.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
      ],
    },
    {
      heading: "Key Rules: Bullying",
      type: "key_rules",
      points: [
        {
          text: "Bullying is offensive, intimidating, malicious, or insulting behaviour, or an abuse of power, that undermines, humiliates, or causes physical or emotional harm to someone. While bullying itself is not specifically defined in legislation, it can amount to harassment if it is related to a protected characteristic.",
          classification: "official_guidance",
          source_id: "acas-bullying",
        },
        {
          text: "Examples of bullying include: spreading malicious rumours, excluding someone from team activities, constantly criticising someone unfairly, intimidating someone, and undermining someone's authority.",
          classification: "official_guidance",
          source_id: "acas-bullying",
        },
      ],
    },
    {
      heading: "Step-by-Step: If You Experience or Witness Inappropriate Behaviour",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — If you feel safe to do so, tell the person that their behaviour is unwelcome and ask them to stop.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Step 2 — Keep a factual record: note what happened, when, where, and who was present. This is important if you decide to raise a formal complaint.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Step 3 — Report the behaviour to your manager. If your manager is the person involved, report to their manager or to the designated contact in our company.",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
        {
          text: "Step 4 — If you witness inappropriate behaviour toward a colleague, you should also speak up or report it. ACAS guidance states that bystanders can report witnessed discrimination.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Step 5 — Our company standard: no retaliation against anyone who raises a concern. Victimisation of someone who makes a complaint is unlawful under the Equality Act.",
          classification: "legal_requirement",
          source_id: "equality-act-2010",
        },
      ],
    },
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Normalising inappropriate 'banter' — particularly in kitchen culture. If the behaviour is unwanted and relates to a protected characteristic, it can amount to harassment regardless of intent.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Managers dismissing complaints as 'oversensitivity.' Employers have a duty to take complaints seriously and investigate properly.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Not knowing who to report to or what counts as reportable behaviour.",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
        {
          text: "Assuming discrimination must be deliberate. Unintentional discrimination is still unlawful.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
      ],
    },
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A colleague makes repeated unwelcome comments about your appearance linked to your race or gender. This could amount to harassment under the Equality Act. You should ask them to stop if you feel safe doing so, and report it to your manager or designated contact.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Scenario 2: A customer makes a discriminatory remark toward a team member. The employer has a duty of care to protect staff. The manager should check in with the team member, address the customer's behaviour if appropriate, and record the incident.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Scenario 3: A team member is consistently excluded from shift drinks and social events by colleagues. While this may not always be unlawful, if the exclusion is because of a protected characteristic, it could amount to direct discrimination or harassment.",
          classification: "official_guidance",
          source_id: "acas-bullying",
        },
      ],
    },
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Treat all colleagues and customers with dignity regardless of background, identity, or characteristics.",
          classification: "legal_requirement",
          source_id: "equality-act-2010",
        },
        {
          text: "Speak up or report if you witness inappropriate behaviour — bystander action is encouraged.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Never retaliate against someone who raises a concern. Victimisation is unlawful.",
          classification: "legal_requirement",
          source_id: "equality-act-2010",
        },
        {
          text: "Keep interactions professional, especially under service pressure. Kitchen culture is not an exemption from equality law.",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
      ],
    },
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Is the team culture respectful during service pressure? Watch for language, tone, and exclusionary behaviour.",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
        {
          text: "Are complaints being taken seriously and documented? ACAS guidance requires employers to handle complaints properly.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
        {
          text: "Do all staff know the reporting route — who to speak to and how?",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
        {
          text: "Are you modelling respectful behaviour? Managers set the tone for the team.",
          classification: "official_guidance",
          source_id: "acas-handling",
        },
      ],
    },
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Name the 9 protected characteristics under the Equality Act 2010.",
          classification: "legal_requirement",
          source_id: "equality-act-2010",
        },
        {
          text: "Explain what constitutes harassment and discrimination, including unintentional discrimination.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
        {
          text: "Identify the correct reporting and escalation routes in the company.",
          classification: "internal_standard",
          source_id: "internal-conduct",
        },
        {
          text: "Describe the concept of vicarious liability and why it matters for all staff.",
          classification: "legal_requirement",
          source_id: "acas-discrimination",
        },
      ],
    },
  ],

  excluded_points: [
    "Specific tribunal award amounts — excluded because these vary by case and are determined by employment tribunals based on circumstances.",
    "Detailed formal grievance procedure steps — excluded because this varies by employer and is covered in separate company policy documents.",
    "Specific examples of 'reasonable adjustments' for disability — excluded because these are highly individual and context-dependent.",
  ],

  remaining_gaps: [
    "Company-specific reporting contacts and escalation chain — referenced as internal standard but named individuals/roles should be confirmed per location.",
    "Whether UGLŌ has a written anti-bullying and harassment policy — this should exist as a separate document for staff to reference.",
  ],

  quiz_support_notes: [
    "Questions on protected characteristics — supported by Equality Act 2010.",
    "Questions on types of discrimination (direct, indirect, harassment, victimisation) — supported by ACAS guidance.",
    "Questions on reporting steps — supported by ACAS handling guidance and internal procedures.",
    "Questions on vicarious liability — supported by ACAS.",
    "Do NOT quiz on specific tribunal amounts, detailed grievance procedures, or reasonable adjustment examples.",
  ],

  refresher_recommendation: "Annual refresher. UGLŌ sets a 365-day refresher as an internal standard. Workplace conduct training is an important part of an employer's duty to prevent discrimination.",

  practical_signoff_points: [
    "Name the 9 protected characteristics",
    "Describe what you would do if a colleague made unwelcome comments about a protected characteristic",
    "Identify who to report to in the company if you experience or witness inappropriate behaviour",
    "Explain why 'it was just banter' is not a defence against harassment",
  ],

  manager_observation_notes: [
    "Monitor team interactions during high-pressure service for respectful communication",
    "Ensure all complaints are documented and followed up",
    "Check that reporting routes are communicated during induction",
    "Model respectful behaviour — managers set the standard",
  ],
};
