/**
 * Role-based induction packs built from the company's own training documents.
 *
 * Pure functions only — no database access, no side effects.
 *
 * Rules this module encodes:
 *  - Staff see role packs (Front of House, Kitchen). Manager material is a
 *    separate pack that only managers and supervisors ever receive.
 *  - A lesson is never shown to staff until a manager has approved that exact
 *    lesson version.
 *  - The version a person completed is recorded and never rewritten.
 */

import { getLessonContent } from "@/data/training-standards/lessons";
import type { LessonContent } from "@/data/training-standards/lesson-types";

export type InductionPackRole = "foh" | "kitchen" | "manager";

export interface InductionLessonRef {
  /** Stable key stored against approvals and progress. Never rename. */
  key: string;
  /** Must match a lesson module_title in the lesson registry. */
  title: string;
  /** Plain-English one-liner shown on the pack list. */
  summary: string;
  estimated_minutes: number;
}

export interface InductionPackDefinition {
  role: InductionPackRole;
  name: string;
  audience: string;
  description: string;
  /** True when the pack must never be sent to ordinary staff. */
  restricted_to_managers: boolean;
  lessons: InductionLessonRef[];
}

// ─── Pack definitions ───

const WELCOME: InductionLessonRef = {
  key: "ud-welcome",
  title: "Welcome to Ugly Dumpling",
  summary: "Who we are, our values, the menu and how to start a shift.",
  estimated_minutes: 10,
};

const ALLERGY: InductionLessonRef = {
  key: "ud-allergy-protocol",
  title: "Allergy Protocol — Ugly Dumpling",
  summary: "The seven steps for taking, preparing and serving an allergy order.",
  estimated_minutes: 12,
};

const FOH_STANDARDS: InductionLessonRef = {
  key: "ud-foh-standards",
  title: "Front of House Standards",
  summary: "The DOs and DON'Ts of working on the floor.",
  estimated_minutes: 14,
};

const KITCHEN_STANDARDS: InductionLessonRef = {
  key: "ud-kitchen-standards",
  title: "Kitchen Standards",
  summary: "Station setup, cooking and plating standards, and closing down.",
  estimated_minutes: 14,
};

const FOOD_SAFETY: InductionLessonRef = {
  key: "ud-food-safety-haccp",
  title: "Food Safety and HACCP Basics",
  summary: "Our food safety system, the 4Cs and the records you must complete.",
  estimated_minutes: 15,
};

const QUALITY_CONTROL: InductionLessonRef = {
  key: "ud-quality-control",
  title: "Quality Control and Stock Management",
  summary: "Consistency checks, stock rotation, waste analysis and corrective action.",
  estimated_minutes: 15,
};

const MANAGER_OPS: InductionLessonRef = {
  key: "ud-manager-operations",
  title: "Restaurant Operations for Managers",
  summary: "Opening, briefing, running service, licensing duties and closing.",
  estimated_minutes: 18,
};

export const INDUCTION_PACKS: InductionPackDefinition[] = [
  {
    role: "foh",
    name: "Front of House induction",
    audience: "Waiting staff, bar, host and runners",
    description:
      "Everything a new front of house team member needs before their first shift on the floor.",
    restricted_to_managers: false,
    lessons: [WELCOME, FOH_STANDARDS, ALLERGY],
  },
  {
    role: "kitchen",
    name: "Kitchen induction",
    audience: "Chefs, kitchen porters and prep team",
    description:
      "Kitchen standards and food safety, including how allergen orders are handled.",
    restricted_to_managers: false,
    lessons: [WELCOME, KITCHEN_STANDARDS, FOOD_SAFETY, ALLERGY],
  },
  {
    role: "manager",
    name: "Manager and supervisor induction",
    audience: "Managers and supervisors only",
    description:
      "The duty manager's operating rhythm, plus quality control and stock management.",
    restricted_to_managers: true,
    lessons: [WELCOME, MANAGER_OPS, QUALITY_CONTROL, FOOD_SAFETY, ALLERGY],
  },
];

export const PACK_ROLE_LABELS: Record<InductionPackRole, string> = {
  foh: "Front of House",
  kitchen: "Kitchen",
  manager: "Managers and supervisors",
};

export function getInductionPack(role: InductionPackRole): InductionPackDefinition {
  const pack = INDUCTION_PACKS.find((p) => p.role === role);
  if (!pack) throw new Error(`Unknown induction pack: ${role}`);
  return pack;
}

/** Every lesson used by any pack, de-duplicated, in a stable order. */
export function allInductionLessons(): InductionLessonRef[] {
  const seen = new Map<string, InductionLessonRef>();
  for (const pack of INDUCTION_PACKS) {
    for (const lesson of pack.lessons) {
      if (!seen.has(lesson.key)) seen.set(lesson.key, lesson);
    }
  }
  return [...seen.values()];
}

export function lessonRefByKey(key: string): InductionLessonRef | null {
  return allInductionLessons().find((l) => l.key === key) ?? null;
}

/** The written content behind a lesson reference, or null when it is missing. */
export function lessonContentFor(ref: InductionLessonRef): LessonContent | null {
  return getLessonContent(ref.title);
}

/** Version of the written content, used to lock what somebody completed. */
export function lessonVersion(ref: InductionLessonRef): string {
  return lessonContentFor(ref)?.version ?? "0";
}

