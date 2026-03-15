import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import type { Json } from "@/integrations/supabase/types";
import type { StandardsMetadata } from "@/data/training-standards/types";

// ─── DB-aligned types ───

export type TrainingContentType = "document" | "internal_page" | "external_link";
export type TrainingSourceType = "platform" | "tenant" | "adapted";
export type TrainingModuleStatus = "draft" | "under_review" | "approved" | "published" | "archived";
export type TrainingCompletionType = "read_acknowledge" | "quiz" | "practical_signoff" | "blended";
export type AssignmentStatus = "assigned" | "viewed" | "acknowledged" | "completed" | "cancelled";
export type AssignmentSource = "direct" | "department" | "all_staff" | "auto_new_starter" | "retrain";

export interface TrainingLibraryItem {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  summary: string | null;
  category: string;
  content_type: TrainingContentType;
  content_url: string | null;
  file_path: string | null;
  version: number;
  previous_version_id: string | null;
  effective_date: string | null;
  review_date: string | null;
  expiry_date: string | null;
  requires_acknowledgement: boolean;
  requires_completion: boolean;
  requires_quiz: boolean;
  counts_toward_readiness: boolean;
  target_roles: string[];
  target_departments: string[];
  target_locations: string[];
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source_type: TrainingSourceType;
  source_module_id: string | null;
  status: TrainingModuleStatus;
  completion_type: TrainingCompletionType;
  audience_scope: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  change_log: string | null;
  refresher_days: number | null;
  estimated_minutes: number | null;
  is_mandatory: boolean;
  pass_mark: number | null;
  standards_metadata: StandardsMetadata | null;
  retry_limit: number | null;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  document_id: string;
  employee_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  status: AssignmentStatus;
  viewed_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  reminder_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  signoff_required: boolean;
  signoff_status: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
  signoff_checklist: Json | null;
  module_version: number | null;
  is_mandatory: boolean;
  score: number | null;
  assignment_source: AssignmentSource;
  // Joined relations
  training_library?: TrainingLibraryItem;
  employees?: { forename: string; surname: string; department: string };
}

export interface QuizQuestion {
  id: string;
  document_id: string;
  tenant_id: string | null;
  question: string;
  question_type: string;
  options: string[]; // stored as jsonb in DB, parsed as string[]
  correct_option: number;
  explanation: string | null;
  display_order: number;
  created_at: string;
}

export interface TrainingAutoRule {
  id: string;
  tenant_id: string;
  document_id: string;
  rule_name: string;
  target_roles: string[];
  target_departments: string[];
  target_locations: string[];
  apply_to_new_starters: boolean;
  due_days_after_start: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  training_library?: Pick<TrainingLibraryItem, "title" | "category">;
}

export interface TrainingAuditEntry {
  tenant_id: string;
  document_id?: string;
  assignment_id?: string;
  employee_id?: string;
  action: string;
  acting_user_id?: string;
  metadata?: Record<string, unknown>;
}

export const LIBRARY_CATEGORIES = [
  { value: "induction", label: "Induction" },
  { value: "training", label: "Training" },
  { value: "policy", label: "Policy" },
  { value: "compliance", label: "Compliance" },
  { value: "health_and_safety", label: "Health & Safety" },
  { value: "handbook", label: "Handbook" },
  { value: "sop", label: "SOP" },
  { value: "location_guide", label: "Location Guide" },
  { value: "role_guide", label: "Role Guide" },
  { value: "announcement_attachment", label: "Announcement" },
] as const;

// ─── Audit helper ───

async function writeTrainingAudit(entry: TrainingAuditEntry) {
  try {
    const { error } = await supabase.from("training_audit_log").insert({
      tenant_id: entry.tenant_id,
      document_id: entry.document_id ?? null,
      assignment_id: entry.assignment_id ?? null,
      employee_id: entry.employee_id ?? null,
      action: entry.action,
      acting_user_id: entry.acting_user_id ?? null,
      metadata: (entry.metadata ?? null) as Json,
    });
    if (error && import.meta.env.DEV) {
      console.warn("[training-audit] write failed:", error.message);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[training-audit] exception:", e);
  }
}

export { writeTrainingAudit };

// ─── Library Hooks ───

export function useTrainingLibrary() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_library", tenantId],
    queryFn: async (): Promise<TrainingLibraryItem[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_library")
        .select("*")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingLibraryItem[];
    },
    enabled: !!tenantId,
  });
}

