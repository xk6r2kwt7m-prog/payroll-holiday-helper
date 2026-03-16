/**
 * Lesson Content Registry
 *
 * Maps module titles to their source-backed lesson content.
 * Only modules with completed, reviewed lesson content appear here.
 *
 * Title matching: module_title in each lesson must exactly match the
 * title field in the corresponding training_library row / blueprint.
 */

import type { LessonContent } from "../lesson-types";
import { allergenSafetyLesson } from "./allergen-safety";
import { foodSafetyLesson } from "./food-safety";
import { cleaningSanitisationLesson } from "./cleaning-sanitisation";
import { slipsTripsLesson } from "./slips-trips";
import { fireSafetyLesson } from "./fire-safety";
import { respectfulConductLesson } from "./respectful-conduct";
import { incidentReportingLesson } from "./incident-reporting";

/** All available lesson content, keyed by module title */
export const LESSON_REGISTRY: Record<string, LessonContent> = {
  [allergenSafetyLesson.module_title]: allergenSafetyLesson,
  [foodSafetyLesson.module_title]: foodSafetyLesson,
  [cleaningSanitisationLesson.module_title]: cleaningSanitisationLesson,
  [slipsTripsLesson.module_title]: slipsTripsLesson,
  [fireSafetyLesson.module_title]: fireSafetyLesson,
  [respectfulConductLesson.module_title]: respectfulConductLesson,
  [incidentReportingLesson.module_title]: incidentReportingLesson,
};

/** Check if a module has verified lesson content available */
export function hasLessonContent(moduleTitle: string): boolean {
  return moduleTitle in LESSON_REGISTRY;
}

/** Get lesson content for a module, or null if not available */
export function getLessonContent(moduleTitle: string): LessonContent | null {
  return LESSON_REGISTRY[moduleTitle] ?? null;
}
