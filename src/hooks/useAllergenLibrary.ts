import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { logComplianceAudit } from "@/hooks/useCompliance";
import {
  DRAFT_DISH_LINES,
  DRAFT_LESSON_STATEMENTS,
  DRAFT_QUESTIONS,
  DRAFT_PRACTICAL_SIGNOFF,
  UD_COURSE_DOCUMENT_TITLE,
} from "@/data/allergen/ud-allergen-draft";
import { assessConflict, type RankedSourceStatement } from "@/lib/allergen-sources";
import {
  JULY_2026_MENU_SOURCES, menuSitesForDish, resolveSiteBranchIds,
} from "@/data/allergen/ud-july-2026-menus";

export interface AllergenSource {
  id: string;
  tenant_id: string;
  compliance_document_id: string | null;
  title: string;
  source_rank: string;
  source_version: string | null;
  source_date: string | null;
  is_current: boolean;
  note: string | null;
  created_at: string;
}

export type DishRecommendedStatus =
  | "ready_to_confirm" | "needs_correction" | "reference_only" | "needs_evidence";
export type DishManagementDecision =
  | "confirm" | "correct" | "reference_only" | "needs_evidence";

export interface AllergenDish {
  id: string;
  tenant_id: string;
  dish_name: string;
  dish_kind: string;
  regulated_allergens: string[];
  other_allergens: string[];
  cross_contact_note: string | null;
  availability_note: string | null;
  active_branch_ids: string[];
  is_confirmed: boolean;
  source_id: string | null;
  source_note: string | null;
  /* Comparison against the approved allergen matrix (additive, review only). */
  matrix_source_id: string | null;
  matrix_declaration: string | null;
  garnish_only_allergens: string[];
  removable_components: string | null;
  dough_sauce_allergens: string | null;
  comparison_note: string | null;
  recommended_status: DishRecommendedStatus | null;
  management_decision: DishManagementDecision | null;
  decision_note: string | null;
  decided_at: string | null;
}

export interface AllergenConflict {
  id: string;
  tenant_id: string;
  subject: string;
  subject_kind: string;
  statements: RankedSourceStatement[];
  recommended_wording: string | null;
  affected_lessons: string[];
  affected_questions: string[];
  needs_admin_decision: boolean;
  status: string;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AllergenProposal {
  id: string;
  tenant_id: string;
  change_type: string;
  target_kind: string;
  target_ref: string | null;
  target_label: string;
  current_text: string | null;
  proposed_text: string;
  rationale: string | null;
  source_ids: string[];
  conflict_id: string | null;
  status: string;
  decision_note: string | null;
  decided_at: string | null;
  published_version: number | null;
  created_at: string;
}

export interface AllergenCourseVersion {
  id: string;
  tenant_id: string;
  version: number;
  review_date: string | null;
  content: any;
  source_map: any;
  approved_proposal_ids: string[];
  published_at: string;
  note: string | null;
}

/* ───────────────────────── Sources ───────────────────────── */

export function useAllergenSources() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-sources", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_sources")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenSource[];
    },
  });
}

export function useSaveAllergenSource() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AllergenSource> & { title: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const payload = { ...input, tenant_id: tenantId };
      if (input.id) {
        const { error } = await supabase
          .from("allergen_sources")
          .update(payload as any)
          .eq("id", input.id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
        await logComplianceAudit({
          tenantId, table: "allergen_sources", recordId: input.id,
          event: "allergen_source_edited", note: `Allergen source updated: ${input.title}`,
        });
        return input.id;
      }
      const { data, error } = await supabase
        .from("allergen_sources")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      await logComplianceAudit({
        tenantId, table: "allergen_sources", recordId: data.id,
        event: "allergen_source_added", note: `Allergen source added: ${input.title}`,
      });
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-sources"] });
    },
  });
}

/* ──────────────────── Dish and flavour reference ──────────────────── */

export function useAllergenDishes() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-dishes", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_dish_reference")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("dish_kind", { ascending: true })
        .order("dish_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenDish[];
    },
  });
}

