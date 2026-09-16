/**
 * Automatic induction-pack selection.
 *
 * Given the master document library plus an employee's branch and role,
 * returns the documents that must be included in their induction pack.
 * Pure function — no DB access, no side effects.
 */

export interface SelectableDocument {
  id: string;
  name: string;
  category: string;
  version: number;
  file_path?: string | null;
  status: string;
  include_in_induction: boolean;
  requires_signature: boolean;
  alcohol_related: boolean;
  applies_to_all_branches: boolean;
  branches: string[] | null;
  applies_to_all_roles: boolean;
  roles: string[] | null;
  expires_at?: string | null;
  archived_at?: string | null;
}

export interface InductionSelectionInput {
  documents: SelectableDocument[];
  branch?: string | null;
  role?: string | null;
  /** Include alcohol-sales documents (FOH / supervisor / manager selling alcohol). */
  includeAlcohol?: boolean;
}

export function documentAppliesToBranch(
  doc: SelectableDocument,
  branch?: string | null
): boolean {
  if (doc.applies_to_all_branches) return true;
  const list = doc.branches ?? [];
  if (list.length === 0) return false;
  if (!branch) return false;
  return list.includes(branch);
}

export function documentAppliesToRole(
  doc: SelectableDocument,
  role?: string | null
): boolean {
  if (doc.applies_to_all_roles) return true;
  const list = doc.roles ?? [];
  if (list.length === 0) return false;
  if (!role) return false;
  return list.includes(role);
}

export function isDocumentActive(doc: SelectableDocument, today = new Date()): boolean {
  if (doc.status !== "active") return false;
  if (doc.archived_at) return false;
  if (doc.expires_at) {
    const expiry = new Date(`${doc.expires_at}T23:59:59`);
    if (expiry.getTime() < today.getTime()) return false;
  }
  return true;
}

/**
 * Selects the induction documents for a branch + role.
 * Only active, induction-flagged documents are considered.
 */
export function selectInductionDocuments(
  input: InductionSelectionInput,
  today = new Date()
): SelectableDocument[] {
  const { documents, branch, role, includeAlcohol = false } = input;

  return documents
    .filter((doc) => doc.include_in_induction)
    .filter((doc) => isDocumentActive(doc, today))
    .filter((doc) => documentAppliesToBranch(doc, branch))
    .filter((doc) => documentAppliesToRole(doc, role))
    .filter((doc) => (doc.alcohol_related ? includeAlcohol : true))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/** Plain-English summary shown to the manager before sending. */
export function summariseSelection(count: number): string {
  if (count === 0) return "No documents selected — add documents to the library first";
  if (count === 1) return "1 document selected automatically";
  return `${count} documents selected automatically`;
}
