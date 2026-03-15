import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { writeTrainingAudit } from "@/hooks/useTrainingLibrary";

// ─── Types ───

export type EvidenceType = "official_guidance" | "review_analysis" | "internal_standard" | "incident_pattern" | "mixed";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ModuleEvidence {
  id: string;
  document_id: string;
  tenant_id: string | null;
  evidence_type: EvidenceType;
  source_title: string;
  source_organisation: string | null;
  source_region: string | null;
  source_url: string | null;
  source_notes: string | null;
  confidence_level: ConfidenceLevel;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EvidenceCompletenessStatus = "no_evidence" | "partial_evidence" | "evidence_reviewed" | "ready_for_use";

export const EVIDENCE_TYPE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: "official_guidance", label: "Official Guidance" },
  { value: "review_analysis", label: "Review Analysis" },
  { value: "internal_standard", label: "Internal Standard" },
  { value: "incident_pattern", label: "Incident Pattern" },
  { value: "mixed", label: "Mixed Sources" },
];

export const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ─── Completeness helper ───

export function deriveEvidenceCompleteness(
  evidenceRecords: ModuleEvidence[],
  lastReviewedAt: string | null
): EvidenceCompletenessStatus {
  const active = evidenceRecords.filter(e => e.is_active);
  if (active.length === 0) return "no_evidence";
  const hasHigh = active.some(e => e.confidence_level === "high");
  if (lastReviewedAt && hasHigh) return "ready_for_use";
  if (lastReviewedAt) return "evidence_reviewed";
  return "partial_evidence";
}

export const COMPLETENESS_LABELS: Record<EvidenceCompletenessStatus, { label: string; color: string }> = {
  no_evidence: { label: "No Evidence", color: "bg-muted text-muted-foreground" },
  partial_evidence: { label: "Partial Evidence", color: "bg-warning/10 text-warning" },
  evidence_reviewed: { label: "Evidence Reviewed", color: "bg-primary/10 text-primary" },
  ready_for_use: { label: "Ready for Use", color: "bg-success/10 text-success" },
};

// ─── Query ───

export function useModuleEvidence(documentId?: string) {
  return useQuery({
    queryKey: ["training_module_evidence", documentId],
    queryFn: async (): Promise<ModuleEvidence[]> => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("training_module_evidence")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ModuleEvidence[];
    },
    enabled: !!documentId,
  });
}

// ─── Create ───

export interface CreateEvidencePayload {
  document_id: string;
  evidence_type: EvidenceType;
  source_title: string;
  source_organisation?: string;
  source_region?: string;
  source_url?: string;
  source_notes?: string;
  confidence_level: ConfidenceLevel;
}

export function useCreateEvidence() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: CreateEvidencePayload) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_module_evidence")
        .insert({
          document_id: payload.document_id,
          tenant_id: tenantId ?? null,
          evidence_type: payload.evidence_type,
          source_title: payload.source_title,
          source_organisation: payload.source_organisation ?? null,
          source_region: payload.source_region ?? null,
          source_url: payload.source_url ?? null,
          source_notes: payload.source_notes ?? null,
          confidence_level: payload.confidence_level,
          created_by: user?.id ?? null,
        } as Record<string, unknown>);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: payload.document_id,
        action: "evidence_added",
        acting_user_id: user?.id,
        metadata: { source_title: payload.source_title, evidence_type: payload.evidence_type },
      });
    },
    onSuccess: (_, { document_id }) => {
      qc.invalidateQueries({ queryKey: ["training_module_evidence", document_id] });
      toast.success("Evidence source added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Delete ───

export function useDeleteEvidence() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, documentId }: { id: string; documentId: string }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_module_evidence")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: documentId,
        action: "evidence_removed",
        acting_user_id: user?.id,
        metadata: { evidence_id: id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_module_evidence"] });
      toast.success("Evidence source removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Mark Reviewed ───

export function useMarkModuleReviewed() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (documentId: string) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_library")
        .update({
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: user?.id ?? null,
        })
        .eq("id", documentId);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: documentId,
        action: "module_reviewed",
        acting_user_id: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module marked as reviewed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
