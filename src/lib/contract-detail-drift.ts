/**
 * Contract flow — field-level comparison between what a contract document says
 * and what we hold on file today. Pure functions only.
 *
 * Nothing here rewrites a contract. It only reports, field by field, where a
 * produced contract no longer matches the staff record, so an administrator can
 * decide what to do.
 */

import type { ContractVariables } from "@/components/contracts/contractTemplates";

/** States where the document is final: never edited, never reproduced. */
export const LOCKED_CONTRACT_STATES = ["signed", "superseded", "terminated"];

/** Fields worth comparing — the ones a reader sees on the contract. */
export const COMPARED_CONTRACT_FIELDS: { key: keyof ContractVariables; label: string }[] = [
  { key: "employeeName", label: "Name" },
  { key: "jobTitle", label: "Job title" },
  { key: "effectiveDate", label: "Start date" },
  { key: "employmentType", label: "Employment type" },
  { key: "weeklyHours", label: "Weekly hours" },
  { key: "baseHourlyRate", label: "Base hourly rate" },
  { key: "workLocation", label: "Work location" },
  { key: "reportingManagerName", label: "Reporting manager" },
  { key: "homeAddress", label: "Home address" },
];

const NUMERIC_FIELDS = new Set<string>([
  "weeklyHours",
  "baseHourlyRate",
  "guaranteedServiceChargeRate",
  "estimatedServiceChargeRate",
]);

export interface ContractDetailDrift {
  field: keyof ContractVariables;
  label: string;
  /** The value printed on the contract document. */
  onContract: string;
  /** The value we hold on the staff record today. */
  onFile: string;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sameValue(field: string, a: string, b: string): boolean {
  if (a === b) return true;
  if (NUMERIC_FIELDS.has(field)) {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  }
  if (field === "effectiveDate") return a.slice(0, 10) === b.slice(0, 10);
  return a.replace(/\s+/g, " ").toLowerCase() === b.replace(/\s+/g, " ").toLowerCase();
}

/**
 * Compare a contract's stored terms snapshot against the details held today.
 * A field is only reported when we actually hold a value for it — a blank on
 * file is treated as "nothing new to say", never as a correction.
 */
export function compareContractDetails(
  onContract: Partial<ContractVariables> | null | undefined,
  onFile: Partial<ContractVariables> | null | undefined,
): ContractDetailDrift[] {
  const drifts: ContractDetailDrift[] = [];
  for (const { key, label } of COMPARED_CONTRACT_FIELDS) {
    const contractValue = text(onContract?.[key]);
    const fileValue = text(onFile?.[key]);
    if (!fileValue) continue;
    if (sameValue(key as string, contractValue, fileValue)) continue;
    drifts.push({ field: key, label, onContract: contractValue, onFile: fileValue });
  }
  return drifts;
}

/** Unsigned contracts can be corrected and reissued; final ones never can. */
export function canReissueContract(state?: string | null): boolean {
  const s = (state || "draft").trim();
  return !LOCKED_CONTRACT_STATES.includes(s);
}

/** A signed contract takes a dated correction record instead of a new file. */
export function needsCorrectionRecord(state?: string | null): boolean {
  return (state || "").trim() === "signed";
}

/**
 * A spelling-level fix is recorded as a correction; anything touching pay,
 * hours, role, location or start date is a change of terms and belongs in the
 * dated variation process instead.
 */
const SUBSTANTIVE_FIELDS = new Set<string>([
  "jobTitle",
  "effectiveDate",
  "employmentType",
  "weeklyHours",
  "baseHourlyRate",
  "workLocation",
]);

export function isSubstantiveChange(field: string): boolean {
  return SUBSTANTIVE_FIELDS.has(field);
}

export function describeDrift(drift: ContractDetailDrift): string {
  return `${drift.label}: contract says "${drift.onContract || "(blank)"}", file says "${drift.onFile}"`;
}