export function useSaveAllergenDish() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AllergenDish> & { id: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("allergen_dish_reference")
        .update(rest as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      await logComplianceAudit({
        tenantId, table: "allergen_dish_reference", recordId: id,
        event: "allergen_dish_edited", note: `Dish reference updated: ${input.dish_name ?? id}`,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-dishes"] }),
  });
}

/* ───────────────────────── Conflicts ───────────────────────── */

export function useAllergenConflicts() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-conflicts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_conflicts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenConflict[];
    },
  });
}

export function useResolveAllergenConflict() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "resolved" | "dismissed"; note: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("allergen_conflicts")
        .update({
          status: input.status,
          resolution_note: input.note,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
        })
        .eq("id", input.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      await logComplianceAudit({
        tenantId, table: "allergen_conflicts", recordId: input.id,
        event: "allergen_conflict_resolved",
        note: `Allergen conflict ${input.status}: ${input.note}`,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-conflicts"] }),
  });
}

/* ───────────────────────── Proposals ───────────────────────── */

export function useAllergenProposals() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-proposals", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_change_proposals")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenProposal[];
    },
  });
}

export function useDecideAllergenProposal() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ids: string[];
      status: "approved" | "rejected" | "sent_back";
      note?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("allergen_change_proposals")
        .update({
          status: input.status,
          decision_note: input.note ?? null,
          decided_at: new Date().toISOString(),
          decided_by: user?.id ?? null,
        })
        .in("id", input.ids)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      for (const id of input.ids) {
        await logComplianceAudit({
          tenantId, table: "allergen_change_proposals", recordId: id,
          event: "allergen_proposal_decided",
          note: `Allergen change proposal ${input.status}${input.note ? `: ${input.note}` : ""}`,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-proposals"] }),
  });
}

/* ─────────────── Course versions (published, immutable) ─────────────── */

export function useAllergenCourseVersions() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-course-versions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_course_versions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenCourseVersion[];
    },
  });
}

/**
 * Publishes a new course version from the APPROVED proposals only.
 * Previous versions, completion records and certificates are untouched:
 * a new row is inserted and published rows can never be updated or deleted.
 */
export function usePublishAllergenCourseVersion() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewDate: string | null; note?: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: approved, error: pErr }, { data: versions, error: vErr }, { data: dishes, error: dErr }] =
        await Promise.all([
          supabase.from("allergen_change_proposals").select("*").eq("tenant_id", tenantId).eq("status", "approved"),
          supabase.from("allergen_course_versions").select("version").eq("tenant_id", tenantId).order("version", { ascending: false }).limit(1),
          supabase.from("allergen_dish_reference").select("*").eq("tenant_id", tenantId),
        ]);
      if (pErr) throw pErr;
      if (vErr) throw vErr;
      if (dErr) throw dErr;
      if (!approved?.length) {
        throw new Error("There are no approved changes to publish.");
      }

      const nextVersion = ((versions?.[0] as any)?.version ?? 0) + 1;
      const rows = approved as any[];
      const content = {
        lessons: rows.filter((r) => r.target_kind === "lesson").map((r) => ({
          ref: r.target_ref, label: r.target_label, text: r.proposed_text,
        })),
        questions: rows.filter((r) => r.target_kind === "question").map((r) => ({
          ref: r.target_ref, label: r.target_label, text: r.proposed_text,
        })),
        practical_signoff: rows.filter((r) => r.target_kind === "practical_signoff").map((r) => ({
          ref: r.target_ref, label: r.target_label, text: r.proposed_text,
        })),
        emergency_procedure: rows.filter((r) => r.target_kind === "emergency_procedure").map((r) => ({
          ref: r.target_ref, label: r.target_label, text: r.proposed_text,
        })),
        dish_reference: (dishes ?? []).map((d: any) => ({
          dish_name: d.dish_name,
          dish_kind: d.dish_kind,
          regulated_allergens: d.regulated_allergens,
          other_allergens: d.other_allergens,
          cross_contact_note: d.cross_contact_note,
          availability_note: d.availability_note,
          active_branch_ids: d.active_branch_ids,
          is_confirmed: d.is_confirmed,
          source_note: d.source_note,
        })),
      };
      const source_map = rows.reduce<Record<string, string[]>>((acc, r) => {
        acc[r.target_ref ?? r.id] = r.source_ids ?? [];
        return acc;
      }, {});

      const { data: inserted, error } = await supabase
        .from("allergen_course_versions")
        .insert({
          tenant_id: tenantId,
          version: nextVersion,
          review_date: input.reviewDate,
          content,
          source_map,
          approved_proposal_ids: rows.map((r) => r.id),
          published_by: user?.id ?? null,
          note: input.note ?? null,
        } as any)
        .select("id, version")
        .single();
      if (error) throw error;

      const { error: markErr } = await supabase
        .from("allergen_change_proposals")
        .update({ status: "published", published_version: nextVersion })
        .in("id", rows.map((r) => r.id))
        .eq("tenant_id", tenantId);
      if (markErr) throw markErr;

      await logComplianceAudit({
        tenantId, table: "allergen_course_versions", recordId: inserted.id,
        event: "allergen_course_published",
        note: `Allergen course version ${nextVersion} published with ${rows.length} approved change(s). Previous versions, completions and certificates preserved.`,
      });
      return inserted;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-course-versions"] });
      qc.invalidateQueries({ queryKey: ["allergen-proposals"] });
    },
  });
}

