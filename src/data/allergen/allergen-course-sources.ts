/**
 * Source catalogue for the Ugly Dumpling Allergen Safety course.
 *
 * Every lesson statement and every question carries one or more of these
 * references. Nothing in the course may be written without one.
 * The matrix reference resolves to the approved July 2026 matrix held in
 * Documents & Compliance; the others are named exactly as registered.
 */

import type { AllergenSourceRef } from "@/lib/allergen-course";

export interface AllergenCourseSource {
  ref: AllergenSourceRef;
  title: string;
  kind: "legal_requirement" | "official_guidance" | "internal_standard";
  /** Title as registered in the allergen source library, used to resolve the record. */
  registered_title?: string;
  authority_note: string;
}

export const ALLERGEN_COURSE_SOURCES: AllergenCourseSource[] = [
  {
    ref: "matrix-jul-2026",
    title: "Approved Ugly Dumpling allergen matrix — 18 July 2026",
    kind: "internal_standard",
    registered_title: "Approved allergen matrix — July 2026 (Ugly Dumpling)",
    authority_note:
      "Highest authority for current dish allergen declarations. A current supplier label showing additional allergens is flagged, never ignored.",
  },
  {
    ref: "ud-allergy-procedure",
    title: "Ugly Dumpling allergy handling procedure",
    kind: "internal_standard",
    authority_note: "Operational procedure: taking, recording, communicating and checking an allergy order.",
  },
  {
    ref: "ud-menu-jul-2026",
    title: "Ugly Dumpling July 2026 customer menus (Carnaby, Brixton, Fitzrovia)",
    kind: "internal_standard",
    authority_note:
      "Used only to confirm which flavours are sold at a site. Never an allergen authority.",
  },
  {
    ref: "fsa-allergen-guidance",
    title: "Food Standards Agency — allergen guidance for food businesses",
    kind: "official_guidance",
    authority_note: "Regulatory guidance on the 14 declarable allergens, communication duties and controls.",
  },
  {
    ref: "eu-reg-1169",
    title: "Retained EU Regulation 1169/2011 — food information to consumers",
    kind: "legal_requirement",
    authority_note: "Legal basis for declaring the 14 specified allergens.",
  },
  {
    ref: "ppds-natashas-law",
    title: "Prepacked for direct sale (PPDS) labelling — Natasha's Law",
    kind: "legal_requirement",
    authority_note: "Full ingredient labelling with the 14 allergens emphasised for PPDS food.",
  },
  {
    ref: "nhs-anaphylaxis",
    title: "NHS — anaphylaxis",
    kind: "official_guidance",
    authority_note: "Recognising anaphylaxis and the emergency response.",
  },
  {
    ref: "ud-course-v1",
    title: "Published allergen course version 1 (18 September 2026)",
    kind: "internal_standard",
    authority_note: "Approved course content carried forward into the proposed version 2.",
  },
];

export function courseSource(ref: AllergenSourceRef): AllergenCourseSource {
  return (
    ALLERGEN_COURSE_SOURCES.find((s) => s.ref === ref) ?? {
      ref,
      title: ref,
      kind: "internal_standard",
      authority_note: "Source reference not found in the catalogue.",
    }
  );
}

export const REGULATED_14 = [
  "Cereals containing gluten",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Peanuts",
  "Soybeans (soya)",
  "Milk (dairy)",
  "Nuts (tree nuts)",
  "Celery",
  "Mustard",
  "Sesame",
  "Sulphur dioxide and sulphites",
  "Lupin",
  "Molluscs",
];

export const REGULATED_TREE_NUTS = [
  "Almonds", "Hazelnuts", "Walnuts", "Brazil nuts", "Cashews", "Pecans", "Pistachios", "Macadamias",
];

/** Approved operational wording. Reproduced exactly; never paraphrased. */
export const APPROVED_WORDING = {
  shared_dessert_fryer:
    "All sweet dumplings share the same fryer. Every fried dessert therefore carries a cross-contact risk from peanuts and tree nuts. It must not be described as peanut-free, nut-free or suitable for a severe peanut or tree-nut allergy unless a separately validated preparation process removes that risk.",
  candlenut:
    "Laksa Soup contains candlenut. Candlenut is not one of the tree nuts specifically listed within the UK's regulated 14 allergens, but it may still cause an allergic reaction. Staff must disclose it, check the full ingredient and supplier information, and escalate any nut-related allergy enquiry.",
  molluscs_and_gf_sauce:
    "None of our dumplings contain molluscs. For gluten-free dumplings the soy or hoisin sauce is replaced with the approved gluten-free version, and every other ingredient and cross-contact check still applies.",
};
