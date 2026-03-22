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
}

export type MatchMethod =
  | "exact"
  | "case_insensitive"
  | "email"
  | "import_alias"
  | "preferred_name"
  | "legacy_name_map"
  | "none";

export interface MatchResult {
  employee: MatchableEmployee | undefined;
  method: MatchMethod;
}

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
      if (e.status === "active" || e.status === "starter") return 0;
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
  const trimmed = csvName.trim();
  const nameLower = trimmed.toLowerCase();
  const sorted = sortActiveFirst(employees);

  // 1. Exact full-name match
  const exact = sorted.find(
    (e) => `${e.forename} ${e.surname}` === trimmed
  );
  if (exact) return { employee: exact, method: "exact" };

  // 2. Case-insensitive full-name match
  const ci = sorted.find(
    (e) => `${e.forename} ${e.surname}`.toLowerCase() === nameLower
  );
  if (ci) return { employee: ci, method: "case_insensitive" };

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
