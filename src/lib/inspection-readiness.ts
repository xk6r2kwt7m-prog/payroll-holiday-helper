/**
 * Inspection-file readiness rollup.
 * Pure functions — turns checklist items and branch documents into
 * green / amber / red / grey signals for the manager.
 */

import { resolveExpiryBand, type ComplianceTone } from "./compliance-expiry";

export type ChecklistStatus = "ready" | "action_needed" | "missing" | "not_applicable";

export interface InspectionChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: string;
  displayed: boolean;
  physical_copy_held: boolean;
  last_reviewed_at?: string | null;
  notes?: string | null;
}

export interface InspectionDocumentItem {
  id: string;
  name: string;
  expiry_date?: string | null;
  is_displayed: boolean;
  physical_copy_held: boolean;
  inspection_required: boolean;
  status: string;
  /** True when a file is attached or a paper copy is held. */
  has_copy?: boolean;
  last_reviewed_at?: string | null;
}

export function normaliseChecklistStatus(status: string): ChecklistStatus {
  if (["ready", "action_needed", "missing", "not_applicable"].includes(status)) {
    return status as ChecklistStatus;
  }
  return "missing";
}

export function checklistTone(item: InspectionChecklistItem): ComplianceTone {
  const status = normaliseChecklistStatus(item.status);
  if (!item.required || status === "not_applicable") return "grey";
  if (status === "ready") return "green";
  if (status === "action_needed") return "amber";
  return "red";
}

export function documentTone(item: InspectionDocumentItem, today = new Date()): ComplianceTone {
  if (item.status === "archived") return "grey";
  const hasCopy = item.has_copy ?? item.physical_copy_held;
  if (!hasCopy) return "red";
  const band = resolveExpiryBand(item.expiry_date, today);
  if (band === "expired") return "red";
  if (band === "30_days" || band === "60_days" || band === "90_days") return "amber";
  return "green";
}

export interface InspectionReadiness {
  total: number;
  ready: number;
  amber: number;
  red: number;
  grey: number;
  /** Overall tone for the branch. */
  tone: ComplianceTone;
  outstanding: string[];
}

export function summariseInspectionReadiness(
  checklist: InspectionChecklistItem[],
  documents: InspectionDocumentItem[] = [],
  today = new Date()
): InspectionReadiness {
  const relevantDocs = documents.filter((d) => d.inspection_required);
  const tones: ComplianceTone[] = [
    ...checklist.map(checklistTone),
    ...relevantDocs.map((d) => documentTone(d, today)),
  ];

  const counts = { green: 0, amber: 0, red: 0, grey: 0 };
  tones.forEach((t) => {
    counts[t] += 1;
  });

  const outstanding = [
    ...checklist.filter((c) => ["red", "amber"].includes(checklistTone(c))).map((c) => c.label),
    ...relevantDocs.filter((d) => ["red", "amber"].includes(documentTone(d, today))).map((d) => d.name),
  ];

  const tone: ComplianceTone =
    counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : tones.length === 0 ? "grey" : "green";

  return {
    total: tones.length,
    ready: counts.green,
    amber: counts.amber,
    red: counts.red,
    grey: counts.grey,
    tone,
    outstanding,
  };
}

/**
 * Westminster / Carnaby starting checklist, from the inspector's request.
 * Seeded per branch and fully editable afterwards.
 */
export const DEFAULT_INSPECTION_CHECKLIST: {
  label: string;
  detail: string;
  sort_order: number;
}[] = [
  { label: "Premises licence Part B displayed and visible", detail: "Must be on display at the premises.", sort_order: 1 },
  { label: "Section 57 notice completed, signed and displayed", detail: "Names the address where Part A is held.", sort_order: 2 },
  { label: "Premises licence Part A held in the compliance folder", detail: "Available on request during inspection.", sort_order: 3 },
  { label: "Copy of personal licence kept at the premises", detail: "DPS or nominated personal licence holder.", sort_order: 4 },
  { label: "Age verification (Challenge 25) signs displayed", detail: "At entrance and point of sale.", sort_order: 5 },
  { label: "Fire panel action completed", detail: "Evidence of completion uploaded.", sort_order: 6 },
  { label: "Incident and refusals book available", detail: "Kept at the premises and up to date.", sort_order: 7 },
  { label: "Licensing fees paid, receipt uploaded", detail: "Annual fee receipt on file.", sort_order: 8 },
  { label: "Reinspection date and related actions recorded", detail: "Track the follow-up visit.", sort_order: 9 },
];
