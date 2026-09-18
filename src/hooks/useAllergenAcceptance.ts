/**
 * Hands-on acceptance data layer, plus the isolated management preview session.
 *
 * Nothing here publishes a course version, makes the course available to staff,
 * creates a genuine assignment, issues a certificate or sends anything.
 *
 * The reset control deletes only rows that are BOTH test activity and marked
 * with a management preview key. The database policies enforce the same rule, so
 * a genuine training record cannot be removed by this route.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";
import type {
  AcceptanceEnvironment,
  AcceptanceResult,
} from "@/data/allergen/allergen-acceptance-checklist";
import { acceptanceCommentRequired } from "@/data/allergen/allergen-acceptance-checklist";
import { isPreviewKey } from "@/lib/allergen-preview";

export interface AcceptanceCheckRow {
  id: string;
  environment: AcceptanceEnvironment;
  check_ref: string;
  result: AcceptanceResult;
  comment: string | null;
  checked_by_name: string | null;
  checked_at: string;
}

export interface AcceptanceSignoffRow {
  id: string;
  environment: AcceptanceEnvironment;
  device_note: string | null;
  outcome: "accepted" | "accepted_with_observations" | "not_accepted";
  signed_by_name: string;
  signed_role: string | null;
  signed_at: string;
  summary: Record<string, unknown>;
}

/* ─────────────────── Checklist ─────────────────── */

export function useAcceptanceChecks() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-acceptance-checks", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_acceptance_checks")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data ?? []) as unknown as AcceptanceCheckRow[];
    },
  });
}

export function useRecordAcceptanceCheck() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      environment: AcceptanceEnvironment;
      checkRef: string;
      result: AcceptanceResult;
      comment?: string | null;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (acceptanceCommentRequired(input.result) && !(input.comment ?? "").trim()) {
        throw new Error("Please write a short comment explaining this result.");
      }
      const { data: existing } = await supabase
        .from("allergen_acceptance_checks")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("environment", input.environment)
        .eq("check_ref", input.checkRef)
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        environment: input.environment,
        check_ref: input.checkRef,
        result: input.result,
        comment: (input.comment ?? "").trim() || null,
        checked_by: user?.id ?? null,
        checked_by_name: user?.email ?? null,
        checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("allergen_acceptance_checks")
          .update(payload as any)
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id as string;
      }
      const { data, error } = await supabase
        .from("allergen_acceptance_checks")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-acceptance-checks"] }),
  });
}

/* ─────────────────── Environment sign-off ─────────────────── */

export function useAcceptanceSignoffs() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-acceptance-signoffs", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_acceptance_signoffs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AcceptanceSignoffRow[];
    },
  });
}

export function useSignAcceptanceEnvironment() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      environment: AcceptanceEnvironment;
      outcome: "accepted" | "accepted_with_observations" | "not_accepted";
      signedByName: string;
      signedRole?: string | null;
      deviceNote?: string | null;
      summary: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (!input.signedByName.trim()) throw new Error("Please type the name of the person signing.");
      const { data, error } = await supabase
        .from("allergen_acceptance_signoffs")
        .insert({
          tenant_id: tenantId,
          environment: input.environment,
          outcome: input.outcome,
          signed_by: user?.id ?? null,
          signed_by_name: input.signedByName.trim(),
          signed_role: input.signedRole ?? null,
          device_note: input.deviceNote ?? null,
          summary: input.summary as any,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await logComplianceAudit({
        tenantId,
        table: "allergen_acceptance_signoffs",
        recordId: data.id,
        event: "allergen_acceptance_signed",
        note: `Hands-on acceptance for the ${input.environment.replace(/_/g, " ")} column signed by ${input.signedByName.trim()} as ${input.outcome.replace(/_/g, " ")}. The course remains in management review — nothing published, assigned, sent or certified.`,
      });
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-acceptance-signoffs"] }),
  });
}

/* ─────────────────── Preview session reset ─────────────────── */

export interface PreviewSessionCounts {
  lessonProgress: number;
  attempts: number;
  coaching: number;
  observations: number;
}

export function usePreviewSessionCounts(previewKey: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-preview-counts", tenantId, previewKey],
    enabled: !!tenantId && !!previewKey,
    queryFn: async () => {
      const table = async (name: string) => {
        const { count, error } = await supabase
          .from(name as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_test", true)
          .eq("preview_key", previewKey!);
        if (error) throw error;
        return count ?? 0;
      };
      return {
        lessonProgress: await table("allergen_lesson_progress"),
        attempts: await table("allergen_assessment_attempts"),
        coaching: await table("allergen_coaching_records"),
        observations: await table("allergen_practical_observations"),
      } as PreviewSessionCounts;
    },
  });
}

/**
 * Clears one management preview session. Every delete is doubly restricted to
 * is_test = true AND this preview key, in the request and again in the database
 * policy, so genuine training records are out of reach.
 */
export function useResetPreviewSession() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { previewKey: string; personaLabel: string }) => {
      if (!tenantId) throw new Error("No tenant");
      if (!isPreviewKey(input.previewKey)) {
        throw new Error("Only a management preview session can be reset.");
      }
      const tables = [
        "allergen_lesson_progress",
        "allergen_assessment_attempts",
        "allergen_coaching_records",
        "allergen_practical_observations",
      ] as const;

      for (const name of tables) {
        const { error } = await supabase
          .from(name as any)
          .delete()
          .eq("tenant_id", tenantId)
          .eq("is_test", true)
          .eq("preview_key", input.previewKey);
        if (error) throw error;
      }

      await logComplianceAudit({
        tenantId,
        table: "allergen_lesson_progress",
        recordId: null,
        event: "allergen_preview_session_reset",
        note: `Management preview session "${input.personaLabel}" cleared. Only test rows carrying the preview marker ${input.previewKey} were removed; no genuine assignment, progress, attempt, observation or certificate was affected.`,
      });
      return input.previewKey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-lesson-progress"] });
      qc.invalidateQueries({ queryKey: ["allergen-attempts"] });
      qc.invalidateQueries({ queryKey: ["allergen-coaching"] });
      qc.invalidateQueries({ queryKey: ["allergen-observations"] });
      qc.invalidateQueries({ queryKey: ["allergen-preview-counts"] });
    },
  });
}
