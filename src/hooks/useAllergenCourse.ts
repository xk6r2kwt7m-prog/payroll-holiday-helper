/**
 * Ugly Dumpling Allergen Safety — Phase 1 data layer.
 *
 * Reads and writes only the new, additive tables:
 *   allergen_course_drafts, allergen_lesson_progress,
 *   allergen_assessment_attempts, allergen_coaching_records.
 *
 * It never publishes a course version, never creates a training assignment,
 * never issues a certificate and never sends anything to anybody.
 * Test-mode rows are written with is_test = true and are always kept apart.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";
import { ALLERGEN_SAFETY_LESSONS, ALLERGEN_COURSE_TITLE } from "@/data/allergen/allergen-safety-lessons";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import { PRACTICAL_SIGNOFF_TEMPLATE } from "@/data/allergen/allergen-practical-signoff";
import {
  compareCourseContent, type VersionComparison, EXCLUDED_FROM_SCORING,
} from "@/lib/allergen-course";

export interface AllergenCourseDraft {
  id: string;
  tenant_id: string;
  based_on_version: number | null;
  proposed_version: number;
  status: string;
  content: any;
  source_map: any;
  comparison: VersionComparison | any;
  confirmed_dish_ids: string[];
  excluded_from_scoring: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllergenLessonProgressRow {
  id: string;
  lesson_ref: string;
  completed_sections: string[];
  total_sections: number;
  is_complete: boolean;
  is_test: boolean;
  course_version: number | null;
  last_seen_at: string;
}

export interface AllergenAttemptRow {
  id: string;
  attempt_number: number;
  status: string;
  outcome: string | null;
  score_percent: number | null;
  critical_missed: string[];
  passed: boolean | null;
  question_ids: string[];
  answers: Record<string, string[]>;
  option_order: Record<string, string[]>;
  branch_id: string | null;
  course_version: number | null;
  is_test: boolean;
  submitted_at: string | null;
  created_at: string;
}

export interface AllergenCoachingRow {
  id: string;
  coaching_note: string;
  topics_covered: string[];
  coached_by_name: string | null;
  unlocks_attempt: number;
  is_test: boolean;
  created_at: string;
}

/* ─────────────────── The proposed version 2 draft ─────────────────── */

/** Builds the proposed content from the approved material. Pure shaping only. */
export function buildProposedContent() {
  return {
    course_title: ALLERGEN_COURSE_TITLE,
    lessons: ALLERGEN_SAFETY_LESSONS.flatMap((lesson) =>
      lesson.sections.map((s) => ({
        ref: `${lesson.ref}/${s.ref}`,
        label: `${lesson.title} — ${s.heading}`,
        text: [...s.paragraphs, s.example ? `Example: ${s.example}` : ""].filter(Boolean).join("\n\n"),
        sources: s.sources,
        mandatory: s.mandatory,
      })),
    ),
    questions: ALLERGEN_QUESTION_BANK.map((q) => ({
      ref: q.id,
      label: q.prompt,
      text: `${q.prompt} | Correct: ${q.correct.join(", ")} | ${q.explanation}`,
      sources: q.sources,
      critical: q.critical,
      flavour: q.flavour ?? null,
      active: q.active,
    })),
    practical_signoff: PRACTICAL_SIGNOFF_TEMPLATE.items.map((i) => ({
      ref: i.ref,
      label: i.title,
      text: `${i.observe} (${i.audience})`,
      sources: i.sources,
    })),
  };
}

function publishedAsComparable(content: any) {
  const shape = (rows: any[] | undefined) =>
    (rows ?? []).map((r: any) => ({
      ref: String(r.ref ?? r.label ?? ""),
      label: String(r.label ?? r.ref ?? ""),
      text: String(r.text ?? ""),
      sources: [],
    }));
  return {
    lessons: shape(content?.lessons),
    questions: shape(content?.questions),
    practical_signoff: shape(content?.practical_signoff),
  };
}

function proposedAsComparable(content: ReturnType<typeof buildProposedContent>) {
  const shape = (rows: any[]) =>
    rows.map((r) => ({ ref: r.ref, label: r.label, text: r.text, sources: (r.sources ?? []) as string[] }));
  return {
    lessons: shape(content.lessons),
    questions: shape(content.questions),
    practical_signoff: shape(content.practical_signoff),
  };
}

export function useAllergenCourseDraft() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-course-draft", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_course_drafts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("status", "management_review")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as unknown as AllergenCourseDraft | null;
    },
  });
}

/**
 * Creates (or refreshes) the draft snapshot for the proposed version 2 and the
 * comparison against the published version. Nothing is published: the row is
 * held at "management review" and staff cannot see it.
 */
