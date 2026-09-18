/**
 * Deterministic source priority for allergen training content.
 *
 * Rules (never inference):
 *  1. Current product packaging and approved supplier specifications
 *  2. Latest approved allergen matrix
 *  3. Current recipes, sauces, garnishes and preparation methods
 *  4. Current operational procedures approved by management
 *  5. Older ingredient lists and presentations (supporting history only)
 *
 * A lower-ranked source can NEVER overwrite a higher-ranked one. It can only
 * raise a conflict for management review. Where ranks tie, or a date is
 * missing, the item is marked as needing an administrator decision.
 */

export type AllergenSourceRank =
  | "packaging_supplier"
  | "allergen_matrix"
  | "recipe"
  | "operational_procedure"
  | "historical";

export const ALLERGEN_SOURCE_RANKS: {
  value: AllergenSourceRank;
  label: string;
  description: string;
  priority: number;
}[] = [
  {
    value: "packaging_supplier",
    label: "Product packaging / supplier specification",
    description: "Current packaging or an approved supplier specification. Highest authority.",
    priority: 1,
  },
  {
    value: "allergen_matrix",
    label: "Approved allergen matrix",
    description: "The latest allergen matrix approved by management.",
    priority: 2,
  },
  {
    value: "recipe",
    label: "Current recipe, sauce, garnish or preparation method",
    description: "Current recipe and preparation documents.",
    priority: 3,
  },
  {
    value: "operational_procedure",
    label: "Operational procedure approved by management",
    description: "Current service, kitchen or emergency procedures.",
    priority: 4,
  },
  {
    value: "historical",
    label: "Older ingredient list or presentation (history only)",
    description: "Supporting historical material. Can never override a current source.",
    priority: 5,
  },
];

const PRIORITY_BY_RANK = new Map<AllergenSourceRank, number>(
  ALLERGEN_SOURCE_RANKS.map((r) => [r.value, r.priority]),
);

export function sourcePriority(rank: AllergenSourceRank | string | null | undefined): number {
  if (!rank) return 99;
  return PRIORITY_BY_RANK.get(rank as AllergenSourceRank) ?? 99;
}

export function sourceRankLabel(rank: AllergenSourceRank | string | null | undefined): string {
  return ALLERGEN_SOURCE_RANKS.find((r) => r.value === rank)?.label ?? "Unclassified source";
}

export interface RankedSourceStatement {
  source_id: string | null;
  source_title: string;
  source_rank: AllergenSourceRank | string;
  source_version?: string | null;
  source_date?: string | null;
  statement: string;
}

/**
 * Orders competing statements strongest-first: rank, then most recent date.
 * A missing date never beats a dated source of the same rank.
 */
export function orderByAuthority(statements: RankedSourceStatement[]): RankedSourceStatement[] {
  return [...statements].sort((a, b) => {
    const rankDiff = sourcePriority(a.source_rank) - sourcePriority(b.source_rank);
    if (rankDiff !== 0) return rankDiff;
    const aDate = a.source_date ? Date.parse(a.source_date) : Number.NaN;
    const bDate = b.source_date ? Date.parse(b.source_date) : Number.NaN;
    if (Number.isNaN(aDate) && Number.isNaN(bDate)) return 0;
    if (Number.isNaN(aDate)) return 1;
    if (Number.isNaN(bDate)) return -1;
    return bDate - aDate;
  });
}

export interface ConflictAssessment {
  hasConflict: boolean;
  /** The statement the priority rules point at, or null when nothing is decisive. */
  recommended: RankedSourceStatement | null;
  /** True when the rules cannot separate the sources — an admin must decide. */
  needsAdminDecision: boolean;
  reason: string;
  ordered: RankedSourceStatement[];
}

/** Normalises wording so trivial formatting differences are not treated as conflicts. */
export function normaliseStatement(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s;,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function assessConflict(statements: RankedSourceStatement[]): ConflictAssessment {
  const ordered = orderByAuthority(statements);
  if (ordered.length === 0) {
    return {
      hasConflict: false,
      recommended: null,
      needsAdminDecision: false,
      reason: "No sources supplied.",
      ordered,
    };
  }

  const distinct = new Set(ordered.map((s) => normaliseStatement(s.statement)));
  if (distinct.size <= 1) {
    return {
      hasConflict: false,
      recommended: ordered[0],
      needsAdminDecision: false,
      reason: "All sources agree.",
      ordered,
    };
  }

  const strongest = ordered[0];
  const rivals = ordered.filter(
    (s) => normaliseStatement(s.statement) !== normaliseStatement(strongest.statement),
  );
  const tiedRival = rivals.find(
    (s) =>
      sourcePriority(s.source_rank) === sourcePriority(strongest.source_rank) &&
      (!s.source_date || !strongest.source_date || s.source_date === strongest.source_date),
  );

  if (tiedRival) {
    return {
      hasConflict: true,
      recommended: null,
      needsAdminDecision: true,
      reason:
        "Two sources of equal standing disagree, or a date is missing, so the priority rules cannot decide. Needs your decision.",
      ordered,
    };
  }

  return {
    hasConflict: true,
    recommended: strongest,
    needsAdminDecision: false,
    reason: `${sourceRankLabel(strongest.source_rank)} takes priority over the other source(s).`,
    ordered,
  };
}

/**
 * A scored dish question may only be generated when the dish is confirmed
 * against an approved source AND is live on that branch's POS and menu.
 */
export function canScoreDishQuestion(dish: {
  is_confirmed: boolean;
  active_branch_ids: string[] | null;
}, branchId: string | null): boolean {
  if (!dish.is_confirmed) return false;
  if (!branchId) return false;
  return (dish.active_branch_ids ?? []).includes(branchId);
}
