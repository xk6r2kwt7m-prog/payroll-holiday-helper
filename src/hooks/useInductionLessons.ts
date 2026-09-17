import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import type {
  InductionPackRole,
  LessonApprovalRow,
  LessonApprovalStatus,
  LessonProgressRow,
} from "@/lib/induction-packs";

export interface LessonApprovalRecord extends LessonApprovalRow {
  id: string;
  notes: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
}

/** Which lesson versions this company has released to staff. */
export function useLessonApprovals() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["induction_lesson_approvals", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("induction_lesson_approvals" as any)
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data ?? []) as unknown as LessonApprovalRecord[];
    },
  });
}

/** Manager releases, holds back, or returns a lesson version to draft. */
export function useSetLessonApproval() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const actorName = (user?.user_metadata as any)?.full_name ?? user?.email ?? null;

  return useMutation({
    mutationFn: async ({
      lessonKey,
      lessonVersion,
      status,
      notes,
    }: {
      lessonKey: string;
      lessonVersion: string;
      status: LessonApprovalStatus;
      notes?: string | null;
    }) => {
      if (!tenantId) throw new Error("No company selected");
      const approved = status === "approved";
      const { error } = await supabase
        .from("induction_lesson_approvals" as any)
        .upsert(
          {
            tenant_id: tenantId,
            lesson_key: lessonKey,
            lesson_version: lessonVersion,
            status,
            notes: notes ?? null,
            approved_by: approved ? user?.id ?? null : null,
            approved_by_name: approved ? actorName : null,
            approved_at: approved ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "tenant_id,lesson_key,lesson_version" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["induction_lesson_approvals"] });
      toast.success(
        vars.status === "approved"
          ? "Lesson released to staff"
          : vars.status === "rejected"
            ? "Lesson held back from staff"
            : "Lesson returned to draft"
      );
    },
    onError: (e: Error) => toast.error("Could not save: " + e.message),
  });
}

export interface LessonProgressRecord extends LessonProgressRow {
  id: string;
  employee_id: string;
  pack_role: InductionPackRole;
  started_at: string;
  acknowledged_understood: boolean;
}

/** One person's reading record. */
export function useLessonProgress(employeeId?: string | null) {
  return useQuery({
    queryKey: ["induction_lesson_progress", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("induction_lesson_progress" as any)
        .select("*")
        .eq("employee_id", employeeId!);
      if (error) throw error;
      return (data ?? []) as unknown as LessonProgressRecord[];
    },
  });
}

/** Everyone's reading record, for the manager overview. */
export function useTenantLessonProgress() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["induction_lesson_progress_all", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("induction_lesson_progress" as any)
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data ?? []) as unknown as LessonProgressRecord[];
    },
  });
}

/** Staff member confirms they have read and understood one lesson. */
export function useCompleteLesson() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      employeeId,
      packRole,
      lessonKey,
      lessonVersion,
    }: {
      tenantId: string;
      employeeId: string;
      packRole: InductionPackRole;
      lessonKey: string;
      lessonVersion: string;
    }) => {
      const { error } = await supabase
        .from("induction_lesson_progress" as any)
        .upsert(
          {
            tenant_id: tenantId,
            employee_id: employeeId,
            pack_role: packRole,
            lesson_key: lessonKey,
            lesson_version: lessonVersion,
            completed_at: new Date().toISOString(),
            acknowledged_understood: true,
          } as any,
          { onConflict: "tenant_id,employee_id,lesson_key,lesson_version" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["induction_lesson_progress"] });
      qc.invalidateQueries({ queryKey: ["induction_lesson_progress_all"] });
      toast.success("Saved — that lesson is marked as read");
    },
    onError: (e: Error) => toast.error("Could not save: " + e.message),
  });
}
