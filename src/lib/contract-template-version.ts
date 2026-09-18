/**
 * Numbered, dated releases of the employment contract wording.
 *
 * Every generated contract records the version it was produced from, together with a
 * snapshot of the exact terms used. Earlier releases are never edited or removed — a
 * wording change means a NEW entry at the top of this list, so every contract can
 * always be traced back to the wording that produced it.
 */

export interface ContractTemplateRelease {
  /** Version identifier printed on every page of contracts generated from it. */
  version: string;
  /** Date this wording came into use. */
  effectiveDate: string;
  /** Plain description of what this release contains or changed. */
  notes: string;
}

export const CONTRACT_TEMPLATE_RELEASES: ContractTemplateRelease[] = [
  {
    version: "2026.1",
    effectiveDate: "2026-09-18",
    notes:
      "First numbered release. Wording unchanged from the contracts generated before versioning began; " +
      "page furniture now carries the reference, employee name, page numbers, issue date and version.",
  },
];

/** The wording release used for contracts generated from now on. */
export const CURRENT_CONTRACT_TEMPLATE = CONTRACT_TEMPLATE_RELEASES[0];
export const CONTRACT_TEMPLATE_VERSION = CURRENT_CONTRACT_TEMPLATE.version;

/** Version stamped on documents generated before versioning existed. */
export const PRE_VERSIONING_LABEL = "as generated before versioning — snapshot not available";

export function findTemplateRelease(version: string | null | undefined): ContractTemplateRelease | null {
  if (!version) return null;
  return CONTRACT_TEMPLATE_RELEASES.find((r) => r.version === version) || null;
}
