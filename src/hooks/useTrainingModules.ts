import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { writeTrainingAudit, type TrainingLibraryItem, type TrainingAssignment } from "@/hooks/useTrainingLibrary";
import type { Json } from "@/integrations/supabase/types";

// ─── Types ───

export type SourceType = "platform" | "tenant" | "adapted";
export type ModuleStatus = "draft" | "under_review" | "approved" | "published" | "archived";
export type CompletionType = "read_acknowledge" | "quiz" | "practical_signoff" | "blended";

export const COMPLETION_TYPES: { value: CompletionType; label: string }[] = [
  { value: "read_acknowledge", label: "Read & Acknowledge" },
  { value: "quiz", label: "Quiz" },
  { value: "practical_signoff", label: "Practical Sign-off" },
  { value: "blended", label: "Blended" },
];

export const MODULE_STATUSES: { value: ModuleStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-muted text-muted-foreground" },
  { value: "under_review", label: "Under Review", color: "bg-warning/10 text-warning" },
  { value: "approved", label: "Approved", color: "bg-primary/10 text-primary" },
  { value: "published", label: "Published", color: "bg-success/10 text-success" },
  { value: "archived", label: "Archived", color: "bg-muted text-muted-foreground line-through" },
];

export const AUDIENCE_SCOPES = [
  { value: "all_staff", label: "All Staff" },
  { value: "kitchen", label: "Kitchen" },
  { value: "foh", label: "FOH" },
  { value: "bar", label: "Bar" },
  { value: "managers", label: "Managers" },
];

// ─── Platform Modules Hook ───

export function usePlatformModules() {
  return useQuery({
    queryKey: ["platform_training_modules"],
    queryFn: async (): Promise<TrainingLibraryItem[]> => {
      const { data, error } = await supabase
        .from("training_library")
        .select("*")
        .is("tenant_id", null)
        .eq("source_type", "platform")
        .eq("status", "published")
        .eq("is_active", true)
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingLibraryItem[];
    },
  });
}

// ─── Adapt Platform Module ───