export interface CreateLibraryItemPayload {
  title: string;
  description?: string | null;
  summary?: string | null;
  category: string;
  content_type: TrainingContentType;
  content_url?: string | null;
  completion_type: TrainingCompletionType;
  audience_scope?: string;
  requires_acknowledgement?: boolean;
  requires_completion?: boolean;
  requires_quiz?: boolean;
  counts_toward_readiness?: boolean;
  is_mandatory?: boolean;
  estimated_minutes?: number | null;
  refresher_days?: number | null;
  pass_mark?: number | null;
  retry_limit?: number | null;
}

export function useCreateLibraryItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: CreateLibraryItemPayload) => {
      await assertPermission("manage_training", tenantId!);
      const { data, error } = await supabase
        .from("training_library")
        .insert({
          title: item.title,
          description: item.description ?? null,
          summary: item.summary ?? null,
          category: item.category,
          content_type: item.content_type,
          content_url: item.content_url ?? null,
          completion_type: item.completion_type,
          audience_scope: item.audience_scope ?? "all_staff",
          requires_acknowledgement: item.requires_acknowledgement ?? false,
          requires_completion: item.requires_completion ?? false,
          requires_quiz: item.requires_quiz ?? false,
          counts_toward_readiness: item.counts_toward_readiness ?? false,
          is_mandatory: item.is_mandatory ?? false,
          estimated_minutes: item.estimated_minutes ?? null,
          refresher_days: item.refresher_days ?? null,
          pass_mark: item.pass_mark ?? 80,
          retry_limit: item.retry_limit ?? 3,
          tenant_id: tenantId,
          source_type: "tenant" as const,
          status: "draft" as const,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: (data as unknown as TrainingLibraryItem).id,
        action: "module_created",
        acting_user_id: user?.id,
        metadata: { title: item.title, category: item.category },
      });
      return data as unknown as TrainingLibraryItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module created as Draft");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface UpdateLibraryItemPayload {
  title?: string;
  description?: string | null;
  summary?: string | null;
  category?: string;
  completion_type?: string;
  audience_scope?: string;
  requires_acknowledgement?: boolean;
  requires_completion?: boolean;
  requires_quiz?: boolean;
  counts_toward_readiness?: boolean;
  is_mandatory?: boolean;
  estimated_minutes?: number | null;
  refresher_days?: number | null;
  pass_mark?: number | null;
  retry_limit?: number | null;
}

export function useUpdateLibraryItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, updates, changeSummary }: { id: string; updates: UpdateLibraryItemPayload; changeSummary?: string }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_library")
        .update(updates as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: id,
        action: "module_edited",
        acting_user_id: user?.id,
        metadata: {
          fields_changed: Object.keys(updates),
          summary: changeSummary ?? "Module fields updated",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Assignment Hooks ───

export function useTrainingAssignments(filters?: { documentId?: string; employeeId?: string; status?: string }) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_assignments", tenantId, filters],
    queryFn: async (): Promise<TrainingAssignment[]> => {
      if (!tenantId) return [];
      let q = supabase
        .from("training_assignments")
        .select("*, training_library(*), employees(forename, surname, department)")
        .eq("tenant_id", tenantId)
        .order("assigned_at", { ascending: false });
      if (filters?.documentId) q = q.eq("document_id", filters.documentId);
      if (filters?.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TrainingAssignment[];
    },
    enabled: !!tenantId,
  });
}

export function useMyTrainingAssignments(employeeId?: string) {
  return useQuery({
    queryKey: ["my_training_assignments", employeeId],
    queryFn: async (): Promise<TrainingAssignment[]> => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("training_assignments")
        .select("*, training_library(*)")
        .eq("employee_id", employeeId)
        .not("status", "eq", "cancelled")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingAssignment[];
    },
    enabled: !!employeeId,
  });
}

