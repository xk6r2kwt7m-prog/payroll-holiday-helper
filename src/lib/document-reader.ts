/**
 * On-screen reading versions of compliance documents.
 * Pure helpers — no database access.
 *
 * A reading version is a navigable copy of an uploaded document, split into
 * sections, with short comprehension checks. Checks are only shown to staff
 * once a manager has approved them; the original file always stays available.
 */

export type ReaderStatus = "none" | "building" | "ready" | "failed";
export type QuestionApproval = "suggested" | "approved" | "rejected";

export interface ReaderSection {
  id: string;
  heading: string;
  body: string;
  sort_order: number;
}

export interface ReaderQuestion {
  id: string;
  section_id: string | null;
  question: string;
  options: string[];
  correct_index?: number;
  explanation?: string | null;
  approval_status: QuestionApproval;
}

export interface SectionProgress {
  section_id: string;
  read: boolean;
  answered_correctly: boolean | null;
}

export function readerStatusLabel(status: ReaderStatus | null | undefined, sections = 0): string {
  switch (status) {
    case "ready":
      return sections > 0 ? `On-screen version ready — ${sections} sections` : "On-screen version ready";
    case "building":
      return "Preparing the on-screen version…";
    case "failed":
      return "On-screen version could not be prepared";
    default:
      return "No on-screen version yet";
  }
}

export function readerStatusTone(status: ReaderStatus | null | undefined): "green" | "amber" | "red" | "grey" {
  if (status === "ready") return "green";
  if (status === "building") return "amber";
  if (status === "failed") return "red";
  return "grey";
}

/** Questions staff actually see: approved only, in section order. */
export function approvedQuestions(questions: ReaderQuestion[]): ReaderQuestion[] {
  return questions.filter((q) => q.approval_status === "approved");
}

export function questionsForSection(questions: ReaderQuestion[], sectionId: string): ReaderQuestion[] {
  return approvedQuestions(questions).filter((q) => q.section_id === sectionId);
}

/**
 * Whether a staff member may confirm they have read the document.
 * Every section must be opened, and every approved check answered correctly.
 */
export function canConfirmDocument(
  sections: ReaderSection[],
  questions: ReaderQuestion[],
  progress: SectionProgress[]
): boolean {
  if (sections.length === 0) return true; // no on-screen version — PDF confirmation only
  const byId = new Map(progress.map((p) => [p.section_id, p]));
  return sections.every((s) => {
    const p = byId.get(s.id);
    if (!p?.read) return false;
    const checks = questionsForSection(questions, s.id);
    if (checks.length === 0) return true;
    return p.answered_correctly === true;
  });
}

/** Plain-English summary of what is still outstanding. */
export function outstandingSummary(
  sections: ReaderSection[],
  questions: ReaderQuestion[],
  progress: SectionProgress[]
): string | null {
  if (sections.length === 0) return null;
  const byId = new Map(progress.map((p) => [p.section_id, p]));
  const unread = sections.filter((s) => !byId.get(s.id)?.read).length;
  const unanswered = sections.filter((s) => {
    const p = byId.get(s.id);
    return p?.read && questionsForSection(questions, s.id).length > 0 && p.answered_correctly !== true;
  }).length;
  if (unread === 0 && unanswered === 0) return null;
  const parts: string[] = [];
  if (unread > 0) parts.push(`${unread} ${unread === 1 ? "section" : "sections"} left to read`);
  if (unanswered > 0) parts.push(`${unanswered} ${unanswered === 1 ? "question" : "questions"} to answer`);
  return parts.join(" · ");
}

export function readingProgressPercent(sections: ReaderSection[], progress: SectionProgress[]): number {
  if (sections.length === 0) return 0;
  const read = progress.filter((p) => p.read).length;
  return Math.round((Math.min(read, sections.length) / sections.length) * 100);
}

/** Estimated reading time, shown so staff know what they are starting. */
export function estimatedMinutes(sections: ReaderSection[]): number {
  const words = sections.reduce((n, s) => n + s.body.split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 200));
}

/** A suggested question is only usable when it has options and a valid answer. */
export function isUsableQuestion(q: {
  question?: string | null;
  options?: unknown;
  correct_index?: number | null;
}): boolean {
  const options = Array.isArray(q.options) ? (q.options as unknown[]) : [];
  if (!q.question?.trim()) return false;
  if (options.length < 2) return false;
  const idx = q.correct_index ?? -1;
  return idx >= 0 && idx < options.length;
}
