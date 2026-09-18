/**
 * Ugly Dumpling Allergen Safety — controlled question bank (draft, Phase 1).
 *
 * Machine-markable questions only. Each one carries its wording, type, options,
 * correct answer(s), explanation, source references, critical-safety flag, the
 * lesson it belongs to, the flavour it concerns (where relevant) and whether it
 * is limited to flavours on the branch's current customer menu.
 *
 * The fifteen mandatory critical-safety questions required by management are
 * flagged `critical: true`. Flavour questions are filtered at runtime: nothing
 * unconfirmed, excluded or off-menu can ever be scored.
 */

import type { AllergenQuestion } from "@/lib/allergen-course";

const o = (...texts: string[]) => texts.map((text, i) => ({ id: `o${i + 1}`, text }));

export const ALLERGEN_QUESTION_BANK: AllergenQuestion[] = [
  /* ── Critical 1 — peanuts and tree nuts are separate ── */
  {
    id: "q-crit-01",
    type: "single",
    critical: true,
    lesson_ref: "l04-peanuts-tree-nuts",
    prompt: "How do peanuts and tree nuts sit within the 14 regulated allergens?",
    options: o(
      "They are two separate regulated allergens",
      "They are one combined 'nuts' allergen",
      "Only tree nuts are regulated; peanuts are not",
      "Only peanuts are regulated; tree nuts are not",
    ),
    correct: ["o1"],
    explanation:
      "Peanuts and tree nuts are two separate entries on the regulated list. Treating them as one group leads to both unsafe serving and needless refusals.",
    sources: ["eu-reg-1169", "matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 2 — clarifying a "nut allergy" ── */
  {
    id: "q-crit-02",
    type: "single",
    critical: true,
    lesson_ref: "l04-peanuts-tree-nuts",
    prompt: "A guest says they have a 'nut allergy'. What must you do first?",
    options: o(
      "Ask whether they mean tree nuts, peanuts or both, and record their answer",
      "Assume both and refuse anything from the dessert section",
      "Assume peanuts, because that is the most common",
      "Recommend a dish you believe has no nuts in it",
    ),
    correct: ["o1"],
    explanation:
      "'Nut allergy' is not specific enough to act on. Clarify tree nuts, peanuts or both, and record exactly what the guest said.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 3 — Satay Chicken (flavour-specific) ── */
  {
    id: "q-crit-03",
    type: "single",
    critical: true,
    lesson_ref: "l11-satay-peanut",
    flavour: "Satay Chicken",
    prompt: "Under the approved recipe and the approved matrix, what does Satay Chicken declare?",
    options: o(
      "Peanuts, but not tree nuts",
      "Tree nuts, but not peanuts",
      "Both peanuts and tree nuts",
      "Neither peanuts nor tree nuts",
    ),
    correct: ["o1"],
    explanation:
      "Satay Chicken contains peanuts and does not contain tree nuts. It is never offered to a guest with a peanut allergy, whatever way the sauce is served.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: true,
    active: true,
  },
  /* ── Critical 4 — never guess or rely on memory ── */
  {
    id: "q-crit-04",
    type: "single",
    critical: true,
    lesson_ref: "l01-allergies-intolerances",
    prompt: "You are fairly sure a dish has no sesame in it, but you have not checked today. What do you do?",
    options: o(
      "Check the approved matrix and full ingredient information, and ask the manager and kitchen",
      "Tell the guest it is sesame-free, since you have served it many times",
      "Tell the guest you cannot help and move on",
      "Ask another server what they remember",
    ),
    correct: ["o1"],
    explanation:
      "Memory is not a source. Recipes and suppliers change, so you check the approved information and escalate any doubt before advising a guest.",
    sources: ["ud-allergy-procedure", "matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 5 — record exact allergen and affected guest ── */
  {
    id: "q-crit-05",
    type: "multi",
    critical: true,
    lesson_ref: "l06-receiving-declaration",
    prompt: "What must the order record contain when a guest declares an allergy? Choose all that apply.",
    options: o(
      "Which guest at the table is affected",
      "The precise allergen, in the guest's own words",
      "Only the words 'table has an allergy'",
      "Whether the guest looks unwell",
    ),
    correct: ["o1", "o2"],
    explanation:
      "The record must identify the affected guest and name the exact allergen. A general table note cannot be acted on safely.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 6 — which dishes that guest will eat ── */
  {
    id: "q-crit-06",
    type: "single",
    critical: true,
    lesson_ref: "l06-receiving-declaration",
    prompt: "Besides the allergen and the affected guest, what else must be recorded?",
    options: o(
      "Which dishes that guest will eat",
      "How many guests are at the table",
      "The time the order was taken",
      "The server's initials only",
    ),
    correct: ["o1"],
    explanation:
      "The kitchen needs to know which specific dishes belong to the affected guest so those dishes are prepared and plated under the allergy procedure.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 7 — repeat for desserts, sides, later orders ── */
  {
    id: "q-crit-07",
    type: "single",
    critical: true,
    lesson_ref: "l06-receiving-declaration",
    prompt: "The mains are cleared and the same table now orders desserts and extra sides. What applies?",
    options: o(
      "The full allergy process is repeated for the new order",
      "The earlier allergy note covers everything for the rest of the visit",
      "Desserts do not need checking because they are pre-made",
      "Only the manager needs to be told, nothing needs recording",
    ),
    correct: ["o1"],
    explanation:
      "The allergy process repeats for desserts, sides, sauces and every later round. It does not stop applying after the mains.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 8 — fresh printed ticket after any change ── */
  {
    id: "q-crit-08",
    type: "single",
    critical: true,
    lesson_ref: "l07-pos-recording",
    prompt: "An allergy-related change is made to an order that is already with the kitchen. What must happen?",
    options: o(
      "A fresh kitchen ticket is printed for the changed order",
      "The change is called out and the old ticket is kept",
      "The change is written on the existing ticket",
      "The kitchen updates the ticket themselves at the pass",
    ),
    correct: ["o1"],
    explanation:
      "Any allergy-related change means a fresh printed ticket. The kitchen works from the printed ticket, not from a verbal patch.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 9 — no handwritten allergen additions ── */
  {
    id: "q-crit-09",
    type: "single",
    critical: true,
    lesson_ref: "l07-pos-recording",
    prompt: "Is it acceptable to write an allergen instruction by hand on a printed kitchen ticket?",
    options: o(
      "No — handwritten allergen additions are prohibited",
      "Yes, if it is written clearly in capitals",
      "Yes, if the manager initials it",
      "Yes, when the kitchen is very busy",
    ),
    correct: ["o1"],
    explanation:
      "Handwritten allergen additions are prohibited without exception. The allergy is tagged in the till and a fresh ticket is printed.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 10 — three-way acknowledgement ── */
  {
    id: "q-crit-10",
    type: "multi",
    critical: true,
    lesson_ref: "l08-communication",
    prompt: "Who must acknowledge an allergy order before it is prepared and served? Choose all that apply.",
    options: o("The kitchen", "The front-of-house server handling the table", "The manager on duty", "Nobody, if the ticket is printed"),
    correct: ["o1", "o2", "o3"],
    explanation:
      "The kitchen, the server and the manager all acknowledge the allergy verbally. Silence is not acknowledgement.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 11 — discard and remake ── */
  {
    id: "q-crit-11",
    type: "scenario",
    critical: true,
    lesson_ref: "l09-cross-contact",
    prompt:
      "A peanut garnish has already been added to a dish before the peanut allergy reached the kitchen. What must happen to that dish?",
    options: o(
      "Discard it and remake it from clean components",
      "Remove the visible peanuts and serve it",
      "Rinse the dish and serve it to the same guest",
      "Serve it to a different guest at the table and remake only if asked",
    ),
    correct: ["o1"],
    explanation:
      "Once the allergen has touched the food the dish is discarded and remade. Staff never pick the peanuts off and serve the same dish.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 12 — Nutella declaration (flavour-specific) ── */
  {
    id: "q-crit-12",
    type: "multi",
    critical: true,
    lesson_ref: "l13-nutella-fryer",
    flavour: "Nutella",
    prompt: "What is true of the Nutella dessert under the approved matrix? Choose all that apply.",
    options: o(
      "Nutella contains hazelnut",
      "Ugly Dumpling adds mixed nuts to the dessert",
      "The matrix records both peanuts and tree nuts for it",
      "It may be described as nut-free if the nuts are left off",
    ),
    correct: ["o1", "o2", "o3"],
    explanation:
      "Nutella contains hazelnut, we add mixed nuts, and the approved matrix records both peanuts and tree nuts for this dessert. It is never described as nut-free.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: true,
    active: true,
  },
  /* ── Critical 13 — shared dessert fryer ── */
  {
    id: "q-crit-13",
    type: "single",
    critical: true,
    lesson_ref: "l13-nutella-fryer",
    prompt: "A guest with a severe peanut allergy asks whether a fried sweet dumpling is safe. What is correct?",
    options: o(
      "Explain that all sweet dumplings share the same fryer and carry peanut and tree-nut cross-contact risk, and involve the manager",
      "Say it is fine because that flavour has no nuts in the recipe",
      "Say it is nut-free as long as the kitchen changes gloves",
      "Offer it without comment because the guest chose it",
    ),
    correct: ["o1"],
    explanation:
      "All sweet dumplings share the same fryer, so every fried dessert carries peanut and tree-nut cross-contact risk and must not be described as nut-free or suitable for a severe nut allergy.",
    sources: ["matrix-jul-2026", "ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 14 — ingredients outside the 14 ── */
  {
    id: "q-crit-14",
    type: "single",
    critical: true,
    lesson_ref: "l03-outside-the-14",
    prompt: "A guest reacts to garlic, onion and mushrooms. What must you rely on?",
    options: o(
      "The full recipe and ingredient information for every dish they are considering",
      "The 14-allergen matrix alone, as it covers all allergens",
      "Your own knowledge of the menu",
      "The dish descriptions on the customer menu",
    ),
    correct: ["o1"],
    explanation:
      "Ingredients outside the regulated 14 can still cause reactions and never appear on the matrix. You must check full recipes and ingredient information.",
    sources: ["matrix-jul-2026", "ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  /* ── Critical 15 — 999 immediately ── */
  {
    id: "q-crit-15",
    type: "single",
    critical: true,
    lesson_ref: "l15-anaphylaxis",
    prompt: "A guest's lips are swelling and they are struggling to breathe after eating. What is the first action?",
    options: o(
      "Call 999 immediately and say you suspect anaphylaxis",
      "Wait a few minutes to see whether it settles",
      "Take the guest outside for air and watch them",
      "Offer water and find the manager before calling anyone",
    ),
    correct: ["o1"],
    explanation:
      "Suspected anaphylaxis means calling 999 immediately. Help with the guest's own auto-injector, keep them still, tell the manager and keep the food, packaging and ticket.",
    sources: ["nhs-anaphylaxis", "ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },

  /* ── Supporting questions (not critical) ── */
  {
    id: "q-gen-01",
    type: "single",
    critical: false,
    lesson_ref: "l02-regulated-14",
    prompt: "How many allergens must be declared under the regulated list?",
    options: o("14", "10", "8", "16"),
    correct: ["o1"],
    explanation: "Fourteen allergens must be declared, with peanuts and tree nuts counted separately.",
    sources: ["eu-reg-1169"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-02",
    type: "single",
    critical: false,
    lesson_ref: "l02-regulated-14",
    prompt: "What does the approved matrix record about molluscs in our dumplings?",
    options: o(
      "None of our dumplings contain molluscs",
      "All seafood dumplings contain molluscs",
      "Molluscs are not a regulated allergen",
      "Only the Brixton menu contains molluscs",
    ),
    correct: ["o1"],
    explanation: "The matrix states that none of our dumplings contain molluscs. Every other check still applies.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-03",
    type: "single",
    critical: false,
    lesson_ref: "l10-gluten-free",
    prompt: "Which sauce is served with the gluten-free dumplings?",
    options: o(
      "The approved gluten-free soy or hoisin sauce",
      "The standard soy sauce, served on the side",
      "No sauce is permitted at all",
      "Whichever sauce the guest prefers",
    ),
    correct: ["o1"],
    explanation:
      "Gluten-free dumplings use the approved gluten-free soy or hoisin sauce, and every other ingredient and cross-contact check still applies.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-04",
    type: "single",
    critical: false,
    lesson_ref: "l03-outside-the-14",
    prompt: "A guest asks about nuts and the dish contains candlenut. What is correct?",
    options: o(
      "Disclose the candlenut, check the full ingredient and supplier information, and escalate the nut enquiry",
      "Say it contains tree nuts, because candlenut is a tree nut on the regulated list",
      "Say it is nut-free, because candlenut is not on the regulated list",
      "Leave it out of the conversation entirely",
    ),
    correct: ["o1"],
    explanation:
      "Candlenut is not one of the regulated tree nuts, but it can still cause a reaction. It must be disclosed, checked and escalated.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-05",
    type: "single",
    critical: false,
    lesson_ref: "l10-gluten-free",
    prompt: "Why are allergy dishes plated on the black plates?",
    options: o(
      "So the pass and the server can see at a glance which plate belongs to the affected guest",
      "Because the food looks better on them",
      "To show the dish was cooked last",
      "Because gluten-free dishes must be a different colour by law",
    ),
    correct: ["o1"],
    explanation: "The black plate is a visual control: it identifies the allergy dish through plating, the pass and service.",
    sources: ["ud-allergy-procedure"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-06",
    type: "scenario",
    critical: false,
    lesson_ref: "l14-takeaway-delivery",
    prompt: "A delivery order arrives with 'severe dairy allergy' in the notes. What do you do?",
    options: o(
      "Follow the full allergy procedure, tag it, print a fresh ticket, pack it separately and mark it clearly",
      "Treat it as a preference, since the guest is not in the restaurant",
      "Remove the cheese and send the rest without telling the kitchen",
      "Cancel the order automatically",
    ),
    correct: ["o1"],
    explanation: "Delivery and collection orders carry the same duty as a table: tag, print, acknowledge, pack separately and mark clearly.",
    sources: ["ud-allergy-procedure", "ppds-natashas-law"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-07",
    type: "single",
    critical: false,
    lesson_ref: "l16-near-misses",
    prompt: "A wrong plate is caught at the pass before it reaches an allergy guest. What happens next?",
    options: o(
      "It is reported to the manager the same shift as a near miss",
      "Nothing, because no harm was done",
      "It is mentioned at the next month's meeting",
      "The server involved is written up before anything is recorded",
    ),
    correct: ["o1"],
    explanation: "Near misses are reported the same shift so the process can be fixed. Honest reporting is never punished.",
    sources: ["ud-allergy-procedure", "fsa-allergen-guidance"],
    requires_current_menu: false,
    active: true,
  },
  {
    id: "q-gen-08",
    type: "single",
    critical: false,
    lesson_ref: "l05-flavours-ingredients",
    prompt: "A supplier label shows an allergen the approved matrix does not list. What do you do?",
    options: o(
      "Flag it to the manager so it can be checked and recorded",
      "Ignore it, because the matrix has the highest authority",
      "Change the matrix yourself",
      "Stop selling every dish on the menu",
    ),
    correct: ["o1"],
    explanation:
      "The matrix controls the current declaration, but a supplier label showing extra allergens is flagged for review, never ignored and never silently overruled.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: false,
    active: true,
  },

  /* ── Flavour-specific supporting questions (branch filtered at runtime) ── */
  {
    id: "q-fla-01",
    type: "single",
    critical: false,
    lesson_ref: "l05-flavours-ingredients",
    flavour: "Prawn & Chive",
    prompt: "Which regulated allergen group must always be declared for Prawn & Chive?",
    options: o("Crustaceans", "Molluscs", "Lupin", "Peanuts"),
    correct: ["o1"],
    explanation: "Prawn is a crustacean and is declared as such under the approved matrix.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: true,
    active: true,
  },
  {
    id: "q-fla-02",
    type: "single",
    critical: false,
    lesson_ref: "l05-flavours-ingredients",
    flavour: "Curry Goat",
    prompt: "At which site is Curry Goat on the current customer menu?",
    options: o("Brixton only", "Carnaby only", "All three sites", "Fitzrovia only"),
    correct: ["o1"],
    explanation: "Curry Goat appears only on the Brixton July 2026 customer menu.",
    sources: ["ud-menu-jul-2026"],
    requires_current_menu: true,
    active: true,
  },
  {
    id: "q-fla-03",
    type: "single",
    critical: false,
    lesson_ref: "l05-flavours-ingredients",
    flavour: "Lamb & Harissa",
    prompt: "At which sites is Lamb & Harissa sold?",
    options: o("Carnaby and Fitzrovia", "Brixton only", "All three sites", "Brixton and Carnaby"),
    correct: ["o1"],
    explanation: "Lamb & Harissa is on the Carnaby and Fitzrovia menus, not Brixton.",
    sources: ["ud-menu-jul-2026"],
    requires_current_menu: true,
    active: true,
  },
  {
    id: "q-fla-04",
    type: "single",
    critical: false,
    lesson_ref: "l13-nutella-fryer",
    flavour: "Biscoff Banana",
    prompt: "A Brixton guest with a severe tree-nut allergy asks about Biscoff Banana dumplings. What must you say?",
    options: o(
      "They are fried in the shared dessert fryer, so peanut and tree-nut cross-contact risk applies",
      "They are nut-free because the recipe has no nuts",
      "They are safe if plated on a black plate",
      "They cannot be ordered at Brixton",
    ),
    correct: ["o1"],
    explanation:
      "Every fried sweet dumpling shares the dessert fryer, so cross-contact risk from peanuts and tree nuts applies and it cannot be called nut-free.",
    sources: ["matrix-jul-2026", "ud-menu-jul-2026"],
    requires_current_menu: true,
    active: true,
  },

  /* ── Questions deliberately held inactive until evidence is approved ── */
  {
    id: "q-hold-tempura",
    type: "single",
    critical: false,
    lesson_ref: "l12-tempura-garnish",
    flavour: "Tempura Aubergine",
    prompt: "Does the Tempura Aubergine batter contain a cereal containing gluten?",
    options: o("Yes", "No", "Only at Brixton", "Not recorded"),
    correct: ["o4"],
    explanation:
      "Held back deliberately: the batter recipe, supplier specification and fryer cross-contact are not yet approved, so this cannot be scored.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: true,
    active: false,
  },
  {
    id: "q-hold-corn-fritters",
    type: "single",
    critical: false,
    lesson_ref: "l05-flavours-ingredients",
    flavour: "Corn Fritters",
    prompt: "Does the Corn Fritters batter contain a cereal containing gluten?",
    options: o("Yes", "No", "Only at Brixton", "Not recorded"),
    correct: ["o4"],
    explanation: "Held back deliberately: batter recipe, packaging, supplier specification and fryer procedure outstanding.",
    sources: ["matrix-jul-2026"],
    requires_current_menu: true,
    active: false,
  },
];

export const CRITICAL_QUESTION_COUNT = ALLERGEN_QUESTION_BANK.filter((q) => q.critical).length;
