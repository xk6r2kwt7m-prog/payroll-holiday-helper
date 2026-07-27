/**
 * Payroll import matching engine.
 * 
 * Matching hierarchy:
 * 1. Exact full-name match (case-sensitive)
 * 2. Case-insensitive full-name match
 * 3. Email match
 * 4. Import alias match (from employee.import_aliases)
 * 5. Preferred name match (from employee.preferred_name)
 * 6. Legacy NAME_MAP fallback
 * 7. Manual manager confirmation (unmatched)
 * 
 * Rule: never auto-match by forename alone if >1 candidate exists.
 */

export interface MatchableEmployee {
  id: string;
  forename: string;
  surname: string;
  department: string;
  hourly_rate: number;
  service_charge: number | null;
  status: string;
  email: string | null;
  preferred_name?: string | null;
  import_aliases?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  branch_id?: string | null;
  archived_at?: string | null;
}

export type MatchMethod =
  | "employee_id"
  | "email"
  | "saved_alias"
  | "exact"
  | "case_insensitive"
  | "import_alias"
  | "preferred_name"
  | "legacy_name_map"
  | "manual"
  | "none";

export interface MatchResult {
  employee: MatchableEmployee | undefined;
  method: MatchMethod;
  /** True when the result must NOT auto-apply — e.g. saved alias points to inactive employee or there is a conflict. */
  requiresReview?: boolean;
  /** Optional human-readable reason for required review. */
  reviewReason?: string;
}

export interface SavedAlias {
  raw_timesheet_name: string;
  normalised_timesheet_name: string;
  employee_id: string;
  is_active: boolean;
}

export interface ImportRow {
  /** Free-text name as it appears in the file. */
  name: string;
  /** Optional explicit employee id column from the file. */
  employeeId?: string | null;
  /** Optional explicit email column from the file. */
  email?: string | null;
}

/** Deterministic, accent-insensitive, punctuation-stripped key for alias storage and lookup. */
export function normaliseAliasName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Whitespace-only normalisation used before exact/case-insensitive comparison.
 * - trims leading/trailing spaces
 * - collapses runs of internal whitespace into a single space
 * - does NOT lowercase or strip punctuation
 *
 * Never mutates the source employee record — the caller uses this only to
 * compare a copy of the built full-name against a copy of the CSV name.
 */
export function normaliseWhitespace(name: string): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

/** Statuses treated as "currently employable" for matcher/alias-target purposes. */
const EMPLOYABLE_STATUSES = new Set(["active", "starter", "onboarding"]);

// Legacy hardcoded alias map — kept for backward compatibility.
// New aliases should be stored on each employee record via import_aliases.
const LEGACY_NAME_MAP: Record<string, { forename: string; surname: string }> = {
  "sai": { forename: "Saicharan", surname: "Manepalli" },
  "maria": { forename: "Iara Maria", surname: "Moniz Ferreira" },
  "ruben": { forename: "Rubem", surname: "Pereira" },
  "vicky": { forename: "Viktoriia", surname: "Bastrakova" },
  "aris feliz": { forename: "Arisnorky", surname: "Feliz" },
  "joselin chala": { forename: "Jocelyne", surname: "Chala" },
  "jie-en": { forename: "Jie En", surname: "Loh" },
  "kitty": { forename: "Kitty", surname: "Oil Lan" },
  "ling chak": { forename: "Ling", surname: "Chak" },
  "nairobis de los sant…": { forename: "Nairobys", surname: "De los Santos" },
  "nairobis de los sant": { forename: "Nairobys", surname: "De los Santos" },
  "rehana": { forename: "Rheana", surname: "Rahim" },
  "sam": { forename: "Samnath", surname: "Thembareni" },
  "sreeja": { forename: "Sreeja", surname: "Vadlapudi" },
  "wing lee": { forename: "Wing", surname: "Lee" },
  "hafiz abdur rahim": { forename: "Hafiz", surname: "Rahim" },
  "luisa valenzuela": { forename: "Luisa", surname: "Valenzuela" },
  "nishanth thota": { forename: "Nishanth", surname: "Thota" },
  "arun kumar": { forename: "Arun", surname: "Thota" },
  "rithwik godishala": { forename: "Rithwik", surname: "Godishala" },
  "adriana baca": { forename: "Adriana", surname: "Baca" },
  "karl": { forename: "Karl Ted", surname: "Ledesma" },
  "daniela": { forename: "Daniela Patricia", surname: "Da Costa Almeida" },
  "sultan": { forename: "Sultan", surname: "Al Mabrur" },
  "ada": { forename: "Ada", surname: "Feliz" },
  "heidy": { forename: "Heidy", surname: "Ramos" },
  "marco": { forename: "Marco", surname: "Ribeiro" },
  "steven": { forename: "Steven", surname: "Cumba" },
  "afonso": { forename: "Afonso", surname: "Gomes" },
  "lissette": { forename: "Lissette", surname: "Paredes" },
  "wakako": { forename: "Wakako", surname: "Ashida" },
  "kazumi": { forename: "Kazumi", surname: "Ortega" },
  "fatima": { forename: "Fatima", surname: "Ashraf" },
  "varsha": { forename: "Varsha", surname: "Kumari" },
  "angel": { forename: "Yat Chun", surname: "Wong" },
  "antonela": { forename: "Tiffany Antonela", surname: "Bucheli Rubio" },
  "salma laroussi": { forename: "Salma", surname: "Laroussi Beniiche" },
  "kiara": { forename: "Kiara", surname: "Plaku" },
  "benjamin": { forename: "Benjamin", surname: "Gray" },
};

