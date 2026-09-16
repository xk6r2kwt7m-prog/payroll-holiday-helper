import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface InductionModuleRow {
  id: string;
  module_key: string;
  title: string;
  sort_order: number;
  read_at: string | null;
  acknowledged_at: string | null;
}

export interface InductionDeclarationRow {
  id: string;
  answers: Record<string, boolean>;
  has_yes_answer: boolean;
  signed_at: string | null;
  manager_review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

export interface InductionAssessmentRow {
  id: string;
  answers: Record<string, number>;
  score: number;
  total: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
}

export interface InductionPracticalRow {
  id: string;
  group_key: string;
  label: string;
  sort_order: number;
  applicable: boolean;
  verified_at: string | null;
  verified_by_name: string | null;
  notes: string | null;
}

/** Everything a manager needs to review one induction pack. */
export function useInductionProgress(packId?: string) {
  return useQuery({
    queryKey: ["induction_progress", packId],
    queryFn: async () => {
      const [modules, declaration, assessments, practical] = await Promise.all([
        supabase.from("induction_modules").select("*").eq("pack_id", packId!).order("sort_order"),
        supabase.from("induction_declarations").select("*").eq("pack_id", packId!).maybeSingle(),
        supabase.from("induction_assessments").select("*").eq("pack_id", packId!).order("attempt_number", { ascending: false }),
        supabase.from("induction_practical_items").select("*").eq("pack_id", packId!).order("sort_order"),
      ]);
      if (modules.error) throw modules.error;
      if (assessments.error) throw assessments.error;
      if (practical.error) throw practical.error;
      return {
        modules: (modules.data ?? []) as unknown as InductionModuleRow[],
        declaration: (declaration.data ?? null) as unknown as InductionDeclarationRow | null,
        assessments: (assessments.data ?? []) as unknown as InductionAssessmentRow[],
        practical: (practical.data ?? []) as unknown as InductionPracticalRow[],
      };
    },
    enabled: !!packId,
  });
}

/** Manager confirms a practical item was demonstrated on site. */
export function useVerifyPracticalItem() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth() as any;

  return useMutation({
    mutationFn: async ({
      id, verified, notes,
    }: { id: string; verified: boolean; notes?: string }) => {
      const { error } = await supabase
        .from("induction_practical_items")
        .update({
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id ?? null : null,
          verified_by_name: verified ? profile?.full_name ?? user?.email ?? null : null,
          notes: notes ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["induction_progress"] });
    },
    onError: (e: Error) => toast.error("Could not save: " + e.message),
  });
}

/** Manager records that a health declaration has been reviewed. */
export function useReviewDeclaration() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth() as any;

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("induction_declarations")
        .update({
          manager_review_notes: notes,
          reviewed_by: user?.id ?? null,
          reviewed_by_name: profile?.full_name ?? user?.email ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["induction_progress"] });
      toast.success("Review recorded");
    },
    onError: (e: Error) => toast.error("Could not save: " + e.message),
  });
}