/* ─────────── Building proposals from the uploaded documents ─────────── */

/**
 * Reads the uploaded allergen documents already in the compliance library and
 * turns the drafted content into PROPOSALS only. It never writes course
 * content, never edits a source document and never publishes anything.
 * Re-running it does not duplicate items that are already proposed.
 */
export function useBuildAllergenProposals() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");

      /* 1. Register the uploaded documents as sources (once each). */
      const { data: docs, error: docErr } = await supabase
        .from("compliance_documents")
        .select("id, name, version, issue_date, category, created_at")
        .eq("tenant_id", tenantId)
        .is("archived_at", null);
      if (docErr) throw docErr;

      const { data: existingSources, error: sErr } = await supabase
        .from("allergen_sources")
        .select("id, title, compliance_document_id, source_rank, source_version, source_date")
        .eq("tenant_id", tenantId);
      if (sErr) throw sErr;

      const relevant = (docs ?? []).filter((d: any) =>
        /allerg|food safety|haccp|ingredient|recipe|matrix|service|emergency|first aid/i.test(
          `${d.name} ${d.category ?? ""}`,
        ),
      );
      const known = new Set((existingSources ?? []).map((s: any) => s.compliance_document_id).filter(Boolean));
      const newSources = relevant
        .filter((d: any) => !known.has(d.id))
        .map((d: any) => ({
          tenant_id: tenantId,
          compliance_document_id: d.id,
          title: d.name,
          /* Unclassified on arrival: an administrator sets the real rank. */
          source_rank: /matrix/i.test(d.name) ? "allergen_matrix" : "historical",
          source_version: d.version ?? null,
          source_date: d.issue_date ?? null,
          is_current: false,
          note: "Added automatically from the compliance library. Set its priority and confirm whether it is current.",
        }));
      if (newSources.length) {
        const { error } = await supabase.from("allergen_sources").insert(newSources as any);
        if (error) throw error;
      }

      /* Course document itself, so every drafted item has a source to cite. */
      let courseSource = (existingSources ?? []).find((s: any) => s.title === UD_COURSE_DOCUMENT_TITLE);
      if (!courseSource) {
        const { data, error } = await supabase
          .from("allergen_sources")
          .insert({
            tenant_id: tenantId,
            title: UD_COURSE_DOCUMENT_TITLE,
            source_rank: "operational_procedure",
            is_current: true,
            note: "Approved course and assessment document supplied by management. Quotes the July 2026 allergen matrix.",
          } as any)
          .select("id, title, compliance_document_id, source_rank, source_version, source_date")
          .single();
        if (error) throw error;
        courseSource = data as any;
      }
      const courseSourceId = (courseSource as any).id as string;

      /* 2. Dish and flavour reference — every documented flavour kept. */
      const { data: currentDishes, error: cdErr } = await supabase
        .from("allergen_dish_reference")
        .select("id, dish_name")
        .eq("tenant_id", tenantId);
      if (cdErr) throw cdErr;
      const haveDish = new Set((currentDishes ?? []).map((d: any) => d.dish_name));
      const dishRows = DRAFT_DISH_LINES.filter((d) => !haveDish.has(d.dish_name)).map((d) => ({
        tenant_id: tenantId,
        dish_name: d.dish_name,
        dish_kind: d.dish_kind,
        regulated_allergens: d.regulated_allergens,
        other_allergens: d.other_allergens,
        cross_contact_note: d.cross_contact_note ?? null,
        availability_note: d.availability_note ?? null,
        active_branch_ids: [],
        /* Unconfirmed until the approved matrix is uploaded as a source. */
        is_confirmed: false,
        source_id: courseSourceId,
        source_note: d.source_note,
      }));
      if (dishRows.length) {
        const { error } = await supabase.from("allergen_dish_reference").insert(dishRows as any);
        if (error) throw error;
      }

      /* 3. Proposals — nothing reaches staff without approval. */
      const { data: existingProposals, error: epErr } = await supabase
        .from("allergen_change_proposals")
        .select("target_ref, status")
        .eq("tenant_id", tenantId);
      if (epErr) throw epErr;
      const haveRef = new Set((existingProposals ?? []).map((p: any) => p.target_ref));

      const proposals = [
        ...DRAFT_LESSON_STATEMENTS.map((s) => ({
          target_kind: "lesson" as const,
          target_ref: s.target_ref,
          target_label: s.target_label,
          proposed_text: s.proposed_text,
          rationale: s.source_note,
        })),
        ...DRAFT_PRACTICAL_SIGNOFF.map((s) => ({
          target_kind: "practical_signoff" as const,
          target_ref: s.target_ref,
          target_label: s.target_label,
          proposed_text: s.proposed_text,
          rationale: s.source_note,
        })),
        ...DRAFT_QUESTIONS.map((q) => ({
          target_kind: "question" as const,
          target_ref: q.target_ref,
          target_label: `${q.critical ? "Critical question" : "Question"}${q.dish_name ? ` (${q.dish_name})` : ""}: ${q.question}`,
          proposed_text: `${q.question}\nRequired answer: ${q.required_answer}`,
          rationale: q.source_note,
        })),
      ]
        .filter((p) => !haveRef.has(p.target_ref))
        .map((p) => ({
          tenant_id: tenantId,
          change_type: "addition",
          target_kind: p.target_kind,
          target_ref: p.target_ref,
          target_label: p.target_label,
          current_text: null,
          proposed_text: p.proposed_text,
          rationale: p.rationale,
          source_ids: [courseSourceId],
          status: "proposed",
        }));
      if (proposals.length) {
        const { error } = await supabase.from("allergen_change_proposals").insert(proposals as any);
        if (error) throw error;
      }

      /* 4. Conflicts raised where documents genuinely disagree. */
      const conflicts = await buildConflicts(tenantId, courseSourceId);

      return {
        sourcesAdded: newSources.length,
        dishesAdded: dishRows.length,
        proposalsAdded: proposals.length,
        conflictsAdded: conflicts,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-sources"] });
      qc.invalidateQueries({ queryKey: ["allergen-dishes"] });
      qc.invalidateQueries({ queryKey: ["allergen-proposals"] });
      qc.invalidateQueries({ queryKey: ["allergen-conflicts"] });
    },
  });
}

