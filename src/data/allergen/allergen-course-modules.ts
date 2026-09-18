/**
 * Ugly Dumpling Allergen Safety — the eight learner modules.
 *
 * The approved lesson content is unchanged. This file only decides how a learner
 * meets it: eight short modules instead of sixteen separate lessons, so the
 * course reads as one idea at a time on a phone.
 *
 * Nothing here removes a control, a source reference or a question. Saved
 * progress is still recorded against the underlying lesson, so nobody loses a
 * section they have already completed.
 */

import { ALLERGEN_SAFETY_LESSONS } from "./allergen-safety-lessons";
import type { AllergenLesson } from "@/lib/allergen-course";

export interface AllergenModule {
  ref: string;
  order: number;
  title: string;
  summary: string;
  /** Lesson refs, in reading order, that make up this module. */
  lesson_refs: string[];
}

export const ALLERGEN_COURSE_MODULES: AllergenModule[] = [
  {
    ref: "m1-allergies-and-the-14",
    order: 1,
    title: "Understanding allergies and the 14 allergens",
    summary: "What a reaction is, why a trace matters, and the 14 we must declare.",
    lesson_refs: ["l01-allergies-intolerances", "l02-regulated-14"],
  },
  {
    ref: "m2-outside-14-peanuts-tree-nuts",
    order: 2,
    title: "Allergies outside the 14, peanuts and tree nuts",
    summary: "Garlic, onion, candlenut — and the two separate nut allergens.",
    lesson_refs: ["l03-outside-the-14", "l04-peanuts-tree-nuts"],
  },
  {
    ref: "m3-receiving-and-recording",
    order: 3,
    title: "Receiving and recording an allergy order",
    summary: "Asking every table, capturing the detail, tagging it and printing a fresh ticket.",
    lesson_refs: ["l06-receiving-declaration", "l07-pos-recording"],
  },
  {
    ref: "m4-communication",
    order: 4,
    title: "Front of house, kitchen and manager communication",
    summary: "Said out loud, acknowledged back, escalated when in doubt.",
    lesson_refs: ["l08-communication"],
  },
  {
    ref: "m5-cross-contact",
    order: 5,
    title: "Preventing cross-contact",
    summary: "The routes allergens travel, gluten-free equipment and black plates.",
    lesson_refs: ["l09-cross-contact", "l10-gluten-free"],
  },
  {
    ref: "m6-dish-examples",
    order: 6,
    title: "Ugly Dumpling dish examples",
    summary: "Our flavours, Satay Chicken, the peanut garnish and the shared dessert fryer.",
    lesson_refs: [
      "l05-flavours-ingredients",
      "l11-satay-peanut",
      "l12-tempura-garnish",
      "l13-nutella-fryer",
    ],
  },
  {
    ref: "m7-takeaway-delivery",
    order: 7,
    title: "Takeaway and delivery",
    summary: "The same duty when the guest is not in front of you.",
    lesson_refs: ["l14-takeaway-delivery"],
  },
  {
    ref: "m8-emergency-and-near-misses",
    order: 8,
    title: "Emergency response and near misses",
    summary: "Suspected anaphylaxis, and reporting what nearly went wrong.",
    lesson_refs: ["l15-anaphylaxis", "l16-near-misses"],
  },
];

export const ALLERGEN_MODULE_COUNT = ALLERGEN_COURSE_MODULES.length;

/** Every lesson belongs to exactly one module — checked, never assumed. */
export function moduleLessons(module: AllergenModule): AllergenLesson[] {
  return module.lesson_refs.map((ref) => {
    const lesson = ALLERGEN_SAFETY_LESSONS.find((l) => l.ref === ref);
    if (!lesson) throw new Error(`Module ${module.ref} refers to a missing lesson: ${ref}`);
    return lesson;
  });
}

export function moduleForLesson(lessonRef: string): AllergenModule | null {
  return ALLERGEN_COURSE_MODULES.find((m) => m.lesson_refs.includes(lessonRef)) ?? null;
}

export function moduleMinutes(module: AllergenModule): number {
  return moduleLessons(module).reduce((n, l) => n + l.estimated_minutes, 0);
}

export function moduleSectionCount(module: AllergenModule): number {
  return moduleLessons(module).reduce((n, l) => n + l.sections.length, 0);
}

export interface ModuleProgressState {
  module: AllergenModule;
  minutes: number;
  sectionsTotal: number;
  sectionsComplete: number;
  lessonsComplete: number;
  lessonsTotal: number;
  complete: boolean;
  mandatory: boolean;
}

/** Progress for one module, built from the same saved section rows as before. */
export function moduleProgressState(
  module: AllergenModule,
  completedByLesson: Record<string, string[]>,
): ModuleProgressState {
  const lessons = moduleLessons(module);
  let sectionsTotal = 0;
  let sectionsComplete = 0;
  let lessonsComplete = 0;

  for (const lesson of lessons) {
    const done = completedByLesson[lesson.ref] ?? [];
    const count = lesson.sections.filter((s) => done.includes(s.ref)).length;
    sectionsTotal += lesson.sections.length;
    sectionsComplete += count;
    if (count === lesson.sections.length && lesson.sections.length > 0) lessonsComplete += 1;
  }

  return {
    module,
    minutes: moduleMinutes(module),
    sectionsTotal,
    sectionsComplete,
    lessonsComplete,
    lessonsTotal: lessons.length,
    complete: sectionsTotal > 0 && sectionsComplete === sectionsTotal,
    mandatory: lessons.some((l) => l.mandatory),
  };
}