function sortActiveFirst(employees: MatchableEmployee[]): MatchableEmployee[] {
  return [...employees].sort((a, b) => {
    const rankOf = (e: MatchableEmployee) => {
      if (EMPLOYABLE_STATUSES.has(e.status)) return 0;
      if (e.status === "leaver") return 1;
      return 2; // archived or other
    };
    return rankOf(a) - rankOf(b);
  });
}

/**
 * Check if a non-leaver match exists at any tier below the current one.
 * Used to avoid returning a leaver match when an active/starter match
 * is available via alias, preferred name, or legacy map.
 */
function findNonLeaverFallback(
  nameLower: string,
  sorted: MatchableEmployee[]
): MatchResult | null {
  const active = sorted.filter(e => e.status !== "leaver");

  // alias match
  for (const emp of active) {
    const aliases = emp.import_aliases || [];
    if (aliases.some((a) => a.toLowerCase() === nameLower)) {
      return { employee: emp, method: "import_alias" };
    }
  }

  // preferred name
  const prefMatches = active.filter(
    (e) => e.preferred_name && e.preferred_name.toLowerCase() === nameLower
  );
  if (prefMatches.length === 1) {
    return { employee: prefMatches[0], method: "preferred_name" };
  }

  // legacy map
  const mapped = LEGACY_NAME_MAP[nameLower];
  if (mapped) {
    const mapMatch = active.find(
      (e) =>
        e.forename.toLowerCase() === mapped.forename.toLowerCase() &&
        e.surname.toLowerCase() === mapped.surname.toLowerCase()
    );
    if (mapMatch) return { employee: mapMatch, method: "legacy_name_map" };
  }

  return null;
}

export function matchEmployee(
  csvName: string,
  employees: MatchableEmployee[]
): MatchResult {
  const trimmed = normaliseWhitespace(csvName);
  const nameLower = trimmed.toLowerCase();
  const sorted = sortActiveFirst(employees);

  // 1. Exact full-name match (prefer active/starter over leaver).
  //    Whitespace-normalise both sides so a stray double space in the DB
  //    forename (e.g. "Carlos  David") still matches a single-space CSV name.
  const exact = sorted.find(
    (e) => normaliseWhitespace(`${e.forename} ${e.surname}`) === trimmed
  );
  if (exact) {
    // If matched a leaver, check if a non-leaver exists via alias/preferred/legacy
    if (exact.status === "leaver") {
      const fallback = findNonLeaverFallback(nameLower, sorted);
      if (fallback) return fallback;
    }
    return { employee: exact, method: "exact" };
  }

  // 2. Case-insensitive full-name match (whitespace-normalised).
  const ci = sorted.find(
    (e) => normaliseWhitespace(`${e.forename} ${e.surname}`).toLowerCase() === nameLower
  );
  if (ci) {
    // If matched a leaver, check if a non-leaver exists via alias/preferred/legacy
    if (ci.status === "leaver") {
      const fallback = findNonLeaverFallback(nameLower, sorted);
      if (fallback) return fallback;
    }
    return { employee: ci, method: "case_insensitive" };
  }

  // 3. Email match
  if (nameLower.includes("@")) {
    const emailMatch = sorted.find(
      (e) => e.email && e.email.toLowerCase() === nameLower
    );
    if (emailMatch) return { employee: emailMatch, method: "email" };
  }

  // 4. Import alias match (from DB)
  for (const emp of sorted) {
    const aliases = emp.import_aliases || [];
    if (aliases.some((a) => a.toLowerCase() === nameLower)) {
      return { employee: emp, method: "import_alias" };
    }
  }

  // 5. Preferred name match
  const prefMatches = sorted.filter(
    (e) => e.preferred_name && e.preferred_name.toLowerCase() === nameLower
  );
  // Only use if exactly one match (avoid ambiguity)
  if (prefMatches.length === 1) {
    return { employee: prefMatches[0], method: "preferred_name" };
  }

  // 6. Legacy NAME_MAP fallback
  const mapped = LEGACY_NAME_MAP[nameLower];
  if (mapped) {
    const mapMatch = sorted.find(
      (e) =>
        e.forename.toLowerCase() === mapped.forename.toLowerCase() &&
        e.surname.toLowerCase() === mapped.surname.toLowerCase()
    );
    if (mapMatch) return { employee: mapMatch, method: "legacy_name_map" };
  }

  return { employee: undefined, method: "none" };
}

