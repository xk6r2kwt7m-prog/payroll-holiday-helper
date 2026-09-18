import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  assessConflict, orderByAuthority, sourcePriority, canScoreDishQuestion,
  ALLERGEN_SOURCE_RANKS, type RankedSourceStatement,
} from "@/lib/allergen-sources";
import {
  DRAFT_DISH_LINES, DRAFT_LESSON_STATEMENTS, DRAFT_QUESTIONS, DRAFT_PRACTICAL_SIGNOFF,
} from "@/data/allergen/ud-allergen-draft";

const hook = readFileSync("src/hooks/useAllergenLibrary.ts", "utf8");
const ui = readFileSync("src/components/compliance/allergen/AllergenTrainingReview.tsx", "utf8");
const migration = readFileSync(
  "drizzle/migrations/0021_allergen_source_library_and_course_versions.sql",
  "utf8",
);

const st = (rank: string, statement: string, date?: string): RankedSourceStatement => ({
  source_id: null, source_title: rank, source_rank: rank, source_date: date ?? null, statement,
});

describe("source priority", () => {
  it("orders packaging above matrix, recipe, procedure and history", () => {
    expect(ALLERGEN_SOURCE_RANKS.map((r) => r.value)).toEqual([
      "packaging_supplier", "allergen_matrix", "recipe", "operational_procedure", "historical",
    ]);
    expect(sourcePriority("packaging_supplier")).toBeLessThan(sourcePriority("allergen_matrix"));
    expect(sourcePriority("historical")).toBeGreaterThan(sourcePriority("operational_procedure"));
  });

  it("puts the strongest source first regardless of input order", () => {
    const ordered = orderByAuthority([
      st("historical", "old"), st("packaging_supplier", "label"), st("recipe", "recipe"),
    ]);
    expect(ordered[0].statement).toBe("label");
    expect(ordered[2].statement).toBe("old");
  });

  it("prefers the more recent document when ranks match", () => {
    const ordered = orderByAuthority([
      st("allergen_matrix", "older", "2024-10-01"),
      st("allergen_matrix", "newer", "2026-07-01"),
    ]);
    expect(ordered[0].statement).toBe("newer");
  });

  it("never lets an undated source outrank a dated one of the same rank", () => {
    const ordered = orderByAuthority([
      st("recipe", "undated"), st("recipe", "dated", "2026-01-01"),
    ]);
    expect(ordered[0].statement).toBe("dated");
  });
});

describe("conflict detection", () => {
  it("does not raise a conflict when sources agree, ignoring punctuation", () => {
    const a = assessConflict([
      st("allergen_matrix", "Peanuts; soya."), st("recipe", "peanuts, soya"),
    ]);
    expect(a.hasConflict).toBe(false);
  });

  it("raises a conflict and recommends the higher-ranked wording", () => {
    const a = assessConflict([
      st("historical", "Contains tree nuts", "2024-10-01"),
      st("allergen_matrix", "Contains peanuts, not tree nuts", "2026-07-01"),
    ]);
    expect(a.hasConflict).toBe(true);
    expect(a.recommended?.statement).toBe("Contains peanuts, not tree nuts");
    expect(a.needsAdminDecision).toBe(false);
  });

  it("an older document can never overwrite silently: it only produces a conflict", () => {
    const a = assessConflict([
      st("packaging_supplier", "No peanuts", "2026-08-01"),
      st("historical", "Contains peanuts", "2020-01-01"),
    ]);
    expect(a.hasConflict).toBe(true);
    expect(a.recommended?.source_rank).toBe("packaging_supplier");
  });

  it("marks equal-standing disagreement as needing an administrator decision", () => {
    const a = assessConflict([
      st("recipe", "Contains sesame", "2026-01-01"),
      st("recipe", "No sesame", "2026-01-01"),
    ]);
    expect(a.needsAdminDecision).toBe(true);
    expect(a.recommended).toBeNull();
  });

  it("marks a missing date at the same rank as needing a decision", () => {
    const a = assessConflict([st("recipe", "Contains sesame"), st("recipe", "No sesame")]);
    expect(a.needsAdminDecision).toBe(true);
  });
});

describe("scored dish questions", () => {
  const branch = "11111111-1111-1111-1111-111111111111";
  it("are suppressed for an unconfirmed dish", () => {
    expect(canScoreDishQuestion({ is_confirmed: false, active_branch_ids: [branch] }, branch)).toBe(false);
  });
  it("are suppressed where the dish is not live at that branch", () => {
    expect(canScoreDishQuestion({ is_confirmed: true, active_branch_ids: [] }, branch)).toBe(false);
  });
  it("are allowed for a confirmed dish live at that branch", () => {
    expect(canScoreDishQuestion({ is_confirmed: true, active_branch_ids: [branch] }, branch)).toBe(true);
  });
});

