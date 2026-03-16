/**
 * Lesson Content Registry
 *
 * Maps module titles to their source-backed lesson content.
 * Only modules with completed, reviewed lesson content appear here.
 */

import type { LessonContent } from "../lesson-types";
import { allergenSafetyLesson } from "./allergen-safety";

/** All available lesson content, keyed by module title */
export const LESSON_REGISTRY: Record<string, LessonContent> = {
  [allergenSafetyLesson.module_title]: allergenSafetyLesson,
};

/** Check if a module has verified lesson content available */
export function hasLessonContent(moduleTitle: string): boolean {
  return moduleTitle in LESSON_REGISTRY;
}

/** Get lesson content for a module, or null if not available */
export function getLessonContent(moduleTitle: string): LessonContent | null {
  return LESSON_REGISTRY[moduleTitle] ?? null;
}