export interface CreateAssignmentsPayload {
  assignments: Array<{
    document_id: string;
    employee_id: string;
    due_date?: string;
    notes?: string;
    is_mandatory?: boolean;
    signoff_required?: boolean;
  }>;
  assignmentSource: AssignmentSource;
}

export function useCreateAssignments() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { notifyMany } = useNotifyEvent();
  return useMutation({
    mutationFn: async (payload: CreateAssignmentsPayload) => {
      const { assignments, assignmentSource } = payload;
      await assertPermission("manage_training", tenantId!);

      const pairs = assignments.map(a => ({ doc: a.document_id, emp: a.employee_id }));
      const empIds = [...new Set(pairs.map(p => p.emp))];
      const docIds = [...new Set(pairs.map(p => p.doc))];

      // Duplicate detection
      const { data: existing } = await supabase
        .from("training_assignments")
        .select("document_id, employee_id")
        .eq("tenant_id", tenantId!)
        .in("employee_id", empIds)
        .in("document_id", docIds)
        .not("status", "eq", "cancelled");

      const existingSet = new Set(
        ((existing ?? []) as Array<{ document_id: string; employee_id: string }>)
          .map(e => `${e.employee_id}::${e.document_id}`)
      );

      const filtered = assignments.filter(
        a => !existingSet.has(`${a.employee_id}::${a.document_id}`)
      );

      const skipped = assignments.length - filtered.length;

      if (filtered.length === 0) {
        toast.info("All selected items already have active assignments");
        // Audit the skip event
        await writeTrainingAudit({
          tenant_id: tenantId!,
          action: "duplicate_assignments_skipped",
          acting_user_id: user?.id,
          metadata: { skipped_count: assignments.length, source: assignmentSource },
        });
        return;
      }

      if (skipped > 0) {
        await writeTrainingAudit({
          tenant_id: tenantId!,
          action: "duplicate_assignments_skipped",
          acting_user_id: user?.id,
          metadata: { skipped_count: skipped, source: assignmentSource },
        });
      }

      // Resolve module versions
      const docVersions = new Map<string, number>();
      for (const docId of docIds) {
        const { data: mod } = await supabase
          .from("training_library")
          .select("version")
          .eq("id", docId)
          .single();
        docVersions.set(docId, (mod as { version: number } | null)?.version ?? 1);
      }

      const rows = filtered.map(a => ({
        tenant_id: tenantId!,
        document_id: a.document_id,
        employee_id: a.employee_id,
        due_date: a.due_date ?? null,
        notes: a.notes ?? null,
        is_mandatory: a.is_mandatory ?? false,
        signoff_required: a.signoff_required ?? false,
        status: "assigned" as const,
        assignment_source: assignmentSource,
        module_version: docVersions.get(a.document_id) ?? 1,
      }));

      const { error } = await supabase.from("training_assignments").insert(rows);
      if (error) throw error;

      if (skipped > 0) toast.info(`${skipped} duplicate(s) skipped`);

      // Audit each assignment
      const auditRows: TrainingAuditEntry[] = filtered.map(a => ({
        tenant_id: tenantId!,
        document_id: a.document_id,
        employee_id: a.employee_id,
        action: "document_assigned",
        acting_user_id: user?.id,
        metadata: { source: assignmentSource, module_version: docVersions.get(a.document_id) ?? 1 },
      }));
      for (const entry of auditRows) {
        await writeTrainingAudit(entry);
      }

      // Notify
      if (tenantId) {
        const { data: docs } = await supabase
          .from("training_library")
          .select("id, title")
          .in("id", docIds);
        const titleMap = new Map(((docs ?? []) as Array<{ id: string; title: string }>).map(d => [d.id, d.title]));

        const { data: emps } = await supabase
          .from("employees")
          .select("id, user_id")
          .in("id", empIds);
        const userMap = new Map(((emps ?? []) as Array<{ id: string; user_id: string | null }>).map(e => [e.id, e.user_id]));

        const byEmployee = new Map<string, string[]>();
        for (const a of filtered) {
          const uid = userMap.get(a.employee_id);
          if (!uid) continue;
          if (!byEmployee.has(uid)) byEmployee.set(uid, []);
          byEmployee.get(uid)!.push(titleMap.get(a.document_id) ?? "Training");
        }

        for (const [userId, titles] of byEmployee) {
          const title = titles.length === 1
            ? `New training assigned: ${titles[0]}`
            : `${titles.length} training items assigned`;
          const body = titles.length === 1
            ? "Please complete this as soon as possible."
            : `Items: ${titles.join(", ")}`;
          await notifyMany(
            [userId], "training_assigned", title, body, "/staff",
            { document_count: titles.length }
          );
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_training_assignments"] });
      qc.invalidateQueries({ queryKey: ["employee_readiness"] });
      qc.invalidateQueries({ queryKey: ["team_readiness"] });
      toast.success("Training assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { notifyAdmins } = useNotifyEvent();
  return useMutation({
    mutationFn: async ({ id, updates, action, employeeId, documentId }: {
      id: string;
      updates: Record<string, unknown>;
      action: string;
      employeeId?: string;
      documentId?: string;
    }) => {
      const { error } = await supabase
        .from("training_assignments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: documentId,
        assignment_id: id,
        employee_id: employeeId,
        action,
        acting_user_id: user?.id,
      });

      if (action === "completed" && employeeId && documentId) {
        const [{ data: emp }, { data: doc }] = await Promise.all([
          supabase.from("employees").select("forename, surname").eq("id", employeeId).single(),
          supabase.from("training_library").select("title").eq("id", documentId).single(),
        ]);
        const empName = emp ? `${(emp as { forename: string; surname: string }).forename} ${(emp as { forename: string; surname: string }).surname}` : "An employee";
        const docTitle = doc ? (doc as { title: string }).title : "training";
        await notifyAdmins(
          "training_completed",
          `${empName} completed: ${docTitle}`,
          "Training has been marked as complete.",
          "/training",
          { employee_id: employeeId, document_id: documentId }
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_assignments"] });
      qc.invalidateQueries({ queryKey: ["my_training_assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Quiz Hooks ───

export function useQuizQuestions(documentId?: string) {
  return useQuery({
    queryKey: ["training_quiz", documentId],
    queryFn: async (): Promise<QuizQuestion[]> => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("training_quiz_questions")
        .select("*")
        .eq("document_id", documentId)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as QuizQuestion[];
    },
    enabled: !!documentId,
  });
}

// ─── Auto Rules ───

export function useAutoAssignmentRules() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_auto_rules", tenantId],
    queryFn: async (): Promise<TrainingAutoRule[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_auto_rules")
        .select("*, training_library(title, category)")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingAutoRule[];
    },
    enabled: !!tenantId,
  });
}

export interface CreateAutoRulePayload {
  document_id: string;
  rule_name: string;
  target_roles?: string[];
  target_departments?: string[];
  target_locations?: string[];
  apply_to_new_starters?: boolean;
  due_days_after_start?: number | null;
}

export function useCreateAutoRule() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rule: CreateAutoRulePayload) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_auto_rules")
        .insert({
          tenant_id: tenantId!,
          document_id: rule.document_id,
          rule_name: rule.rule_name,
          target_roles: rule.target_roles ?? [],
          target_departments: rule.target_departments ?? [],
          target_locations: rule.target_locations ?? [],
          apply_to_new_starters: rule.apply_to_new_starters ?? true,
          due_days_after_start: rule.due_days_after_start ?? 7,
        });
      if (error) throw error;
      await writeTrainingAudit({
        tenant_id: tenantId!,
        document_id: rule.document_id,
        action: "auto_rule_created",
        acting_user_id: user?.id,
        metadata: { rule_name: rule.rule_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_auto_rules"] });
      toast.success("Auto-assignment rule created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