describe("drafted content keeps every documented flavour and its source", () => {
  it("keeps unavailable, branch-only and extra items", () => {
    const names = DRAFT_DISH_LINES.map((d) => d.dish_name);
    for (const n of ["Curry Goat", "Biscoff Banana", "Corn Fritters", "Sichuan Vegan Pork Dumplings", "House Chilli Oil", "Wine"]) {
      expect(names).toContain(n);
    }
  });

  it("records every dish, statement and question against a source", () => {
    for (const d of DRAFT_DISH_LINES) expect(d.source_note.length).toBeGreaterThan(5);
    for (const s of [...DRAFT_LESSON_STATEMENTS, ...DRAFT_PRACTICAL_SIGNOFF]) expect(s.source_note.length).toBeGreaterThan(5);
    for (const q of DRAFT_QUESTIONS) expect(q.source_note.length).toBeGreaterThan(5);
  });

  it("treats peanuts and tree nuts separately for Satay Chicken and Nutella", () => {
    const satay = DRAFT_DISH_LINES.find((d) => d.dish_name === "Satay Chicken")!;
    expect(satay.regulated_allergens).toContain("Peanuts");
    expect(satay.regulated_allergens.join()).not.toMatch(/Tree nuts/);
    expect(satay.cross_contact_note).toMatch(/separate allergens/i);
    const nutella = DRAFT_DISH_LINES.find((d) => d.dish_name === "Nutella sweet dumpling")!;
    expect(nutella.regulated_allergens).toContain("Peanuts");
    expect(nutella.regulated_allergens).toContain("Tree nuts");
    expect(nutella.cross_contact_note).toMatch(/hazelnut only/i);
  });

  it("covers the shared dessert fryer, remake rule and outside-the-14 allergies", () => {
    const refs = DRAFT_LESSON_STATEMENTS.map((s) => s.target_ref);
    for (const r of [
      "shared-fryer", "remake-rule", "outside-14", "peanuts-vs-tree-nuts", "gf-equipment",
      "ask-every-table", "record-exact-detail", "pos-tags", "fresh-ticket", "acknowledgement",
      "emergency-response", "shared-equipment", "regulated-14",
    ]) expect(refs).toContain(r);
    const outside = DRAFT_LESSON_STATEMENTS.find((s) => s.target_ref === "outside-14")!;
    expect(outside.proposed_text).toMatch(/garlic, onion and mushrooms/i);
  });

  it("only drafts dish questions for dishes that exist in the reference", () => {
    const names = new Set(DRAFT_DISH_LINES.map((d) => d.dish_name));
    for (const q of DRAFT_QUESTIONS.filter((q) => q.dish_name)) {
      expect(names.has(q.dish_name!)).toBe(true);
    }
  });
});

describe("nothing publishes or overwrites without approval", () => {
  it("proposals are created with status 'proposed' only", () => {
    expect(hook).toMatch(/status: "proposed"/);
  });

  it("publishing only ever uses approved proposals", () => {
    expect(hook).toMatch(/\.eq\("status", "approved"\)/);
    expect(hook).toMatch(/There are no approved changes to publish/);
  });

  it("the import writes proposals and reference rows, never course content", () => {
    expect(hook).not.toMatch(/from\("training_library"\)[\s\S]{0,120}\.update\(/);
    expect(hook).toMatch(/never publishes anything/);
  });

  it("re-running the import does not duplicate items", () => {
    expect(hook).toMatch(/haveRef\.has/);
    expect(hook).toMatch(/haveDish\.has/);
    expect(hook).toMatch(/haveSubject\.has/);
  });

  it("drafted dishes arrive unconfirmed so no question is scored on them", () => {
    expect(hook).toMatch(/is_confirmed: false/);
    expect(ui).toMatch(/Unconfirmed — awaiting approved matrix/);
  });

  it("published versions are permanent records in the database", () => {
    expect(migration).toMatch(/allergen_course_versions_immutable/);
    expect(migration).toMatch(/cannot be changed or deleted/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.allergen_course_versions/);
  });

  it("every new table is tenant scoped with row level security and grants", () => {
    for (const t of [
      "allergen_sources", "allergen_dish_reference", "allergen_conflicts",
      "allergen_change_proposals", "allergen_course_versions",
    ]) {
      expect(migration).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(migration).toMatch(new RegExp(`GRANT SELECT[^;]*ON public\\.${t} TO authenticated`));
      expect(migration).toMatch(new RegExp(`is_tenant_member|is_tenant_admin`));
    }
  });

  it("only administrators may approve or publish", () => {
    expect(migration).toMatch(/Tenant admins manage allergen change proposals/);
    expect(migration).toMatch(/Tenant admins publish allergen course versions/);
  });

  it("the review screen tells the administrator nothing reaches staff without approval", () => {
    expect(ui).toMatch(/Nothing reaches staff/i);
    expect(ui).toMatch(/completion\s+records and certificates|completion records/i);
    expect(ui).toMatch(/Staff are not contacted by publishing/);
  });

  it("original documents are never deleted, renamed or overwritten", () => {
    expect(ui).toMatch(/never deleted, renamed or overwritten/);
    expect(hook).not.toMatch(/storage\.from\([^)]*\)\.remove/);
    expect(hook).not.toMatch(/from\("compliance_documents"\)[\s\S]{0,160}\.(update|delete)\(/);
  });
});