export function useCreateAllergenCourseDraft() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { note?: string }) => {
      if (!tenantId) throw new Error("No tenant");

      const [{ data: versions, error: vErr }, { data: dishes, error: dErr }] = await Promise.all([
        supabase.from("allergen_course_versions").select("version, content")
          .eq("tenant_id", tenantId).order("version", { ascending: false }).limit(1),
        supabase.from("allergen_dish_reference").select("id, dish_name, is_confirmed, management_decision")
          .eq("tenant_id", tenantId),
      ]);
      if (vErr) throw vErr;
      if (dErr) throw dErr;

      const published = (versions ?? [])[0] as any | undefined;
      const proposed = buildProposedContent();
      const comparison = compareCourseContent(
        publishedAsComparable(published?.content),
        proposedAsComparable(proposed),
        published?.version ?? null,
        (published?.version ?? 0) + 1,
      );

      const confirmed = (dishes ?? []).filter((d: any) => d.is_confirmed);
      const sourceMap: Record<string, string[]> = {};
      for (const l of proposed.lessons) sourceMap[l.ref] = l.sources as string[];
      for (const q of proposed.questions) sourceMap[q.ref] = q.sources as string[];
      for (const p of proposed.practical_signoff) sourceMap[p.ref] = p.sources as string[];

      // Any earlier draft is marked superseded — never deleted.
      await supabase.from("allergen_course_drafts")
        .update({ status: "superseded", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId).eq("status", "management_review");

      const { data: inserted, error } = await supabase
        .from("allergen_course_drafts")
        .insert({
          tenant_id: tenantId,
          based_on_version: published?.version ?? null,
          proposed_version: (published?.version ?? 0) + 1,
          status: "management_review",
          content: proposed as any,
          source_map: sourceMap as any,
          comparison: comparison as any,
          confirmed_dish_ids: confirmed.map((d: any) => d.id),
          excluded_from_scoring: EXCLUDED_FROM_SCORING.map((e) => e.flavour),
          note: input?.note ?? "Proposed version 2 prepared for management review. Not published.",
          created_by: user?.id ?? null,
        } as any)
        .select("*")
        .single();
      if (error) throw error;

      await logComplianceAudit({
        tenantId, table: "allergen_course_drafts", recordId: inserted.id,
        event: "allergen_draft_prepared",
        note: `Draft allergen course snapshot prepared as proposed version ${(published?.version ?? 0) + 1}. Published version ${published?.version ?? "—"} untouched; nothing assigned, sent or certified.`,
      });
      return inserted as unknown as AllergenCourseDraft;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-course-draft"] }),
  });
}

/* ─────────────────── Lesson progress ─────────────────── */

/**
 * Reading progress. A previewKey isolates one management preview session; when
 * none is given, only ordinary rows (preview_key IS NULL) are read.
 */
export function useAllergenLessonProgress(isTest: boolean, previewKey?: string | null) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["allergen-lesson-progress", tenantId, user?.id, isTest, previewKey ?? null],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("allergen_lesson_progress")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("user_id", user!.id)
        .eq("is_test", isTest);
      q = previewKey ? q.eq("preview_key", previewKey) : q.is("preview_key", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AllergenLessonProgressRow[];
    },
  });
}

/** Saves one completed section. Only an affirmative action reaches this point. */
export function useSaveSectionProgress() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lessonRef: string;
      sectionRef: string;
      totalSections: number;
      isTest: boolean;
      draftId?: string | null;
      employeeId?: string | null;
      previewKey?: string | null;
    }) => {
      if (!tenantId || !user?.id) throw new Error("Not signed in");
      let find = supabase
        .from("allergen_lesson_progress")
        .select("id, completed_sections")
        .eq("tenant_id", tenantId).eq("user_id", user.id)
        .eq("lesson_ref", input.lessonRef).eq("is_test", input.isTest);
      find = input.previewKey
        ? find.eq("preview_key", input.previewKey)
        : find.is("preview_key", null);
      const { data: existing } = await find.maybeSingle();

      const sections = Array.from(
        new Set([...(((existing as any)?.completed_sections as string[]) ?? []), input.sectionRef]),
      );
      const complete = sections.length >= input.totalSections;
      const payload = {
        tenant_id: tenantId,
        user_id: user.id,
        employee_id: input.employeeId ?? null,
        lesson_ref: input.lessonRef,
        draft_id: input.draftId ?? null,
        preview_key: input.previewKey ?? null,
        completed_sections: sections,
        total_sections: input.totalSections,
        is_complete: complete,
        completed_at: complete ? new Date().toISOString() : null,
        is_test: input.isTest,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase.from("allergen_lesson_progress")
          .update(payload as any).eq("id", existing.id);
        if (error) throw error;
        return existing.id as string;
      }
      const { data, error } = await supabase.from("allergen_lesson_progress")
        .insert(payload as any).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-lesson-progress"] }),
  });
}

