/**
 * Contract draft autosave (local, per employee).
 *
 * Keeps in-progress contract details typed in the contract wizard so a refresh,
 * accidental close, or phone lock never loses them. Purely a convenience cache:
 * nothing here writes to the database, and no payroll, holiday, NMW or
 * service-charge logic is involved.
 */

const PREFIX = "ud.contract-draft.v1.";
const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface ContractDraftSnapshot<V = Record<string, string>> {
  variables: V;
  emailDraft: string;
  contractType: string;
  editedFields: string[];
  savedAt: string;
}

function keyFor(employeeId: string) {
  return `${PREFIX}${employeeId}`;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveContractDraft<V>(
  employeeId: string,
  snapshot: Omit<ContractDraftSnapshot<V>, "savedAt">,
): void {
  if (!employeeId) return;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(
      keyFor(employeeId),
      JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota or private mode — autosave is best-effort only */
  }
}

export function loadContractDraft<V>(employeeId: string): ContractDraftSnapshot<V> | null {
  if (!employeeId) return null;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(keyFor(employeeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContractDraftSnapshot<V>;
    if (!parsed || typeof parsed !== "object" || !parsed.variables) return null;
    const savedAt = new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > TTL_MS) {
      store.removeItem(keyFor(employeeId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearContractDraft(employeeId: string): void {
  if (!employeeId) return;
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(keyFor(employeeId));
  } catch {
    /* ignore */
  }
}

/** True when the snapshot holds at least one non-empty value worth restoring. */
export function draftHasContent<V extends Record<string, unknown>>(
  snapshot: ContractDraftSnapshot<V> | null,
): boolean {
  if (!snapshot) return false;
  if (snapshot.emailDraft?.trim()) return true;
  return Object.values(snapshot.variables || {}).some(
    (v) => typeof v === "string" && v.trim() !== "",
  );
}