// ─── Choosing a pack for a person ───

const KITCHEN_WORDS = [
  "chef", "kitchen", "cook", "porter", "kp", "prep", "commis", "sous", "pastry", "cdp", "cpu",
];
const MANAGER_WORDS = [
  "manager", "supervisor", "head of", "operations", "director", "assistant manager", "duty",
];

/**
 * Suggests the pack for a job title. Kitchen and manager wording wins over the
 * front of house default; a kitchen manager gets the manager pack.
 */
export function suggestPackForJobTitle(jobTitle?: string | null): InductionPackRole {
  const t = (jobTitle ?? "").toLowerCase().trim();
  if (!t) return "foh";
  if (MANAGER_WORDS.some((w) => t.includes(w))) return "manager";
  if (KITCHEN_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(t) || t.includes(w))) return "kitchen";
  return "foh";
}

// ─── Approval gating ───

export type LessonApprovalStatus = "draft" | "approved" | "rejected";

export interface LessonApprovalRow {
  lesson_key: string;
  lesson_version: string;
  status: LessonApprovalStatus;
}

/** True when this exact lesson version has been approved for staff. */
export function isLessonApproved(
  approvals: LessonApprovalRow[],
  ref: InductionLessonRef
): boolean {
  const version = lessonVersion(ref);
  return approvals.some(
    (a) => a.lesson_key === ref.key && a.lesson_version === version && a.status === "approved"
  );
}

/** The lessons a staff member may actually open right now. */
export function releasedLessons(
  role: InductionPackRole,
  approvals: LessonApprovalRow[]
): InductionLessonRef[] {
  return getInductionPack(role).lessons.filter((l) => isLessonApproved(approvals, l));
}

/** Lessons still waiting for a manager to approve them. */
export function lessonsAwaitingApproval(
  role: InductionPackRole,
  approvals: LessonApprovalRow[]
): InductionLessonRef[] {
  return getInductionPack(role).lessons.filter((l) => !isLessonApproved(approvals, l));
}

export function approvalStatusLabel(status: LessonApprovalStatus | null | undefined): string {
  if (status === "approved") return "Released to staff";
  if (status === "rejected") return "Held back";
  return "Awaiting your approval";
}

export function approvalStatusTone(
  status: LessonApprovalStatus | null | undefined
): "green" | "amber" | "red" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

// ─── Progress ───

export interface LessonProgressRow {
  lesson_key: string;
  lesson_version: string;
  completed_at: string | null;
}

/** A lesson counts as done only when the version completed is the current one. */
export function isLessonComplete(
  progress: LessonProgressRow[],
  ref: InductionLessonRef
): boolean {
  const version = lessonVersion(ref);
  return progress.some(
    (p) => p.lesson_key === ref.key && p.lesson_version === version && !!p.completed_at
  );
}

/**
 * A previous version was completed but the lesson has since changed.
 * Nothing is rewritten — the old completion stays on the record.
 */
export function completedAnOlderVersion(
  progress: LessonProgressRow[],
  ref: InductionLessonRef
): boolean {
  if (isLessonComplete(progress, ref)) return false;
  const version = lessonVersion(ref);
  return progress.some(
    (p) => p.lesson_key === ref.key && p.lesson_version !== version && !!p.completed_at
  );
}

/** The next lesson to open: first released lesson that is not complete. */
export function nextLesson(
  role: InductionPackRole,
  approvals: LessonApprovalRow[],
  progress: LessonProgressRow[]
): InductionLessonRef | null {
  return releasedLessons(role, approvals).find((l) => !isLessonComplete(progress, l)) ?? null;
}

export function packProgressPercent(
  role: InductionPackRole,
  approvals: LessonApprovalRow[],
  progress: LessonProgressRow[]
): number {
  const released = releasedLessons(role, approvals);
  if (released.length === 0) return 0;
  const done = released.filter((l) => isLessonComplete(progress, l)).length;
  return Math.round((done / released.length) * 100);
}

export function packIsComplete(
  role: InductionPackRole,
  approvals: LessonApprovalRow[],
  progress: LessonProgressRow[]
): boolean {
  const pack = getInductionPack(role);
  return pack.lessons.length > 0 && pack.lessons.every((l) => isLessonComplete(progress, l));
}

/** Plain-English status line shown to staff at the top of their pack. */
export function packStatusSummary(
  role: InductionPackRole,
  approvals: LessonApprovalRow[],
  progress: LessonProgressRow[]
): string {
  const pack = getInductionPack(role);
  const released = releasedLessons(role, approvals);
  if (released.length === 0) return "Your induction is being prepared — nothing to read yet";
  const done = released.filter((l) => isLessonComplete(progress, l)).length;
  if (done === released.length && released.length === pack.lessons.length) {
    return "Induction complete — thank you";
  }
  if (done === released.length) return `${done} of ${released.length} done — more to follow`;
  return `${done} of ${released.length} lessons done`;
}

/** Total reading time for the lessons a person can currently open. */
export function estimatedPackMinutes(
  role: InductionPackRole,
  approvals: LessonApprovalRow[]
): number {
  return releasedLessons(role, approvals).reduce((n, l) => n + l.estimated_minutes, 0);
}
