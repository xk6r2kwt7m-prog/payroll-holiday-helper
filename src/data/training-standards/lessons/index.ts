/**
 * Lesson Content Registry
 *
 * Maps module titles to their source-backed lesson content.
 * Uses a title alias layer to safely resolve live DB titles,
 * blueprint titles, and any known variant spellings.
 */

import type { LessonContent } from "../lesson-types";
import { allergenSafetyLesson } from "./allergen-safety";
import { foodSafetyLesson } from "./food-safety";
import { cleaningSanitisationLesson } from "./cleaning-sanitisation";
import { slipsTripsLesson } from "./slips-trips";
import { fireSafetyLesson } from "./fire-safety";
import { respectfulConductLesson } from "./respectful-conduct";
import { incidentReportingLesson } from "./incident-reporting";

// ─── Canonical registry keyed by lesson module_title ───

const CANONICAL_REGISTRY: Record<string, LessonContent> = {
  [allergenSafetyLesson.module_title]: allergenSafetyLesson,
  [foodSafetyLesson.module_title]: foodSafetyLesson,
  [cleaningSanitisationLesson.module_title]: cleaningSanitisationLesson,
  [slipsTripsLesson.module_title]: slipsTripsLesson,
  [fireSafetyLesson.module_title]: fireSafetyLesson,
  [respectfulConductLesson.module_title]: respectfulConductLesson,
  [incidentReportingLesson.module_title]: incidentReportingLesson,
};

// ─── Title alias mapping ───
// Maps known live-DB titles, blueprint variants, and common
// alternative spellings to the canonical lesson module_title.
// This prevents title-mismatch failures without requiring schema changes.

const TITLE_ALIASES: Record<string, string> = {
  // Allergen Safety
  "Allergen Awareness": "Allergen Safety Essentials",
  "Allergen Safety": "Allergen Safety Essentials",

  // Food Safety
  "Food Safety & Hygiene": "Food Safety and Personal Hygiene",
  "Food Safety and Hygiene": "Food Safety and Personal Hygiene",

  // Cleaning
  "Cleaning and Sanitation Basics": "Cleaning and Sanitisation Basics",
  "Cleaning & Sanitisation Basics": "Cleaning and Sanitisation Basics",
  "Cleaning & Sanitation Basics": "Cleaning and Sanitisation Basics",

  // Slips / Trips
  "Slips, Trips and Falls": "Slips, Trips and Manual Handling",
  "Slips / Trips / Falls": "Slips, Trips and Manual Handling",
  "Slips Trips and Falls": "Slips, Trips and Manual Handling",

  // Fire Safety
  "Fire Safety & Evacuation": "Fire Safety and Emergency Response",
  "Fire Safety and Evacuation": "Fire Safety and Emergency Response",
  "Fire Safety": "Fire Safety and Emergency Response",

  // Respectful Conduct
  "Respectful Conduct": "Respectful Workplace Conduct",
  "Workplace Conduct": "Respectful Workplace Conduct",

  // Incident Reporting
  "Incident Reporting Basics": "Incident Reporting and Escalation",
  "Incident Reporting": "Incident Reporting and Escalation",
};

/** Resolve a module title to its canonical lesson title */
function resolveTitle(title: string): string {
  // Direct canonical match
  if (title in CANONICAL_REGISTRY) return title;
  // Alias match
  if (title in TITLE_ALIASES) return TITLE_ALIASES[title];
  return title;
}

/** All available lesson content, keyed by module title */
export const LESSON_REGISTRY = CANONICAL_REGISTRY;

/** Check if a module has verified lesson content available */
export function hasLessonContent(moduleTitle: string): boolean {
  return resolveTitle(moduleTitle) in CANONICAL_REGISTRY;
}

/** Get lesson content for a module, or null if not available */
export function getLessonContent(moduleTitle: string): LessonContent | null {
  return CANONICAL_REGISTRY[resolveTitle(moduleTitle)] ?? null;
}
