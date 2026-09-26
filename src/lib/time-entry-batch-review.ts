/** A batch decision must have complete hours and no outstanding review flags. */
export function isBatchEligible(
  entry: { status: string; clock_out_time: string | null; total_hours: number | null },
  flags: readonly unknown[],
): boolean {
  return entry.status === "pending" && !!entry.clock_out_time &&
    typeof entry.total_hours === "number" && entry.total_hours > 0 && flags.length === 0;
}

/** A selection may be stale after another manager acts. Never guess that a missing row is clean. */
export function partitionBatchSelection<T extends { id: string; status: string; clock_out_time: string | null; total_hours: number | null }>(
  entries: readonly T[], selectedIds: readonly string[], flagsFor: (entry: T) => readonly unknown[],
): { eligibleIds: string[]; heldIds: string[] } {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const eligibleIds: string[] = [];
  const heldIds: string[] = [];
  for (const id of new Set(selectedIds)) {
    const entry = byId.get(id);
    if (entry && isBatchEligible(entry, flagsFor(entry))) eligibleIds.push(id);
    else heldIds.push(id);
  }
  return { eligibleIds, heldIds };
}
