/**
 * Ugly Dumpling Allergen Safety — the 16 learner lessons (draft, Phase 1).
 *
 * Built from published allergen course version 1, the approved July 2026
 * allergen matrix, the 26 confirmed flavour records, the approved shared
 * dessert-fryer wording, the approved peanut and tree-nut distinction and the
 * approved operational procedures. Every section names its sources.
 *
 * Nothing here is available to staff: the module sits in management review.
 */

import type { AllergenLesson } from "@/lib/allergen-course";
import { APPROVED_WORDING, REGULATED_14, REGULATED_TREE_NUTS } from "./allergen-course-sources";

export const ALLERGEN_SAFETY_LESSONS: AllergenLesson[] = [
  {
    ref: "l01-allergies-intolerances",
    order: 1,
    title: "Food allergies and intolerances",
    summary: "What an allergy is, how it differs from an intolerance, and why a small trace matters.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l01-s1",
        heading: "What happens in an allergic reaction",
        mandatory: true,
        sources: ["fsa-allergen-guidance", "nhs-anaphylaxis"],
        paragraphs: [
          "A food allergy is the immune system reacting to a food it treats as a threat. Reactions can start within minutes and can involve the skin, the stomach, breathing or blood pressure.",
          "A tiny trace can be enough. A guest with a severe peanut allergy can react to peanut that arrived on a serving spoon, in frying oil or on a plate that was not properly washed.",
        ],
        example:
          "A guest orders a dessert and mentions a peanut allergy. The dessert itself contains no peanut, but it is fried in the same fryer as peanut-containing desserts. That is a real risk and must be declared, not brushed off.",
      },
      {
        ref: "l01-s2",
        heading: "Intolerance is different — and still ours to handle properly",
        mandatory: true,
        sources: ["fsa-allergen-guidance"],
        paragraphs: [
          "An intolerance, such as to lactose, is uncomfortable rather than life-threatening. It is not an immune reaction.",
          "We never decide which one a guest has. We take every request seriously, record exactly what they told us, and give accurate information.",
        ],
      },
      {
        ref: "l01-s3",
        heading: "Never guess",
        mandatory: true,
        sources: ["ud-allergy-procedure", "matrix-jul-2026"],
        paragraphs: [
          "If you are not certain, you check the approved allergen matrix and the full ingredient information, and you ask the manager and the kitchen.",
          "Memory is not a source. Recipes and suppliers change. The approved matrix and the current ingredient information are the only things you rely on.",
        ],
      },
    ],
  },
  {
    ref: "l02-regulated-14",
    order: 2,
    title: "The 14 regulated allergens",
    summary: "The 14 allergens the law requires us to declare, and what that duty means in service.",
    estimated_minutes: 7,
    mandatory: true,
    sections: [
      {
        ref: "l02-s1",
        heading: "The list",
        mandatory: true,
        sources: ["eu-reg-1169", "fsa-allergen-guidance"],
        paragraphs: [
          `The 14 are: ${REGULATED_14.join(", ")}.`,
          "Peanuts and tree nuts are two separate entries on that list. They are not one 'nuts' group.",
        ],
      },
      {
        ref: "l02-s2",
        heading: "Our duty in the restaurant",
        mandatory: true,
        sources: ["eu-reg-1169", "ppds-natashas-law"],
        paragraphs: [
          "We must be able to tell a guest, accurately, whether a dish contains any of the 14. That information must come from the approved matrix and current ingredient information.",
          "Anything we pack ahead for direct sale must carry the food name and the full ingredient list with the 14 emphasised.",
        ],
      },
      {
        ref: "l02-s3",
        heading: "What the matrix says about our dumplings",
        mandatory: true,
        sources: ["matrix-jul-2026"],
        paragraphs: [APPROVED_WORDING.molluscs_and_gf_sauce],
        example:
          "A guest asks for gluten-free. The gluten-free dumplings are served with the approved gluten-free soy or hoisin sauce — and you still check every other ingredient and every cross-contact point before you promise anything.",
      },
    ],
  },
  {
    ref: "l03-outside-the-14",
    order: 3,
    title: "Allergies outside the regulated 14",
    summary: "Garlic, onion, mushrooms, candlenut and others: real reactions that the 14-allergen chart will not show.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l03-s1",
        heading: "The chart is not the whole story",
        mandatory: true,
        sources: ["matrix-jul-2026", "ud-allergy-procedure"],
        paragraphs: [
          "Garlic, onion, mushrooms, coriander, chilli and many other ingredients can cause allergies or intolerances. None of them appear on the 14-allergen matrix.",
          "When a guest names something outside the 14, you must check the full recipe and ingredient list, not just the matrix.",
        ],
        example:
          "A guest says they react badly to garlic. The matrix has no garlic column, so you check the full recipe for every dish they are considering, with the kitchen, before you advise them.",
      },
      {
        ref: "l03-s2",
        heading: "Candlenut in Laksa Soup",
        mandatory: true,
        sources: ["matrix-jul-2026", "ud-allergy-procedure"],
        paragraphs: [APPROVED_WORDING.candlenut],
      },
    ],
  },
  {
    ref: "l04-peanuts-tree-nuts",
    order: 4,
    title: "Peanuts and tree nuts",
    summary: "Two separate allergens, and the question you must always ask.",
    estimated_minutes: 7,
    mandatory: true,
    sections: [
      {
        ref: "l04-s1",
        heading: "Separate allergens",
        mandatory: true,
        sources: ["eu-reg-1169", "matrix-jul-2026"],
        paragraphs: [
          "Peanuts are a legume. Tree nuts are a different regulated group.",
          `The regulated tree nuts are: ${REGULATED_TREE_NUTS.join(", ")}. Candlenut is not one of them, which is exactly why it still needs to be disclosed and escalated.`,
        ],
      },
      {
        ref: "l04-s2",
        heading: "Always clarify a 'nut allergy'",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "When a guest says 'nut allergy', you ask whether they mean tree nuts, peanuts or both. You then record exactly what they said.",
          "Guessing either way is dangerous: assuming peanuts only can serve them a cashew dish; assuming both can needlessly refuse food that is safe for them.",
        ],
        example:
          "\"May I check — is that peanuts, tree nuts such as cashews and almonds, or both?\" The answer goes into the order note word for word.",
      },
      {
        ref: "l04-s3",
        heading: "Satay Chicken",
        mandatory: true,
        sources: ["matrix-jul-2026"],
        paragraphs: [
          "Under the approved recipe and the approved matrix, Satay Chicken contains peanuts and does not contain tree nuts.",
          "That distinction only helps if the guest's allergen has been clarified first. If they have not told you which, you do not serve it on assumption.",
        ],
      },
    ],
  },
  {
    ref: "l05-flavours-ingredients",
    order: 5,
    title: "Ugly Dumpling flavours and ingredients",
    summary: "Where the approved information lives and how availability differs by site.",
    estimated_minutes: 8,
    mandatory: true,
    sections: [
      {
        ref: "l05-s1",
        heading: "The approved matrix is the current declaration",
        mandatory: true,
        sources: ["matrix-jul-2026"],
        paragraphs: [
          "The approved July 2026 matrix is the highest authority for what a dish currently declares. Management has confirmed 26 flavour records against it.",
          "If a supplier label shows an allergen the matrix does not, you flag it to the manager. You never ignore it and you never quietly overrule the matrix yourself.",
        ],
      },
      {
        ref: "l05-s2",
        heading: "Not every flavour is sold at every site",
        mandatory: true,
        sources: ["ud-menu-jul-2026"],
        paragraphs: [
          "Curry Goat and Biscoff Banana are Brixton only. Lamb & Harissa is Carnaby and Fitzrovia only.",
          "The menus tell us what a site sells. They never tell us what a dish contains — that is the matrix and the recipe.",
        ],
      },
      {
        ref: "l05-s3",
        heading: "Components count too",
        mandatory: true,
        sources: ["matrix-jul-2026", "ud-allergy-procedure"],
        paragraphs: [
          "Homemade Chilli Sauce is not sold on its own, but its ingredients still count whenever it forms part of another dish.",
          "Sauces, garnishes, dressings and oils all carry allergens. Check the dish as it will actually be served.",
        ],
      },
    ],
  },
  {
    ref: "l06-receiving-declaration",
    order: 6,
    title: "Receiving an allergy declaration",
    summary: "Asking, listening and capturing the detail precisely.",
    estimated_minutes: 7,
    mandatory: true,
    sections: [
      {
        ref: "l06-s1",
        heading: "Ask every table",
        mandatory: true,
        sources: ["ud-allergy-procedure", "fsa-allergen-guidance"],
        paragraphs: [
          "Ask whether anybody at the table has an allergy or intolerance, every time, before the order is taken.",
          "Do not wait for the guest to raise it.",
        ],
      },
      {
        ref: "l06-s2",
        heading: "Capture exactly who and exactly what",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "Record which guest is affected — the seat or a clear description — and the precise allergen, in their words.",
          "Record which dishes that guest will eat. 'Table has an allergy' is not a usable record.",
        ],
        example:
          "\"Guest seat 3 — severe peanut allergy, tree nuts fine. Eating Pork Belly and Ugly Noodles.\" That is a usable record.",
      },
      {
        ref: "l06-s3",
        heading: "Every later order too",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The process repeats for desserts, sides, sauces and any later round. An allergy does not stop applying after the mains.",
        ],
      },
    ],
  },
  {
    ref: "l07-pos-recording",
    order: 7,
    title: "Recording allergies in the POS",
    summary: "Allergy tags, fresh tickets and the rule against handwritten additions.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l07-s1",
        heading: "Use the allergy tag on the right item",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The allergy is tagged against the affected guest's dishes in the till, naming the allergen.",
          "A note buried at the bottom of a table order is not enough — the kitchen must see it on the dish.",
        ],
      },
      {
        ref: "l07-s2",
        heading: "A fresh printed ticket after any change",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "Any allergy-related change means a fresh kitchen ticket is printed. The kitchen works from the printed ticket.",
          "Handwritten allergen additions are prohibited. Nothing allergen-related is ever added by pen to an existing ticket.",
        ],
      },
    ],
  },
  {
    ref: "l08-communication",
    order: 8,
    title: "Kitchen, FOH and manager communication",
    summary: "Spoken acknowledgement from all three, every time.",
    estimated_minutes: 5,
    mandatory: true,
    sections: [
      {
        ref: "l08-s1",
        heading: "Say it out loud and get it back",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The allergy is announced to the kitchen and the manager, and acknowledged back verbally. Silence is not acknowledgement.",
          "The manager is told about every allergy order, not only the difficult ones.",
        ],
      },
      {
        ref: "l08-s2",
        heading: "Escalate any doubt",
        mandatory: true,
        sources: ["ud-allergy-procedure", "matrix-jul-2026"],
        paragraphs: [
          "Any nut-related enquiry, any ingredient outside the 14, any disagreement between a label and the matrix — escalate to the manager and the kitchen before serving.",
        ],
      },
    ],
  },
  {
    ref: "l09-cross-contact",
    order: 9,
    title: "Preventing cross-contact",
    summary: "Hands, boards, tongs, oil, plates — the routes allergens actually travel.",
    estimated_minutes: 7,
    mandatory: true,
    sections: [
      {
        ref: "l09-s1",
        heading: "The routes",
        mandatory: true,
        sources: ["fsa-allergen-guidance", "ud-allergy-procedure"],
        paragraphs: [
          "Shared utensils, shared oil, unwashed hands, shared boards, crowded pass areas and stacked plates all move allergens.",
          "Clean, dedicated equipment and clean hands before an allergy dish is prepared.",
        ],
      },
      {
        ref: "l09-s2",
        heading: "Contact means discard and remake",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "If the allergen has touched the food, the dish is discarded and remade. It is never rescued.",
          "You never pick an ingredient off and serve the same plate.",
        ],
        example:
          "A peanut garnish has already been added before the allergy is passed on. The dish goes in the bin and is made again from clean components.",
      },
    ],
  },
  {
    ref: "l10-gluten-free",
    order: 10,
    title: "Gluten-free preparation and plating",
    summary: "Gluten-free equipment, the approved gluten-free sauce and black plates.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l10-s1",
        heading: "Separate equipment",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "Gluten-free dishes use the gluten-free equipment and clean hands, kept away from flour and standard dough.",
        ],
      },
      {
        ref: "l10-s2",
        heading: "Sauce and plating",
        mandatory: true,
        sources: ["matrix-jul-2026", "ud-allergy-procedure"],
        paragraphs: [
          APPROVED_WORDING.molluscs_and_gf_sauce,
          "Allergy dishes are plated on the black plates so the pass and the server can see at a glance which plate belongs to the affected guest.",
        ],
      },
    ],
  },
  {
    ref: "l11-satay-peanut",
    order: 11,
    title: "Satay Chicken and peanut controls",
    summary: "A peanut dish on the menu, and how it is handled around a peanut allergy.",
    estimated_minutes: 5,
    mandatory: true,
    sections: [
      {
        ref: "l11-s1",
        heading: "What it contains",
        mandatory: true,
        sources: ["matrix-jul-2026"],
        paragraphs: [
          "Satay Chicken contains peanuts under the approved recipe and the approved matrix. It does not contain tree nuts.",
          "It is never offered to a guest with a peanut allergy, and never described as safe because 'the sauce is on the side'.",
        ],
      },
      {
        ref: "l11-s2",
        heading: "Around the table",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "If somebody at the table has a peanut allergy and another guest orders Satay Chicken, tell the manager and the kitchen so preparation, plating and service are kept apart.",
        ],
      },
    ],
  },
  {
    ref: "l12-tempura-garnish",
    order: 12,
    title: "Tempura Aubergine garnish procedure",
    summary: "When the peanut garnish may be left off, and what happens when it is too late.",
    estimated_minutes: 5,
    mandatory: true,
    sections: [
      {
        ref: "l12-s1",
        heading: "Only before preparation",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The peanut garnish may be omitted only when the allergy is declared before the dish is prepared, and only with the complete allergy procedure followed.",
          "If peanuts have already touched the food, staff must discard it and remake it. Staff must never pick the peanuts off and serve the same dish.",
        ],
      },
      {
        ref: "l12-s2",
        heading: "Why this dish is not yet used in the exam",
        mandatory: false,
        sources: ["matrix-jul-2026"],
        paragraphs: [
          "Management has kept Tempura Aubergine as 'needs further evidence' until the batter recipe, supplier specification and fryer cross-contact are approved.",
          "The garnish procedure above stands. No scored question about what this dish declares will be asked until that evidence is approved.",
        ],
      },
    ],
  },
  {
    ref: "l13-nutella-fryer",
    order: 13,
    title: "Nutella, mixed nuts and the shared dessert fryer",
    summary: "The dessert section's nut risk, stated plainly.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l13-s1",
        heading: "The Nutella dessert",
        mandatory: true,
        sources: ["matrix-jul-2026"],
        paragraphs: [
          "Nutella contains hazelnut, and Ugly Dumpling adds mixed nuts to the dessert. The approved matrix records both peanuts and tree nuts for it.",
        ],
      },
      {
        ref: "l13-s2",
        heading: "The shared fryer",
        mandatory: true,
        sources: ["matrix-jul-2026", "ud-allergy-procedure"],
        paragraphs: [APPROVED_WORDING.shared_dessert_fryer],
        example:
          "A guest with a severe peanut allergy asks for the Apple Pie dumplings. You explain the shared fryer, you do not describe them as nut-free, and you involve the manager.",
      },
    ],
  },
  {
    ref: "l14-takeaway-delivery",
    order: 14,
    title: "Takeaway and delivery orders",
    summary: "The same duty when the guest is not in front of you.",
    estimated_minutes: 5,
    mandatory: true,
    sections: [
      {
        ref: "l14-s1",
        heading: "Same procedure, no shortcuts",
        mandatory: true,
        sources: ["ud-allergy-procedure", "ppds-natashas-law"],
        paragraphs: [
          "An allergy on a delivery or collection order is tagged, printed and acknowledged exactly as in the restaurant.",
          "Anything packed ahead for direct sale carries the food name and full ingredient list with the 14 emphasised.",
        ],
      },
      {
        ref: "l14-s2",
        heading: "Packing and handover",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The allergy dish is packed separately and clearly marked, so the right guest gets the right container.",
          "If the order note is unclear, the manager checks with the guest or the platform before the food leaves.",
        ],
      },
    ],
  },
  {
    ref: "l15-anaphylaxis",
    order: 15,
    title: "Suspected anaphylaxis",
    summary: "Recognising it and acting in seconds.",
    estimated_minutes: 6,
    mandatory: true,
    sections: [
      {
        ref: "l15-s1",
        heading: "What you might see",
        mandatory: true,
        sources: ["nhs-anaphylaxis"],
        paragraphs: [
          "Swelling of the lips, tongue or throat, difficulty breathing or a wheeze, a widespread rash, sudden dizziness, collapse or a sense that something is badly wrong.",
        ],
      },
      {
        ref: "l15-s2",
        heading: "Call 999 immediately",
        mandatory: true,
        sources: ["nhs-anaphylaxis", "ud-allergy-procedure"],
        paragraphs: [
          "Call 999 straight away and say you suspect anaphylaxis. Do not wait to see whether it settles and do not drive the guest anywhere.",
          "Help them use their own adrenaline auto-injector if they have one, keep them still, tell the manager, and keep the food, packaging and ticket for the investigation.",
        ],
      },
    ],
  },
  {
    ref: "l16-near-misses",
    order: 16,
    title: "Near misses, incidents and escalation",
    summary: "Reporting what nearly went wrong, without blame.",
    estimated_minutes: 5,
    mandatory: true,
    sections: [
      {
        ref: "l16-s1",
        heading: "Report the near miss",
        mandatory: true,
        sources: ["ud-allergy-procedure", "fsa-allergen-guidance"],
        paragraphs: [
          "A wrong plate caught at the pass, a missing allergy tag, an unclear ticket — all of it is reported to the manager the same shift.",
          "Near misses are how we fix the process before somebody is harmed. Nobody is disciplined for reporting one honestly.",
        ],
      },
      {
        ref: "l16-s2",
        heading: "What the manager records",
        mandatory: true,
        sources: ["ud-allergy-procedure"],
        paragraphs: [
          "The manager records what happened, the dishes and guests involved, what was kept as evidence, and what changed as a result.",
        ],
      },
    ],
  },
];

export const ALLERGEN_COURSE_TITLE = "Ugly Dumpling Allergen Safety";

export const ALLERGEN_COURSE_TOTAL_MINUTES = ALLERGEN_SAFETY_LESSONS.reduce(
  (n, l) => n + l.estimated_minutes,
  0,
);
