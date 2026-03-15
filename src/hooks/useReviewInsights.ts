import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { writeTrainingAudit } from "@/hooks/useTrainingLibrary";

// ─── Types ───

export type FrequencyLevel = "low" | "medium" | "high";
export type InsightConfidence = "low" | "medium" | "high";

export interface ReviewInsight {
  id: string;
  document_id: string | null;
  tenant_id: string | null;
  insight_tag: string;
  review_channel: string | null;
  market_scope: string | null;
  summary: string;
  operational_problem: string | null;
  customer_impact: string | null;
  suggested_training_response: string | null;
  frequency_level: FrequencyLevel;
  confidence_level: InsightConfidence;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const INSIGHT_TAG_OPTIONS = [
  { value: "recurring_delay_issue", label: "Recurring Delays" },
  { value: "staff_attitude_issue", label: "Staff Attitude" },
  { value: "food_temperature_issue", label: "Food Temperature" },
  { value: "cleanliness_issue", label: "Cleanliness" },
  { value: "allergen_confidence_issue", label: "Allergen Confidence" },
  { value: "complaint_recovery_issue", label: "Complaint Recovery" },
  { value: "ambience_issue", label: "Ambience" },
  { value: "value_for_money_issue", label: "Value for Money" },
];

// ─── Query ───

export function useReviewInsights(documentId?: string) {
  return useQuery({
    queryKey: ["training_review_insights", documentId],
    queryFn: async (): Promise<ReviewInsight[]> => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("training_review_insights")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewInsight[];
    },
    enabled: !!documentId,
  });
}

// ─── Create ───

export interface CreateInsightPayload {
  document_id: string;
  insight_tag: string;
  summary: string;
  review_channel?: string;
  market_scope?: string;
  operational_problem?: string;
  customer_impact?: string;
  suggested_training_response?: string;
  frequency_level: FrequencyLevel;
  confidence_level: InsightConfidence;
}

export function useCreateInsight() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: CreateInsightPayload) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_review_insights")
        .insert({
          document_id: payload.document_id,
          tenant_id: tenantId ?? null,
          insight_tag: payload.insight_tag,
          summary: payload.summary,
          review_channel: payload.review_channel ?? null,
          market_scope: payload.market_scope ?? null,
          operational_problem: payload.operational_problem ?? null,
          customer_impact: payload.customer_impact ?? null,
          suggested_training_response: payload.suggested_training_response ?? null,
          frequency_level: payload.frequency_level,
          confidence_level: payload.confidence_level,
          created_by: user?.id ?? null,
        } as Record<string, unknown>);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: payload.document_id,
        action: "review_insight_added",
        acting_user_id: user?.id,
        metadata: { insight_tag: payload.insight_tag },
      });
    },
    onSuccess: (_, { document_id }) => {
      qc.invalidateQueries({ queryKey: ["training_review_insights", document_id] });
      toast.success("Review insight added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Delete ───

export function useDeleteInsight() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, documentId }: { id: string; documentId: string }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_review_insights")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: documentId,
        action: "review_insight_removed",
        acting_user_id: user?.id,
        metadata: { insight_id: id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_review_insights"] });
      toast.success("Review insight removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