/* ─────────────────── Assessment attempts ─────────────────── */

export function useAllergenAttempts(isTest: boolean, previewKey?: string | null) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["allergen-attempts", tenantId, user?.id, isTest, previewKey ?? null],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("allergen_assessment_attempts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("user_id", user!.id)
        .eq("is_test", isTest);
      q = previewKey ? q.eq("preview_key", previewKey) : q.is("preview_key", null);
      const { data, error } = await q.order("attempt_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenAttemptRow[];
    },
  });
}

export function useAllergenCoaching(isTest: boolean, previewKey?: string | null) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["allergen-coaching", tenantId, user?.id, isTest, previewKey ?? null],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("allergen_coaching_records")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("user_id", user!.id)
        .eq("is_test", isTest);
      q = previewKey ? q.eq("preview_key", previewKey) : q.is("preview_key", null);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenCoachingRow[];
    },
  });
}

export function useStartAllergenAttempt() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attemptNumber: number;
      questionIds: string[];
      optionOrder: Record<string, string[]>;
      branchId?: string | null;
      courseVersion?: number | null;
      draftId?: string | null;
      employeeId?: string | null;
      isTest: boolean;
      previewKey?: string | null;
    }) => {
      if (!tenantId || !user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("allergen_assessment_attempts")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          employee_id: input.employeeId ?? null,
          attempt_number: input.attemptNumber,
          question_ids: input.questionIds,
          option_order: input.optionOrder as any,
          answers: {},
          branch_id: input.branchId ?? null,
          course_version: input.courseVersion ?? null,
          draft_id: input.draftId ?? null,
          status: "in_progress",
          is_test: input.isTest,
          preview_key: input.previewKey ?? null,
        } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as AllergenAttemptRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-attempts"] }),
  });
}

/** Saves answers mid-attempt so closing the page does not lose progress. */
export function useSaveAttemptAnswers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { attemptId: string; answers: Record<string, string[]> }) => {
      const { error } = await supabase
        .from("allergen_assessment_attempts")
        .update({ answers: input.answers as any, updated_at: new Date().toISOString() })
        .eq("id", input.attemptId)
        .eq("status", "in_progress");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-attempts"] }),
  });
}

/**
 * Submits and marks an attempt. A pass records
 * "Assessment passed — awaiting practical sign-off" and nothing more:
 * no completion record, no certificate, no notification.
 */
export function useSubmitAllergenAttempt() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attemptId: string;
      answers: Record<string, string[]>;
      scorePercent: number;
      criticalMissed: string[];
      passed: boolean;
      attemptNumber: number;
      isTest: boolean;
    }) => {
      const outcome = input.passed
        ? "passed_awaiting_practical"
        : input.attemptNumber >= 2
          ? "manager_coaching_required"
          : "failed";
      const { error } = await supabase
        .from("allergen_assessment_attempts")
        .update({
          answers: input.answers as any,
          score_percent: input.scorePercent,
          critical_missed: input.criticalMissed,
          passed: input.passed,
          status: "submitted",
          outcome,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", input.attemptId)
        .eq("status", "in_progress");
      if (error) throw error;

      if (!input.isTest && tenantId) {
        await logComplianceAudit({
          tenantId, table: "allergen_assessment_attempts", recordId: input.attemptId,
          event: "allergen_assessment_submitted",
          note: `Allergen assessment attempt ${input.attemptNumber} submitted: ${input.scorePercent}%${
            input.criticalMissed.length ? `, ${input.criticalMissed.length} critical question(s) missed` : ""
          }. Outcome: ${outcome}. No completion record or certificate produced.`,
        });
      }
      return outcome;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-attempts"] }),
  });
}

/** A manager records coaching, which is what unlocks a third attempt. */
export function useRecordAllergenCoaching() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      learnerUserId: string;
      employeeId?: string | null;
      afterAttemptId?: string | null;
      note: string;
      topics: string[];
      coachedByName?: string;
      isTest: boolean;
      previewKey?: string | null;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("allergen_coaching_records")
        .insert({
          tenant_id: tenantId,
          user_id: input.learnerUserId,
          employee_id: input.employeeId ?? null,
          after_attempt_id: input.afterAttemptId ?? null,
          coached_by: user?.id ?? null,
          coached_by_name: input.coachedByName ?? null,
          coaching_note: input.note,
          topics_covered: input.topics,
          unlocks_attempt: 3,
          is_test: input.isTest,
          preview_key: input.previewKey ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (!input.isTest) {
        await logComplianceAudit({
          tenantId, table: "allergen_coaching_records", recordId: data.id,
          event: "allergen_coaching_recorded",
          note: `Manager coaching recorded before a third allergen assessment attempt: ${input.note}`,
        });
      }
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-coaching"] }),
  });
}