/**
 * Full-priority matcher for a timesheet row.
 *
 * Priority:
 *   1. Employee ID (file column)
 *   2. Email (file column)
 *   3. Saved alias (payroll_import_aliases — active only)
 *   4. Exact / case-insensitive full-name (unique active)
 *   5. Strong unique likely match (import_alias / preferred_name / legacy map)
 *   6. -> manual (caller must collect manager selection)
 *
 * Conflict rules:
 *   - If ID and email are both present and resolve to different employees -> requiresReview.
 *   - If a saved alias points to a different employee than ID/email in the same row -> alias ignored, requiresReview.
 *   - If saved-alias target is inactive (leaver / archived) -> requiresReview, no auto-apply.
 *   - If saved alias is_active = false -> ignored.
 */
export function matchEmployeeRow(
  row: ImportRow,
  employees: MatchableEmployee[],
  savedAliases: SavedAlias[] = []
): MatchResult {
  const byId = row.employeeId
    ? employees.find((e) => e.id === row.employeeId)
    : undefined;
  const byEmail =
    row.email && row.email.includes("@")
      ? employees.find(
          (e) => e.email && e.email.toLowerCase() === row.email!.toLowerCase()
        )
      : undefined;

  // Hard conflict: ID and email both present and disagree.
  if (byId && byEmail && byId.id !== byEmail.id) {
    return {
      employee: undefined,
      method: "none",
      requiresReview: true,
      reviewReason: "Employee ID and email in the file point to different employees.",
    };
  }

  // 1. Employee ID wins (overrides aliases).
  if (byId) return { employee: byId, method: "employee_id" };

  // 2. Email wins (overrides aliases).
  if (byEmail) return { employee: byEmail, method: "email" };

  // 3. Saved alias.
  const norm = normaliseAliasName(row.name);
  const alias = savedAliases.find(
    (a) => a.is_active && a.normalised_timesheet_name === norm
  );
  if (alias) {
    const target = employees.find((e) => e.id === alias.employee_id);
    if (!target) {
      return {
        employee: undefined,
        method: "none",
        requiresReview: true,
        reviewReason: "Saved alias points to an employee that no longer exists.",
      };
    }
    if (!EMPLOYABLE_STATUSES.has(target.status)) {
      return {
        employee: target,
        method: "saved_alias",
        requiresReview: true,
        reviewReason: `Saved alias points to an inactive employee (${target.status}).`,
      };
    }
    // Onboarding requires explicit manager confirmation before import.
    if (target.status === "onboarding") {
      return {
        employee: target,
        method: "saved_alias",
        requiresReview: true,
        reviewReason: "Onboarding — confirm before import.",
      };
    }
    return { employee: target, method: "saved_alias" };
  }

  // 4-5. Fall back to name-based matcher.
  const nameMatch = matchEmployee(row.name, employees);
  // Onboarding employees must be confirmed unless the match is exact/case-insensitive.
  if (
    nameMatch.employee &&
    nameMatch.employee.status === "onboarding" &&
    nameMatch.method !== "exact" &&
    nameMatch.method !== "case_insensitive"
  ) {
    return {
      ...nameMatch,
      requiresReview: true,
      reviewReason: "Onboarding — confirm before import.",
    };
  }
  return nameMatch;
}

/** Detect ambiguous mappings: same target employee selected for >1 different raw names. */
export function findDuplicateTargets(
  decisions: Array<{ csvName: string; employeeId: string | null }>
): Array<{ employeeId: string; csvNames: string[] }> {
  const byTarget = new Map<string, string[]>();
  for (const d of decisions) {
    if (!d.employeeId) continue;
    const arr = byTarget.get(d.employeeId) ?? [];
    arr.push(d.csvName);
    byTarget.set(d.employeeId, arr);
  }
  return Array.from(byTarget.entries())
    .filter(([, names]) => names.length > 1)
    .map(([employeeId, csvNames]) => ({ employeeId, csvNames }));
}

/** Active employees from DB not represented in the imported file. Warning only. */
export function findMissingActiveEmployees(
  employees: MatchableEmployee[],
  matchedEmployeeIds: Iterable<string>
): MatchableEmployee[] {
  const matched = new Set(matchedEmployeeIds);
  return employees.filter(
    (e) => (e.status === "active" || e.status === "starter") && !matched.has(e.id)
  );
}

