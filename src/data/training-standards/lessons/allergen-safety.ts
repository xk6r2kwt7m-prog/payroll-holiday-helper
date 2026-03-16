/**
 * Allergen Safety Essentials — Source-Backed Lesson Content
 *
 * AMENDED SOURCE PACK v1.1
 * All points classified as: legal_requirement | official_guidance | internal_standard
 * No unsupported facts. No customer reviews used as compliance sources.
 *
 * Sources verified: 2026-03-16
 */

import type { LessonContent } from "../lesson-types";

export const allergenSafetyLesson: LessonContent = {
  module_title: "Allergen Safety Essentials",
  version: "1.1",
  last_reviewed: "2026-03-16",
  confidence_level: "high",

  // ─── VERIFIED SOURCES ───

  sources: [
    {
      id: "fsa-allergen-guidance",
      name: "Food Standards Agency — Allergen Guidance for Food Businesses",
      type: "official_guidance",
      jurisdiction: "England, Wales, Northern Ireland",
      url: "https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses",
      relevance: "Primary regulatory guidance for allergen management in food service businesses. Covers the 14 declarable allergens, communication duties, and operational controls.",
    },
    {
      id: "fsa-allergen-checklist",
      name: "Food Standards Agency — Allergen Checklist for Food Businesses (March 2025)",
      type: "official_guidance",
      jurisdiction: "England, Wales, Northern Ireland",
      url: "https://www.food.gov.uk/business-guidance/allergen-checklist-for-food-businesses",
      relevance: "Practical checklist covering training, recipe management, cross-contamination controls, and communication protocols. Recommends annual refresher training.",
    },
    {
      id: "eu-reg-1169",
      name: "Retained EU Regulation 1169/2011 — Food Information to Consumers",
      type: "legal_requirement",
      jurisdiction: "UK (retained EU law)",
      url: "https://www.legislation.gov.uk/eur/2011/1169/contents",
      relevance: "Legal basis requiring food businesses to declare the presence of the 14 specified allergens. Establishes the legal list of declarable allergens.",
    },
    {
      id: "ppds-natashas-law",
      name: "Food Standards Agency — Prepacked for Direct Sale (PPDS) / Natasha's Law",
      type: "legal_requirement",
      jurisdiction: "England, Wales, Northern Ireland",
      url: "https://www.food.gov.uk/business-guidance/prepacked-for-direct-sale-ppds",
      relevance: "Since October 2021, PPDS food must carry a label with the food name and full ingredients list with the 14 allergens emphasised.",
    },
    {
      id: "nhs-anaphylaxis",
      name: "NHS — Anaphylaxis",
      type: "official_guidance",
      jurisdiction: "UK",
      url: "https://www.nhs.uk/conditions/anaphylaxis/",
      relevance: "Authoritative medical guidance on recognising anaphylaxis symptoms and emergency response steps. Used for the emergency response section only.",
    },
    {
      id: "internal-allergen-protocols",
      name: "UGLŌ Internal Allergen Protocols",
      type: "internal_standard",
      jurisdiction: "Company-wide",
      relevance: "Company-specific controls including black plate protocol, repeat-back confirmation, ticket reprint rules, nuts vs peanuts clarification procedure, and dish allergen matrix.",
    },
  ],

  // ─── LESSON SECTIONS ───

  sections: [
    // 1. Overview
    {
      heading: "Overview",
      type: "overview",
      paragraphs: [
        "Allergen safety is one of the highest-risk areas in food service. Incorrect handling can cause severe allergic reactions including anaphylaxis, which can be fatal.",
        "This module covers the legal rules you must follow, the official guidance that shapes best practice, and the specific company procedures we use to keep customers safe.",
      ],
    },

    // 2. Why This Matters
    {
      heading: "Why This Matters",
      type: "why_this_matters",
      points: [
        {
          text: "Anaphylaxis is a life-threatening allergic reaction that happens very quickly. Symptoms include swelling of the throat and tongue, difficulty breathing, wheezing, feeling faint or dizzy, and cold or pale skin. It requires immediate emergency treatment.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "Food businesses have a legal duty to provide allergen information for all food sold or served. Failure to comply can result in enforcement action.",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Customer review patterns show that unclear allergen communication is a recurring concern. Guests with allergies specifically comment on whether staff appeared confident and knowledgeable when handling their requirements.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 3. Key Rules
    {
      heading: "Key Rules",
      type: "key_rules",
      points: [
        {
          text: "There are 14 allergens that must be declared by law when used as ingredients: celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, nuts (tree nuts), peanuts, sesame, soybeans, and sulphur dioxide (at levels above 10mg/kg or 10mg/litre).",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Food businesses must provide allergen information to customers. For non-prepacked food (served in restaurants), this can be provided orally but a written notice must direct customers to ask, and staff must be able to provide accurate information.",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Prepacked for direct sale (PPDS) food must carry a label showing the food name and a full ingredients list with the 14 declarable allergens emphasised (e.g. in bold).",
          classification: "legal_requirement",
          source_id: "ppds-natashas-law",
        },
        {
          text: "Businesses should have robust systems to manage allergens, including documented recipes, staff training, and processes to prevent cross-contamination.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "The FSA allergen checklist recommends training staff on allergen management at least annually. This is recommended best practice, not automatically a statutory requirement.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "If a dish's recipe changes or a new supplier is used, allergen information must be updated before the dish is next served.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Businesses should not make 'free-from' claims for dishes prepared in environments where cross-contamination cannot be fully prevented — for example, items cooked in shared fryers.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
      ],
    },

    // 4. Step-by-Step Standard
    {
      heading: "Step-by-Step: Handling an Allergen Order",
      type: "step_by_step",
      points: [
        {
          text: "Step 1 — Ask: Always ask the customer about allergies or intolerances before taking an order. Our company standard is to ask proactively, not wait for the customer to volunteer the information.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Step 2 — Check severity: Ask the customer how severe their allergy is. This determines the level of caution required in the kitchen (e.g. whether shared fryer oil is acceptable).",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Step 3 — Confirm and repeat back: After noting all allergies, repeat them back to the customer clearly. For example: \"So you have an allergy to peanuts and dairy — is that correct?\" Wait for their confirmation.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Step 4 — Check the allergen matrix: Consult the current dish allergen reference chart to confirm which dishes are safe. If in doubt, ask the kitchen or manager — never guess.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "Step 5 — Communicate to kitchen: Ensure the allergen requirement is clearly recorded on the order ticket. Our company rule: no handwritten allergen notes on printed tickets — if allergen information changes, reprint a new ticket.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Step 6 — Kitchen preparation: Use separate utensils, chopping boards, and cooking surfaces for allergen-free orders. Clean surfaces thoroughly before preparation.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Step 7 — Serve on black plate: All allergen-safe dishes at UGLŌ are served on black plates. This is an internal visual control to help staff and customers identify allergen orders at the table.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Step 8 — Explain the dish: When placing any dish, state what it is and confirm its allergen status verbally. For example: \"This is your gluten-free satay chicken on the black plate.\"",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 5. Nuts vs Peanuts Protocol
    {
      heading: "Nuts vs Peanuts — Clarification Protocol",
      type: "key_rules",
      points: [
        {
          text: "Peanuts (groundnuts) and tree nuts (e.g. almonds, hazelnuts, walnuts, pecans) are classified as separate allergens under food law. A person may be allergic to one but not the other.",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Most customers do not distinguish between nuts and peanuts. When a customer mentions a \"nut allergy,\" our company standard is to immediately ask: \"Are you allergic to peanuts as well?\" This is a required step at UGLŌ.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 6. Cross-Contamination
    {
      heading: "Cross-Contamination Controls",
      type: "key_rules",
      points: [
        {
          text: "Cross-contamination occurs when allergens are unintentionally transferred to food — for example through shared utensils, cutting boards, cooking oils, or work surfaces.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "Items such as apple pie, which may not contain nuts, dairy, peanuts, or eggs as ingredients, may be cooked in shared fryer oil also used for items with those allergens. Staff must always inform customers about potential trace allergens from shared cooking equipment.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "The FSA advises that businesses should not describe food as 'free-from' an allergen unless they can guarantee no cross-contamination has occurred during preparation, cooking, and serving.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
      ],
    },

    // 7. Common Mistakes
    {
      heading: "Common Mistakes",
      type: "common_mistakes",
      points: [
        {
          text: "Assuming you know the allergens in a dish without checking the current allergen matrix — recipes and suppliers can change.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Failing to communicate a customer's allergy accurately to all relevant staff (kitchen, runners, other FOH).",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "Adding handwritten allergen notes to printed tickets instead of reprinting. Our company rule requires a fresh ticket for any allergen update.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Rushing during busy service and skipping the repeat-back confirmation step with the customer.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Complacency — assuming a small amount of an allergen is safe, or that a mild allergy does not require full precautions.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
      ],
    },

    // 8. Emergency Response
    {
      heading: "Emergency Response: Suspected Anaphylaxis",
      type: "emergency_response",
      paragraphs: [
        "If a customer shows signs of a severe allergic reaction, act immediately. Do not wait to see if symptoms improve.",
      ],
      points: [
        {
          text: "Recognise the signs: swelling of throat and tongue, difficulty breathing or wheezing, feeling faint or dizzy, pale or cold skin, confusion or drowsiness.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "If the person has an adrenaline auto-injector (such as an EpiPen), help them use it. Instructions are on the side of the device.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "Call 999 immediately and state you suspect anaphylaxis.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "Help them lie down, raising their legs if possible. If they are struggling to breathe, let them sit up slowly. Do not let them stand or walk.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "If symptoms have not improved after 5 minutes, a second adrenaline auto-injector can be used if available.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "Immediately inform the manager on duty. Our company standard is to record any allergen incident as soon as possible after the event.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 9. Scenarios
    {
      heading: "Real Service Scenarios",
      type: "scenarios",
      points: [
        {
          text: "Scenario 1: A customer says \"I have a nut allergy.\" You must ask: \"Are you allergic to peanuts as well?\" Then check the allergen matrix for all dishes containing tree nuts and/or peanuts. Inform them about Satay Chicken (peanuts), Pecan Pie (tree nuts), and Nutella dumplings (both). Also flag potential fryer cross-contamination for fried items.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Scenario 2: A customer says \"I'm coeliac.\" Check which dishes contain gluten. Many of our dumplings use wheat dough. Also check sauces, garnishes, and sides — for example, Ugly Noodles and Tempura Aubergine contain gluten. Use separate cooking equipment and clean surfaces.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Scenario 3: The kitchen ticket does not clearly show allergen information. Do NOT prepare the item. Return it to FOH and request a new ticket with correct allergen details printed.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Scenario 4: You are serving a table where one guest has a dairy allergy. You bring dishes to the table. You must explain each dish as you place it and confirm the allergen-safe dish by name: \"This is your dairy-free mushroom dish on the black plate.\"",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 10. Expected Behaviours
    {
      heading: "Expected Behaviours",
      type: "expected_behaviours",
      points: [
        {
          text: "Always ask about allergies before taking an order.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Never guess — check the allergen matrix or ask the kitchen/manager.",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "Use separate utensils and surfaces for allergen-free preparation.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Verbally confirm allergen requirements when delivering food to the table.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Immediately inform colleagues and the manager when a table has an allergy.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Double-check every order when picking up from the kitchen — always read the ticket.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },

    // 11. Manager Observation Points (admin-only)
    {
      heading: "Manager Observation Points",
      type: "manager_notes",
      staff_visible: false,
      points: [
        {
          text: "Are staff asking about allergies at order stage without prompting?",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Is the allergen matrix up to date, accessible, and being consulted?",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Are kitchen tickets clearly flagging allergen requirements? Are staff using the reprint rule?",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Do staff escalate when unsure rather than guessing?",
          classification: "official_guidance",
          source_id: "fsa-allergen-guidance",
        },
        {
          text: "Are allergen-safe dishes consistently served on black plates with verbal explanation?",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "When recipe or supplier changes occur, is the allergen matrix updated before next service?",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
      ],
    },

    // 12. Learning Outcomes
    {
      heading: "Learning Outcomes",
      type: "learning_outcomes",
      points: [
        {
          text: "Name the 14 allergens that must be declared under UK food law.",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Explain the legal duty to provide allergen information when serving food.",
          classification: "legal_requirement",
          source_id: "eu-reg-1169",
        },
        {
          text: "Demonstrate correct cross-contamination prevention procedures.",
          classification: "official_guidance",
          source_id: "fsa-allergen-checklist",
        },
        {
          text: "Follow the company's step-by-step allergen order process including repeat-back, ticket rules, and black plate protocol.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
        {
          text: "Recognise the symptoms of anaphylaxis and follow the correct emergency response steps.",
          classification: "official_guidance",
          source_id: "nhs-anaphylaxis",
        },
        {
          text: "Correctly distinguish between peanut and tree nut allergies and ask the appropriate follow-up question.",
          classification: "internal_standard",
          source_id: "internal-allergen-protocols",
        },
      ],
    },
  ],

  // ─── EXCLUDED / UNSUPPORTED POINTS ───

  excluded_points: [
    "Specific penalty amounts for allergen non-compliance — excluded because exact fine amounts vary by case and enforcing authority. Not safe to state a specific number without the relevant enforcement source.",
    "Detailed first-aid medical treatment beyond auto-injector use and calling 999 — excluded because medical treatment of anaphylaxis is a hospital responsibility (NHS guidance). Staff should not be trained to provide medical treatment beyond the steps listed.",
    "Claims that annual allergen training is a statutory legal requirement — the FSA checklist recommends annual training as best practice, but this is guidance, not a standalone statutory duty. Labelling corrected accordingly.",
    "Specific enforcement body procedures (e.g. how local authorities conduct inspections) — excluded as this varies by authority and is not directly relevant to staff operational training.",
  ],

  // ─── REMAINING GAPS ───

  remaining_gaps: [
    "Scotland-specific allergen guidance from Food Standards Scotland — this module currently covers England, Wales, and NI. Scottish rules are broadly aligned but should be verified separately if UGLŌ operates in Scotland.",
    "Exact company protocol for recording allergen incidents post-event — the internal source references 'recording as soon as possible' but the detailed incident form or system is not specified in available materials.",
  ],

  // ─── QUIZ SUPPORT NOTES ───

  quiz_support_notes: [
    "Quiz questions must only test content that appears in the verified lesson sections above.",
    "Questions on the 14 allergens list — supported by EU Regulation 1169/2011.",
    "Questions on the step-by-step allergen order process — supported by internal protocols.",
    "Questions on cross-contamination scenarios — supported by FSA guidance and internal protocols.",
    "Questions on anaphylaxis symptoms and response — supported by NHS guidance.",
    "Questions on nuts vs peanuts distinction — supported by EU Regulation 1169/2011 and internal protocols.",
    "Questions on PPDS labelling — supported by Natasha's Law.",
    "Do NOT generate quiz questions about penalty amounts, specific enforcement procedures, or medical treatment beyond auto-injector and 999.",
  ],

  // ─── REFRESHER ───

  refresher_recommendation: "The FSA allergen checklist recommends training staff at least annually. This is recommended best practice. UGLŌ sets a 180-day refresher cycle as an internal standard to exceed this recommendation.",

  // ─── PRACTICAL SIGN-OFF POINTS ───

  practical_signoff_points: [
    "Demonstrate asking a customer about allergies during a live or simulated order",
    "Correctly use the allergen matrix to identify allergens for at least 3 menu items",
    "Complete the repeat-back confirmation process for an allergen order",
    "Identify the correct plate (black) for an allergen-safe dish",
    "Explain a dish verbally at the table including allergen status",
    "Describe the 5 steps of the NHS anaphylaxis emergency response",
  ],

  // ─── MANAGER OBSERVATION NOTES ───

  manager_observation_notes: [
    "Observe during live service whether staff proactively ask about allergies",
    "Check that allergen matrix is current and matches actual menu",
    "Monitor ticket handling — no handwritten allergen amendments",
    "Verify black plate protocol is followed consistently",
    "Confirm staff can verbally identify allergens in at least 3 popular dishes",
  ],
};