export function useAdaptModule() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (platformModuleId: string) => {
      await assertPermission("manage_training", tenantId!);
      const { data: source, error: fetchErr } = await supabase
        .from("training_library")
        .select("*")
        .eq("id", platformModuleId)
        .single();
      if (fetchErr || !source) throw new Error("Platform module not found");
      const s = source as unknown as TrainingLibraryItem;

      const { data: adapted, error: insertErr } = await supabase
        .from("training_library")
        .insert({
          tenant_id: tenantId,
          title: s.title,
          description: s.description,
          summary: s.summary,
          category: s.category,
          content_type: s.content_type,
          content_url: s.content_url,
          source_type: "adapted" as const,
          source_module_id: platformModuleId,
          status: "draft" as const,
          completion_type: s.completion_type,
          audience_scope: s.audience_scope,
          requires_acknowledgement: s.requires_acknowledgement,
          requires_completion: s.requires_completion,
          requires_quiz: s.requires_quiz,
          counts_toward_readiness: s.counts_toward_readiness,
          is_mandatory: s.is_mandatory,
          is_active: true,
          version: 1,
          target_roles: s.target_roles ?? [],
          target_departments: s.target_departments ?? [],
          target_locations: s.target_locations ?? [],
          refresher_days: s.refresher_days,
          estimated_minutes: s.estimated_minutes,
          pass_mark: s.pass_mark,
          retry_limit: s.retry_limit,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const adaptedModule = adapted as unknown as TrainingLibraryItem;

      // Copy quiz questions
      const { data: questions } = await supabase
        .from("training_quiz_questions")
        .select("*")
        .eq("document_id", platformModuleId);

      if (questions && questions.length > 0) {
        const copiedQuestions = (questions as unknown as Array<{ question: string; question_type: string; options: Json; correct_option: number; explanation: string | null; display_order: number }>).map(q => ({
          document_id: adaptedModule.id,
          tenant_id: tenantId,
          question: q.question,
          question_type: q.question_type,
          options: q.options,
          correct_option: q.correct_option,
          explanation: q.explanation,
          display_order: q.display_order,
        }));
        await supabase.from("training_quiz_questions").insert(copiedQuestions);
      }

      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: adaptedModule.id,
        action: "module_adapted",
        acting_user_id: user?.id,
        metadata: { source_module_id: platformModuleId, title: s.title },
      });

      return adaptedModule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module adapted — now in Draft status for your review");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Update Module Status ───

export function useUpdateModuleStatus() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ModuleStatus }) => {
      await assertPermission("manage_training", tenantId!);
      const updates: Record<string, unknown> = { status };
      if (status === "approved") {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }
      if (status === "archived") {
        updates.archived_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("training_library")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      const actionName = status === "published" ? "module_published" : `status_changed_to_${status}`;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: id,
        action: actionName,
        acting_user_id: user?.id,
        metadata: { new_status: status },
      });
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      qc.invalidateQueries({ queryKey: ["platform_training_modules"] });
      toast.success(`Module ${status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Quiz Question CRUD ───

export function useCreateQuizQuestion() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (question: {
      document_id: string;
      question: string;
      question_type: string;
      options: string[];
      correct_option: number;
      explanation?: string;
      display_order: number;
    }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_quiz_questions")
        .insert({
          document_id: question.document_id,
          tenant_id: tenantId,
          question: question.question,
          question_type: question.question_type,
          options: question.options,
          correct_option: question.correct_option,
          explanation: question.explanation ?? null,
          display_order: question.display_order,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_quiz"] });
      toast.success("Question added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateQuizQuestion() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_quiz_questions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_quiz"] });
      toast.success("Question updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteQuizQuestion() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_quiz_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_quiz"] });
      toast.success("Question deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Quiz Attempts ───

export interface QuizAttempt {
  id: string;
  tenant_id: string;
  assignment_id: string;
  employee_id: string;
  document_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  answers_json: string | null;
  started_at: string | null;
  completed_at: string;
  created_at: string;
}

export function useQuizAttempts(assignmentId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_quiz_attempts", assignmentId],
    queryFn: async (): Promise<QuizAttempt[]> => {
      if (!assignmentId || !tenantId) return [];
      const { data, error } = await supabase
        .from("training_quiz_attempts")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("tenant_id", tenantId)
        .order("attempt_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as QuizAttempt[];
    },
    enabled: !!assignmentId && !!tenantId,
  });
}

// ─── Submit Quiz ───

export interface SubmitQuizPayload {
  assignmentId: string;
  employeeId: string;
  documentId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  answers?: Record<string, number>;
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: SubmitQuizPayload) => {
      const { assignmentId, employeeId, documentId, score, passed, attemptNumber, answers } = payload;

      // 1. Persist the attempt
      const { error: attemptErr } = await supabase.from("training_quiz_attempts").insert({
        tenant_id: tenantId!,
        assignment_id: assignmentId,
        employee_id: employeeId,
        document_id: documentId,
        score,
        passed,
        attempt_number: attemptNumber,
        answers_json: answers ? JSON.stringify(answers) : null,
        completed_at: new Date().toISOString(),
      });
      if (attemptErr && import.meta.env.DEV) console.warn("[quiz-attempt] insert error:", attemptErr);

      // 2. Update assignment
      const updates: Record<string, unknown> = {
        quiz_score: score,
        quiz_passed: passed,
        score,
      };
      if (passed) {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("training_assignments")
        .update(updates)
        .eq("id", assignmentId);
      if (error) throw error;

      // 3. Audit
      const action = passed ? "quiz_passed" : "quiz_failed";
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: documentId,
        assignment_id: assignmentId,
        employee_id: employeeId,
        action,
        acting_user_id: user?.id,
        metadata: { score, attempt_number: attemptNumber, passed },
      });
    },
    onSuccess: (_, { passed }) => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_training_assignments"] });
      qc.invalidateQueries({ queryKey: ["training_quiz_attempts"] });
      if (passed) toast.success("Quiz passed! Training completed.");
      else toast.error("Quiz not passed. Please review and try again.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Manager Signoff ───

export interface ManagerSignoffPayload {
  assignmentId: string;
  passed: boolean;
  notes?: string;
  createRetrain?: boolean;
  employeeId?: string;
  documentId?: string;
}

export function useManagerSignoff() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: ManagerSignoffPayload) => {
      const { assignmentId, passed, notes, createRetrain, employeeId, documentId } = payload;
      await assertPermission("manage_training", tenantId!);

      const updates: Record<string, unknown> = {
        signoff_status: passed ? "passed" : "failed",
        signed_off_by: user?.id,
        signed_off_at: new Date().toISOString(),
      };
      if (passed) {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
      }
      if (notes) updates.notes = notes;

      const { error } = await supabase
        .from("training_assignments")
        .update(updates)
        .eq("id", assignmentId);
      if (error) throw error;

      // Audit sign-off
      await writeTrainingAudit({
        tenant_id: tenantId!,
        assignment_id: assignmentId,
        employee_id: employeeId,
        document_id: documentId,
        action: passed ? "signoff_passed" : "signoff_failed",
        acting_user_id: user?.id,
        metadata: { notes: notes ?? null, retrain_requested: createRetrain ?? false },
      });

      // Create retrain assignment if explicitly chosen on fail
      if (!passed && createRetrain && employeeId && documentId && tenantId) {
        // Check for existing active retrain assignment
        const { data: existingRetrain } = await supabase
          .from("training_assignments")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("employee_id", employeeId)
          .eq("document_id", documentId)
          .eq("assignment_source", "retrain")
          .not("status", "in", '("completed","cancelled")')
          .maybeSingle();

        if (!existingRetrain) {
          // Get module version
          const { data: mod } = await supabase
            .from("training_library")
            .select("version, is_mandatory, completion_type")
            .eq("id", documentId)
            .single();

          const moduleData = mod as unknown as { version: number; is_mandatory: boolean; completion_type: string } | null;

          const { error: retrainErr } = await supabase
            .from("training_assignments")
            .insert({
              tenant_id: tenantId,
              document_id: documentId,
              employee_id: employeeId,
              status: "assigned" as const,
              assignment_source: "retrain" as const,
              module_version: moduleData?.version ?? 1,
              is_mandatory: moduleData?.is_mandatory ?? false,
              signoff_required: moduleData?.completion_type === "practical_signoff" || moduleData?.completion_type === "blended",
              notes: "Retraining required after failed sign-off",
            });
          if (retrainErr) throw retrainErr;

          await writeTrainingAudit({
            tenant_id: tenantId,
            document_id: documentId,
            employee_id: employeeId,
            action: "retrain_assigned",
            acting_user_id: user?.id,
            metadata: { reason: "failed_signoff" },
          });
        }
      }
    },
    onSuccess: (_, { passed, createRetrain }) => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_training_assignments"] });
      if (passed) {
        toast.success("Sign-off approved");
      } else if (createRetrain) {
        toast.success("Sign-off failed — retraining assigned");
      } else {
        toast.success("Sign-off failed");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Compliance Stats ───

export function useComplianceStats() {
  const { tenantId } = useTenant();
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["training_assignments_compliance", tenantId],
    queryFn: async (): Promise<TrainingAssignment[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*, training_library(title, category, is_mandatory, completion_type), employees(forename, surname, department)")
        .eq("tenant_id", tenantId)
        .not("status", "eq", "cancelled")
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingAssignment[];
    },
    enabled: !!tenantId,
  });

  const total = assignments.length;
  const completed = assignments.filter(a => ["completed", "acknowledged"].includes(a.status)).length;
  const overdue = assignments.filter(a => {
    if (!a.due_date) return false;
    return new Date(a.due_date) < new Date() && !["completed", "acknowledged", "cancelled"].includes(a.status);
  }).length;
  const pendingSignoff = assignments.filter(a => a.signoff_required && !a.signed_off_at && a.status !== "cancelled").length;
  const mandatory = assignments.filter(a => a.is_mandatory || a.training_library?.is_mandatory);
  const mandatoryComplete = mandatory.filter(a => ["completed", "acknowledged"].includes(a.status)).length;
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 100;
  const mandatoryRate = mandatory.length > 0 ? Math.round((mandatoryComplete / mandatory.length) * 100) : 100;

  const byDepartment = new Map<string, { total: number; completed: number }>();
  for (const a of assignments) {
    const dept = a.employees?.department || "Unknown";
    if (!byDepartment.has(dept)) byDepartment.set(dept, { total: 0, completed: 0 });
    const d = byDepartment.get(dept)!;
    d.total++;
    if (["completed", "acknowledged"].includes(a.status)) d.completed++;
  }

  return {
    isLoading,
    assignments,
    total,
    completed,
    overdue,
    pendingSignoff,
    complianceRate,
    mandatoryRate,
    mandatoryTotal: mandatory.length,
    mandatoryComplete,
    byDepartment: Array.from(byDepartment.entries()).map(([dept, stats]) => ({
      department: dept,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100,
    })),
  };
}