/**
 * Raises a conflict for every dish where the older ingredient list records
 * something the current matrix extract does not. The priority rules decide the
 * recommended wording; ties are marked as needing an administrator decision.
 */
async function buildConflicts(tenantId: string, courseSourceId: string): Promise<number> {
  const { data: existing } = await supabase
    .from("allergen_conflicts")
    .select("subject")
    .eq("tenant_id", tenantId);
  const haveSubject = new Set((existing ?? []).map((c: any) => c.subject));

  const unconfirmed = DRAFT_DISH_LINES.filter(
    (d) => d.regulated_allergens.length === 0 && /October 2024/i.test(d.source_note),
  );

  const rows = unconfirmed
    .filter((d) => !haveSubject.has(d.dish_name))
    .map((d) => {
      const statements: RankedSourceStatement[] = [
        {
          source_id: courseSourceId,
          source_title: UD_COURSE_DOCUMENT_TITLE,
          source_rank: "operational_procedure",
          source_date: null,
          statement: "This flavour is not listed in the current approved matrix extract.",
        },
        {
          source_id: null,
          source_title: "October 2024 ingredient list",
          source_rank: "historical",
          source_date: "2024-10-01",
          statement: "This flavour is listed, but its allergens are recorded only in the older document.",
        },
      ];
      const assessment = assessConflict(statements);
      return {
        tenant_id: tenantId,
        subject: d.dish_name,
        subject_kind: "dish",
        statements: statements as any,
        recommended_wording:
          "Keep as reference only. Do not score any question on this flavour until an approved matrix or recipe confirms its allergens.",
        affected_lessons: [],
        affected_questions: [],
        needs_admin_decision: assessment.needsAdminDecision,
        status: "open",
      };
    });

  if (rows.length) {
    const { error } = await supabase.from("allergen_conflicts").insert(rows as any);
    if (error) throw error;
  }
  return rows.length;
}

