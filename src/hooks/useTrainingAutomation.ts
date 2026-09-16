import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { ChangeSignificance, ReissueDecision } from "@/lib/training-automation";

/** Version reviews for the tenant, newest first. */
export function useVersionReissues(onlyPending = false) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_version_reissues", tenantId, onlyPending],
    queryFn: async () => {
      let q = supabase
        .from("document_version_reissues")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (onlyPending) q = q.eq("decision", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export interface CreateReissueInput {
  documentId: string;
  documentName: string;
  previousDocumentId?: string | null;
  fromVersion?: number | null;
  toVersion?: number | null;
  significance: ChangeSignificance;
  affectedEmployeeIds: string[];
}

/**
 * Records that a new version exists and who completed the previous one.
 * Nothing is sent to staff — a manager decides afterwards.
 */
export function useCreateVersionReissue() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: CreateReissueInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("document_version_reissues")
        .insert({
          tenant_id: tenantId!,
          document_id: input.documentId,
          document_name: input.documentName,
          previous_document_id: input.previousDocumentId ?? null,
          from_version: input.fromVersion ?? null,
          to_version: input.toVersion ?? null,
          change_significance: input.significance,
          decision: "pending",
          affected_employee_ids: input.affectedEmployeeIds,
          affected_count: input.affectedEmployeeIds.length,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_version_reissues"] }),
  });
}

/** Records the manager's decision for a new version. */
export function useDecideVersionReissue() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      id, decision, note, actionedEmployeeIds,
    }: {
      id: string;
      decision: Exclude<ReissueDecision, "pending">;
      note?: string;
      actionedEmployeeIds?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        : { data: null as any };

      const { error } = await supabase
        .from("document_version_reissues")
        .update({
          decision,
          decision_note: note ?? null,
          actioned_employee_ids: actionedEmployeeIds ?? [],
          decided_by: user?.id ?? null,
          decided_by_name: profile?.full_name ?? null,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      if (tenantId) {
        await supabase.from("audit_log").insert({
          tenant_id: tenantId,
          user_id: user?.id ?? null,
          action: "update",
          table_name: "document_version_reissues",
          record_id: id,
          new_data: { event: "training_reissued", decision, note: note ?? null },
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_version_reissues"] }),
  });
}

/** Induction items across all packs, used to find who completed a version. */
export function useCompletedInductionItems(documentId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["induction_completed_items", tenantId, documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("induction_pack_items")
        .select("document_id, document_version, acknowledged_at, pack:induction_packs(employee_id, completed_at, is_test_send)")
        .eq("tenant_id", tenantId!)
        .eq("document_id", documentId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!documentId,
  });
}
