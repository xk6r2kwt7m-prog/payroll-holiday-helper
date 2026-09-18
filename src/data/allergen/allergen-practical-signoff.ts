/**
 * Practical manager-observation template for Ugly Dumpling Allergen Safety.
 *
 * Phase 1 creates the template and shows it for review. Recording an actual
 * observation, completing the course and issuing a certificate are later phases.
 * Passing the online assessment produces only:
 *   "Assessment passed — awaiting practical sign-off".
 */

import type { AllergenSourceRef } from "@/lib/allergen-course";

export type ObservationAudience = "foh" | "kitchen" | "both";

export interface PracticalObservationItem {
  ref: string;
  audience: ObservationAudience;
  title: string;
  /** What the manager must actually see the employee do. */
  observe: string;
  critical: boolean;
  sources: AllergenSourceRef[];
}

export const PRACTICAL_SIGNOFF_TEMPLATE: {
  title: string;
  status_on_assessment_pass: string;
  note: string;
  items: PracticalObservationItem[];
} = {
  title: "Ugly Dumpling Allergen Safety — practical manager observation",
  status_on_assessment_pass: "Assessment passed — awaiting practical sign-off",
  note:
    "Observed during normal service by a manager. Each line is either seen or not seen — nothing is assumed from the online result. The course is not complete and no certificate exists until practical sign-off is built and completed.",
  items: [
    {
      ref: "p01",
      audience: "foh",
      title: "Asking about allergies",
      observe: "Asks every table whether anybody has an allergy or intolerance before taking the order.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p02",
      audience: "foh",
      title: "Clarifying the exact allergen",
      observe: "Asks follow-up questions until the precise allergen is clear, and repeats it back to the guest.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p03",
      audience: "foh",
      title: "Identifying the affected guest",
      observe: "Establishes which guest is affected and which dishes that guest will eat.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p04",
      audience: "both",
      title: "Distinguishing peanuts from tree nuts",
      observe: "Treats peanuts and tree nuts as separate allergens and asks which the guest means.",
      critical: true,
      sources: ["eu-reg-1169", "matrix-jul-2026"],
    },
    {
      ref: "p05",
      audience: "both",
      title: "Finding the current approved allergen information",
      observe: "Goes to the approved July 2026 matrix rather than relying on memory or a colleague's recollection.",
      critical: true,
      sources: ["matrix-jul-2026"],
    },
    {
      ref: "p06",
      audience: "both",
      title: "Checking the full ingredient list",
      observe: "For anything outside the regulated 14 — garlic, onion, mushrooms, candlenut — checks full recipe and supplier information.",
      critical: true,
      sources: ["ud-allergy-procedure", "matrix-jul-2026"],
    },
    {
      ref: "p07",
      audience: "foh",
      title: "Correct POS recording",
      observe: "Tags the allergy against the affected guest's dishes, naming the allergen.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p08",
      audience: "both",
      title: "Fresh printed ticket procedure",
      observe: "Prints a fresh kitchen ticket after any allergy-related change and adds nothing by hand.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p09",
      audience: "both",
      title: "Manager and kitchen communication",
      observe: "Announces the allergy to the kitchen and the manager and waits for spoken acknowledgement.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p10",
      audience: "kitchen",
      title: "Cross-contact controls",
      observe: "Washes hands, uses clean dedicated equipment, and keeps the allergy dish away from the allergen throughout.",
      critical: true,
      sources: ["fsa-allergen-guidance", "ud-allergy-procedure"],
    },
    {
      ref: "p11",
      audience: "kitchen",
      title: "Gluten-free equipment and plating",
      observe: "Uses the gluten-free equipment and the approved gluten-free sauce, and plates on the black plate.",
      critical: false,
      sources: ["matrix-jul-2026", "ud-allergy-procedure"],
    },
    {
      ref: "p12",
      audience: "both",
      title: "Final pass check",
      observe: "Checks the plate against the printed ticket at the pass before it leaves the kitchen.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p13",
      audience: "foh",
      title: "Serving the correct guest",
      observe: "Places the allergy dish in front of the right guest and says what it is as it is served.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p14",
      audience: "both",
      title: "Responding when information is uncertain",
      observe: "Stops, escalates to the manager and the kitchen, and does not serve until the answer is confirmed.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
    {
      ref: "p15",
      audience: "both",
      title: "Responding to suspected anaphylaxis",
      observe: "States that they would call 999 immediately, help with the guest's own auto-injector, keep the guest still, tell the manager and keep the food, packaging and ticket.",
      critical: true,
      sources: ["nhs-anaphylaxis", "ud-allergy-procedure"],
    },
    {
      ref: "p16",
      audience: "kitchen",
      title: "Discard and remake after allergen contact",
      observe: "Discards and remakes a dish once the allergen has touched it, and never removes a garnish to rescue it.",
      critical: true,
      sources: ["ud-allergy-procedure"],
    },
  ],
};

export const PRACTICAL_ITEM_COUNT = PRACTICAL_SIGNOFF_TEMPLATE.items.length;