/* ─────────────── July 2026 customer menus → which sites sell what ───────────────
 * The menus decide availability only. They are never treated as an allergen
 * authority: allergen wording still comes from the approved matrix, supplier
 * specifications and recipes, and a flavour stays unconfirmed until that matrix
 * is uploaded. Nothing here publishes a course version or contacts staff.
 */
export function useApplyJulyMenus() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (branches: { id: string; name: string }[]) => {
      if (!tenantId) throw new Error("No tenant");

      /* 1. Record both menus as sources, once each. */
      const { data: existingSources, error: sErr } = await supabase
        .from("allergen_sources")
        .select("id, title")
        .eq("tenant_id", tenantId);
      if (sErr) throw sErr;
      const haveTitle = new Set((existingSources ?? []).map((s: any) => s.title));
      const newSources = JULY_2026_MENU_SOURCES.filter((m) => !haveTitle.has(m.title)).map((m) => ({
        tenant_id: tenantId,
        title: m.title,
        source_rank: "operational_procedure",
        source_version: "July 2026",
        source_date: m.source_date,
        is_current: true,
        note: `Customer menu used for availability only, not for allergen wording. ${m.url}`,
      }));
      if (newSources.length) {
        const { error } = await supabase.from("allergen_sources").insert(newSources as any);
        if (error) throw error;
      }

      /* 2. Set the live sites for each flavour from the menus. */
      const { data: dishes, error: dErr } = await supabase
        .from("allergen_dish_reference")
        .select("id, dish_name, active_branch_ids, availability_note")
        .eq("tenant_id", tenantId);
      if (dErr) throw dErr;

      let updated = 0;
      const notOnMenu: string[] = [];
      const unmatchedSites = new Set<string>();

      for (const d of (dishes ?? []) as any[]) {
        const sites = menuSitesForDish(d.dish_name);
        if (sites.length === 0) { notOnMenu.push(d.dish_name); continue; }
        const { ids, unmatched } = resolveSiteBranchIds(sites, branches);
        unmatched.forEach((u) => unmatchedSites.add(u));
        if (ids.length === 0) continue;
        const before = [...(d.active_branch_ids ?? [])].sort().join(",");
        if (before === [...ids].sort().join(",")) continue;
        const { error } = await supabase
          .from("allergen_dish_reference")
          .update({ active_branch_ids: ids })
          .eq("id", d.id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
        updated += 1;
      }

      await logComplianceAudit({
        tenantId, table: "allergen_dish_reference", recordId: tenantId,
        event: "allergen_dish_edited",
        note:
          `July 2026 customer menus applied: ${updated} flavour(s) had their live sites set ` +
          `(Carnaby, Brixton, Fitzrovia only). ${notOnMenu.length} flavour(s) are not on either menu and ` +
          `remain reference only. Menus recorded for availability, not as an allergen authority. ` +
          `No course version published.`,
      });

      return { updated, notOnMenu, unmatchedSites: Array.from(unmatchedSites) };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-dishes"] });
      qc.invalidateQueries({ queryKey: ["allergen-sources"] });
    },
  });
}
