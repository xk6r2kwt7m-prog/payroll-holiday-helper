/**
 * Drafted allergen content taken from the uploaded Ugly Dumpling allergen
 * safety course and assessment document.
 *
 * IMPORTANT
 *  - Nothing here is published course content. Every entry becomes a *proposal*
 *    that an administrator must approve.
 *  - Dish lines are drafted from the July 2026 matrix as quoted inside the
 *    course document. Until the approved matrix itself is uploaded as a source
 *    document, each line stays unconfirmed and no scored dish question is
 *    generated from it.
 *  - Every statement and question records the source document it came from.
 */

export const UD_COURSE_DOCUMENT_TITLE =
  "Ugly Dumpling Allergen Safety Course and Assessment";

export const UD_MATRIX_REFERENCE = "July 2026 approved allergen matrix (as quoted in the course document)";

export interface DraftDishLine {
  dish_name: string;
  dish_kind: "main" | "side" | "sauce" | "garnish" | "dessert" | "drink";
  regulated_allergens: string[];
  other_allergens: string[];
  cross_contact_note?: string;
  availability_note?: string;
  source_note: string;
}

const MATRIX_NOTE = `Recorded in the ${UD_MATRIX_REFERENCE}.`;

export const DRAFT_DISH_LINES: DraftDishLine[] = [
  { dish_name: "Pork Belly", dish_kind: "main", regulated_allergens: ["Sesame (garnish)", "Fish", "Soya", "Sulphites", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Aromatic Duck", dish_kind: "main", regulated_allergens: ["Sesame", "Soya", "Sulphites", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Prawn & Chive", dish_kind: "main", regulated_allergens: ["Sesame (garnish)", "Crustaceans", "Soya", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Satay Chicken", dish_kind: "main", regulated_allergens: ["Peanuts", "Sesame", "Soya", "Mustard", "Cereals containing gluten"], other_allergens: [], cross_contact_note: "Contains peanuts. Does NOT contain tree nuts under the current approved recipe and matrix. Peanuts and tree nuts are separate allergens.", source_note: MATRIX_NOTE },
  { dish_name: "Spring Roll Dumpling", dish_kind: "main", regulated_allergens: ["Sesame", "Soya", "Celery", "Sulphites", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Cheeseburger", dish_kind: "main", regulated_allergens: ["Sesame (garnish)", "Milk", "Mustard", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Mushroom & Truffle", dish_kind: "main", regulated_allergens: ["Milk", "Sulphites", "Cereals containing gluten"], other_allergens: ["Mushrooms"], source_note: MATRIX_NOTE },
  { dish_name: "Halloumi & Courgette", dish_kind: "main", regulated_allergens: ["Soya", "Milk", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Korean Kimchi", dish_kind: "main", regulated_allergens: ["Sesame", "Soya", "Celery", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Curry Paneer", dish_kind: "main", regulated_allergens: ["Milk", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Korean Beef Bulgogi Dumpling", dish_kind: "main", regulated_allergens: ["Sesame", "Soya", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Spinach & Tofu", dish_kind: "main", regulated_allergens: ["Sesame", "Soya", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic (garnish)"], source_note: MATRIX_NOTE },
  { dish_name: "Curry Goat", dish_kind: "main", regulated_allergens: ["Milk (garnish)", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], availability_note: "Brixton only.", source_note: MATRIX_NOTE },
  { dish_name: "Vegan Burger", dish_kind: "main", regulated_allergens: ["Sesame (garnish)", "Soya", "Mustard (garnish)", "Sulphites", "Cereals containing gluten"], other_allergens: [], cross_contact_note: "Vegan does not mean free from milk or egg: cross-contact may still occur.", source_note: MATRIX_NOTE },
  { dish_name: "Lamb & Harissa", dish_kind: "main", regulated_allergens: ["Milk", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Beef Rendang", dish_kind: "main", regulated_allergens: ["Sesame (garnish)", "Soya", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "Sichuan Vegan Pork Dumplings", dish_kind: "main", regulated_allergens: [], other_allergens: [], availability_note: "Appears in the October 2024 ingredient list only. Allergens not recorded in the current matrix extract — must be confirmed before any question is scored.", source_note: "Older October 2024 ingredient list (historical support only)." },
  { dish_name: "Nutella sweet dumpling", dish_kind: "dessert", regulated_allergens: ["Peanuts", "Tree nuts", "Soya", "Milk", "Cereals containing gluten"], other_allergens: [], cross_contact_note: "Nutella contains hazelnut and Ugly Dumpling adds mixed nuts. Both peanuts and tree nuts are currently declared. Never describe it as 'hazelnut only'.", source_note: MATRIX_NOTE },
  { dish_name: "Pecan sweet dumpling", dish_kind: "dessert", regulated_allergens: ["Tree nuts (pecan)", "Eggs", "Milk", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Biscoff Banana", dish_kind: "dessert", regulated_allergens: ["Peanuts", "Tree nuts", "Cereals containing gluten"], other_allergens: [], availability_note: "Brixton only.", source_note: MATRIX_NOTE },
  { dish_name: "Apple Pie", dish_kind: "dessert", regulated_allergens: ["Soya", "Cereals containing gluten"], other_allergens: [], cross_contact_note: "Fried in the shared dessert fryer: carries peanut and tree-nut cross-contact risk.", source_note: MATRIX_NOTE },
  { dish_name: "Strawberry Cheesecake", dish_kind: "dessert", regulated_allergens: ["Milk", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Ugly Noodles", dish_kind: "side", regulated_allergens: ["Sesame", "Soya", "Sulphites", "Cereals containing gluten"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Tempura Aubergine", dish_kind: "side", regulated_allergens: ["Peanuts (garnish)", "Soya", "Sulphites"], other_allergens: [], cross_contact_note: "The peanut garnish may be omitted only when the allergy is declared before preparation and the dish has not been contaminated. Once peanuts have touched the dish, discard and remake it.", source_note: MATRIX_NOTE },
  { dish_name: "Mango & Cucumber Salad", dish_kind: "side", regulated_allergens: ["Sesame", "Soya"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "GF Cucumber Salad", dish_kind: "side", regulated_allergens: [], other_allergens: [], availability_note: "Appears in the October 2024 ingredient list only. Allergens not recorded in the current matrix extract.", source_note: "Older October 2024 ingredient list (historical support only)." },
  { dish_name: "Corn Fritters", dish_kind: "side", regulated_allergens: ["Milk (garnish)"], other_allergens: ["Garlic"], availability_note: "Brixton only.", source_note: MATRIX_NOTE },
  { dish_name: "Laksa Soup", dish_kind: "side", regulated_allergens: ["Crustaceans (shrimp)", "Soya", "Sulphites"], other_allergens: ["Candle nut", "Garlic"], cross_contact_note: "Candle nut is not one of the regulated 14 but must still be declared to any guest reporting a nut allergy.", source_note: MATRIX_NOTE },
  { dish_name: "Homemade Chilli Sauce", dish_kind: "sauce", regulated_allergens: ["Soya", "Sulphites", "Cereals containing gluten"], other_allergens: ["Garlic"], source_note: MATRIX_NOTE },
  { dish_name: "House Chilli Oil", dish_kind: "sauce", regulated_allergens: [], other_allergens: [], availability_note: "Appears in the October 2024 ingredient list only. Allergens not recorded in the current matrix extract.", source_note: "Older October 2024 ingredient list (historical support only)." },
  { dish_name: "Wine", dish_kind: "drink", regulated_allergens: ["Sulphur dioxide and sulphites"], other_allergens: [], source_note: MATRIX_NOTE },
  { dish_name: "Tiger, Asahi and Sapporo beer", dish_kind: "drink", regulated_allergens: ["Cereals containing gluten (barley malt)"], other_allergens: [], source_note: MATRIX_NOTE },
];

export interface DraftStatement {
  /** Stable reference so a proposal can be matched to the lesson it affects. */
  target_ref: string;
  target_label: string;
  proposed_text: string;
  source_note: string;
}

export const DRAFT_LESSON_STATEMENTS: DraftStatement[] = [
  {
    target_ref: "regulated-14",
    target_label: "Lesson: the 14 regulated allergens",
    proposed_text:
      "Fourteen allergens must be declared: celery; cereals containing gluten (wheat, rye, barley, oats); crustaceans; eggs; fish; lupin; milk; molluscs; mustard; peanuts; sesame; soya; sulphur dioxide and sulphites; tree nuts (almond, hazelnut, walnut, Brazil nut, cashew, pecan, pistachio, macadamia). Coconut, pine nuts and chestnuts are not automatically covered by the legal tree-nut list, but any declared allergy must still be recorded and managed.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 2.`,
  },
  {
    target_ref: "outside-14",
    target_label: "Lesson: allergies outside the regulated 14",
    proposed_text:
      "Guests can react to foods outside the 14, including garlic, onion and mushrooms. Record the guest's own words, check the ingredients properly, and never force a request into the regulated list.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 2 and 'Allergies outside the regulated 14'.`,
  },
  {
    target_ref: "peanuts-vs-tree-nuts",
    target_label: "Lesson: peanuts and tree nuts are separate allergens",
    proposed_text:
      "Peanuts are legumes, not tree nuts. If a guest says 'nut allergy', ask: 'Does this include tree nuts, peanuts, or both?' Record the answer exactly in the till and on a freshly printed kitchen ticket. Never assume a tree-nut allergy includes peanuts, or the reverse.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, 'Peanuts and tree nuts are different allergens'.`,
  },
  {
    target_ref: "satay-peanuts",
    target_label: "Lesson: Satay Chicken",
    proposed_text:
      "Satay Chicken contains peanuts. It does not contain tree nuts under the current approved recipe and matrix.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}; ${UD_MATRIX_REFERENCE}.`,
  },
  {
    target_ref: "tempura-garnish",
    target_label: "Lesson: Tempura Aubergine peanut garnish",
    proposed_text:
      "The peanut garnish on Tempura Aubergine may be omitted only when the allergy is declared before preparation and the dish has not been contaminated. Once peanuts have touched the dish, removing them does not make it safe — discard and remake it.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}; ${UD_MATRIX_REFERENCE}.`,
  },
  {
    target_ref: "remake-rule",
    target_label: "Lesson: full remake when an allergen has touched a dish",
    proposed_text:
      "Cooking does not reliably remove an allergen and a visible ingredient can be removed without making the dish safe. If a declared allergen has touched a dish, stop, discard it and remake it through the safe process.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 4.`,
  },
  {
    target_ref: "nutella-nuts",
    target_label: "Lesson: Nutella dessert",
    proposed_text:
      "Nutella contains hazelnut and Ugly Dumpling adds mixed nuts to the dessert. The current matrix records both peanuts and tree nuts. Staff must never describe it as 'hazelnut only'.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}; ${UD_MATRIX_REFERENCE}.`,
  },
  {
    target_ref: "shared-fryer",
    target_label: "Lesson: shared dessert fryer",
    proposed_text:
      "Sweet dumplings are fried in the same fryer, and nut ingredients and toppings are handled within the dessert process, so every fried dessert carries peanut and tree-nut cross-contact risk. Explain this before the guest orders. No dessert may be described as peanut-free, nut-free or suitable for a severe peanut or tree-nut allergy unless a separately validated process removes the shared-fryer risk.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, 'Shared dessert fryer'.`,
  },
  {
    target_ref: "shared-equipment",
    target_label: "Lesson: shared oils, equipment, utensils, surfaces and areas",
    proposed_text:
      "Oils, fryers, equipment, utensils, surfaces and preparation areas are shared. Cross-contact must be controlled by separation, cleaning and dedicated equipment before any free-from claim is made; if the kitchen cannot control it, do not make the claim and explain the limitation.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 4.`,
  },
  {
    target_ref: "gf-equipment",
    target_label: "Lesson: gluten-free equipment, black plates and ramekins",
    proposed_text:
      "Gluten-free equipment, black plates and ramekins identify the gluten-free control route. They do not by themselves make food safe: all other ingredient and cross-contact checks still apply. For gluten-free dumplings the standard soy or hoisin sauce is replaced with the approved gluten-free version.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 4 and matrix note.`,
  },
  {
    target_ref: "ask-every-table",
    target_label: "Lesson: ask every table",
    proposed_text:
      "Ask every table about allergies before the order is taken, and repeat the question for desserts, sides and any later order.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5.`,
  },
  {
    target_ref: "record-exact-detail",
    target_label: "Lesson: recording the allergy",
    proposed_text:
      "Record the exact allergen, which guest it affects and which dishes are affected — not just 'allergy on table'.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5.`,
  },
  {
    target_ref: "pos-tags",
    target_label: "Lesson: till allergy tags and same-table controls",
    proposed_text:
      "Use the till allergy tag for the affected guest and items, and the same-table 'no allergy' control for the other guests, so the kitchen can see exactly which covers are affected.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5.`,
  },
  {
    target_ref: "fresh-ticket",
    target_label: "Lesson: fresh kitchen ticket after any change",
    proposed_text:
      "Print a fresh kitchen ticket after any change to an order. Handwritten allergen additions to a printed ticket are never permitted.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5.`,
  },
  {
    target_ref: "acknowledgement",
    target_label: "Lesson: kitchen, FOH and manager acknowledgement",
    proposed_text:
      "An allergy order must be acknowledged verbally by the kitchen, by the server and by the manager on duty. Never rely on a silent ticket alone.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5 stage table.`,
  },
  {
    target_ref: "emergency-response",
    target_label: "Lesson: emergency response and suspected anaphylaxis",
    proposed_text:
      "If a reaction is suspected: stop service to that guest, call for the manager, call 999 for suspected anaphylaxis, help the guest use their own adrenaline auto-injector, keep them still, and preserve the ticket, labels, recipe details and incident record. Report near misses even when nothing reached the guest.",
    source_note: `${UD_COURSE_DOCUMENT_TITLE}, emergency lesson; NHS anaphylaxis guidance.`,
  },
];

export interface DraftQuestion {
  target_ref: string;
  question: string;
  required_answer: string;
  critical: boolean;
  /** When set, the question is dish-specific and only scored where that dish is live. */
  dish_name?: string;
  source_note: string;
}

export const DRAFT_QUESTIONS: DraftQuestion[] = [
  { target_ref: "q-allergy-serious", question: "Which statement is correct?", required_answer: "An allergy can be serious even with a very small amount.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q1.` },
  { target_ref: "q-how-many", question: "How many allergens must be declared under the UK rules covered in this course?", required_answer: "14", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q2.` },
  { target_ref: "q-unsure-sauce", question: "You are unsure whether a sauce contains sesame. What must you do?", required_answer: "Stop, check the approved information and escalate — never guess.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q4.` },
  { target_ref: "q-nut-question", question: "A guest says they have a 'nut allergy'. What must you ask?", required_answer: "Whether it includes tree nuts, peanuts or both, and record the answer exactly.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, peanuts and tree nuts.` },
  { target_ref: "q-outside-14", question: "A guest reports a garlic allergy. How is it handled?", required_answer: "Record it in the guest's own words and manage it with the same care as a regulated allergen.", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, allergies outside the 14.` },
  { target_ref: "q-topping-removed", question: "A topping containing the declared allergen is placed on a finished dish. Is removing it enough?", required_answer: "No — stop and remake the dish using the safe process.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q27.` },
  { target_ref: "q-gf-plates", question: "What do gluten-free equipment, black plates and ramekins do?", required_answer: "They identify the gluten-free control route but do not by themselves make food safe.", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q14.` },
  { target_ref: "q-ticket-change", question: "An allergy is declared after the ticket has printed. What must happen?", required_answer: "Print a fresh kitchen ticket. Never write the allergen on the printed ticket by hand.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, Lesson 5.` },
  { target_ref: "q-missed-check", question: "An allergy dish reaches the pass without the required check. What happens next?", required_answer: "Stop it and complete the check, or remake it.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q15.` },
  { target_ref: "q-delivery", question: "How should an allergy dish reach the guest?", required_answer: "Directly, by an informed server, to the identified guest — never auctioned or passed via another guest.", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q16.` },
  { target_ref: "q-near-miss", question: "A near miss that did not reach the customer should be:", required_answer: "Reported and recorded so controls can improve.", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q17.` },
  { target_ref: "q-anaphylaxis", question: "What is the immediate response to suspected anaphylaxis?", required_answer: "Call 999, call the manager, help the guest use their own auto-injector, keep them still and preserve the evidence.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, emergency lesson.` },
  { target_ref: "q-records", question: "Which records should be preserved after a suspected reaction?", required_answer: "The relevant ticket, labels, recipe details and the incident record.", critical: false, source_note: `${UD_COURSE_DOCUMENT_TITLE}, assessment q28.` },
  { target_ref: "q-satay", dish_name: "Satay Chicken", question: "Is Satay Chicken suitable for a guest with a tree-nut allergy?", required_answer: "It contains peanuts, not tree nuts, under the current recipe and matrix — but the allergy must be checked against the current matrix and cross-contact controls before any assurance is given.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, menu question bank.` },
  { target_ref: "q-tempura", dish_name: "Tempura Aubergine", question: "Can the peanut garnish be removed from a finished Tempura Aubergine?", required_answer: "No. If it has touched the dish, discard and remake. It may only be omitted through the declared-allergy process before preparation.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, menu question bank.` },
  { target_ref: "q-nutella", dish_name: "Nutella sweet dumpling", question: "How must the Nutella dessert be described to a guest reporting a nut allergy?", required_answer: "As containing both peanuts and tree nuts — never as 'hazelnut only'.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, menu question bank.` },
  { target_ref: "q-fried-dessert", dish_name: "Apple Pie", question: "Why may Apple Pie or another fried dessert be unsuitable for a peanut or tree-nut allergy?", required_answer: "Because it is fried in the shared dessert fryer, which carries peanut and tree-nut cross-contact risk.", critical: true, source_note: `${UD_COURSE_DOCUMENT_TITLE}, menu question bank.` },
];

export const DRAFT_PRACTICAL_SIGNOFF: DraftStatement[] = [
  { target_ref: "practical-ask", target_label: "Practical sign-off: asks every table about allergies", proposed_text: "Observed asking every table about allergies before taking the order.", source_note: `${UD_COURSE_DOCUMENT_TITLE}, practical observation.` },
  { target_ref: "practical-record", target_label: "Practical sign-off: records the exact allergen, guest and dishes", proposed_text: "Observed recording the exact allergen, the affected guest and the affected dishes in the till.", source_note: `${UD_COURSE_DOCUMENT_TITLE}, practical observation.` },
  { target_ref: "practical-ticket", target_label: "Practical sign-off: fresh ticket and acknowledgement", proposed_text: "Observed printing a fresh ticket after a change and obtaining kitchen, FOH and manager acknowledgement.", source_note: `${UD_COURSE_DOCUMENT_TITLE}, practical observation.` },
  { target_ref: "practical-uncertain", target_label: "Practical sign-off: handling uncertain information", proposed_text: "Explains what to do when ingredient information is uncertain: stop, check and escalate.", source_note: `${UD_COURSE_DOCUMENT_TITLE}, practical observation.` },
  { target_ref: "practical-emergency", target_label: "Practical sign-off: suspected anaphylaxis", proposed_text: "Explains the immediate response to suspected anaphylaxis.", source_note: `${UD_COURSE_DOCUMENT_TITLE}, practical observation.` },
];
