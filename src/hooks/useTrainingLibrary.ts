import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export type TrainingContentType = "document" | "internal_page" | "external_link";

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
  // Enhanced fields
  source_type: "platform" | "tenant" | "adapted";
  source_module_id: string | null;
  status: string;
  completion_type: string;
  audience_scope: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  change_log: string | null;
  refresher_days: number | null;
  estimated_minutes: number | null;
  is_mandatory: boolean;
  pass_mark: number;
  retry_limit: number;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  document_id: string;
  employee_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  status: string;
  viewed_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  reminder_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  signoff_required: boolean;
  signoff_status: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
  signoff_checklist: any;
  module_version: number;
  is_mandatory: boolean;
  score: number | null;
  training_library?: TrainingLibraryItem;
  employees?: { forename: string; surname: string; department: string };
}

export interface QuizQuestion {
  id: string;
  document_id: string;
  tenant_id: string | null;
  question: string;
  question_type: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  display_order: number;
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
];

// ─── Library Hooks ───

export function useTrainingLibrary() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_library", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_library" as any)
        .select("*")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TrainingLibraryItem[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateLibraryItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Partial<TrainingLibraryItem>) => {
      await assertPermission("manage_training", tenantId!);
      const { data, error } = await supabase
        .from("training_library" as any)
        .insert({
          ...item,
          tenant_id: tenantId,
          source_type: "tenant",
          status: "draft",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("training_audit_log" as any).insert({
        tenant_id: tenantId,
        document_id: (data as any).id,
        action: "document_created",
      } as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module created as Draft");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateLibraryItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TrainingLibraryItem> }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_library" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_library"] });
      toast.success("Module updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Assignment Hooks ───

export function useTrainingAssignments(filters?: { documentId?: string; employeeId?: string; status?: string }) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_assignments", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("training_assignments" as any)
        .select("*, training_library(*), employees(forename, surname, department)")
        .eq("tenant_id", tenantId)
        .order("assigned_at", { ascending: false });
      if (filters?.documentId) q = q.eq("document_id", filters.documentId);
      if (filters?.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as TrainingAssignment[];
    },
    enabled: !!tenantId,
  });
}

export function useMyTrainingAssignments(employeeId?: string) {
  return useQuery({
    queryKey: ["my_training_assignments", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("training_assignments" as any)
        .select("*, training_library(*)")
        .eq("employee_id", employeeId)
        .not("status", "eq", "cancelled")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TrainingAssignment[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateAssignments() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { notifyMany } = useNotifyEvent();
  return useMutation({
    mutationFn: async (assignments: Array<{ document_id: string; employee_id: string; due_date?: string; notes?: string; is_mandatory?: boolean; signoff_required?: boolean }>) => {
      await assertPermission("manage_training", tenantId!);

      const pairs = assignments.map(a => ({ doc: a.document_id, emp: a.employee_id }));
      const empIds = [...new Set(pairs.map(p => p.emp))];
      const docIds = [...new Set(pairs.map(p => p.doc))];

      const { data: existing } = await supabase
        .from("training_assignments" as any)
        .select("document_id, employee_id")
        .eq("tenant_id", tenantId!)
        .in("employee_id", empIds)
        .in("document_id", docIds)
        .not("status", "eq", "cancelled");

      const existingSet = new Set(
        ((existing || []) as any[]).map((e: any) => `${e.employee_id}::${e.document_id}`)
      );

      const filtered = assignments.filter(
        a => !existingSet.has(`${a.employee_id}::${a.document_id}`)
      );

      if (filtered.length === 0) {
        toast.info("All selected items already have active assignments");
        return;
      }

      // Resolve module versions for each unique document
      const docVersions = new Map<string, number>();
      for (const docId of docIds) {
        const { data: mod } = await supabase
          .from("training_library" as any)
          .select("version")
          .eq("id", docId)
          .single();
        docVersions.set(docId, (mod as any)?.version || 1);
      }

      const rows = filtered.map(a => ({
        ...a,
        tenant_id: tenantId,
        status: "assigned",
        assignment_source: assignmentSource || "direct",
        module_version: docVersions.get(a.document_id) || 1,
      }));
      const { error } = await supabase.from("training_assignments" as any).insert(rows as any);
      if (error) throw error;

      const skipped = assignments.length - filtered.length;
      if (skipped > 0) toast.info(`${skipped} duplicate(s) skipped`);

      const auditRows = filtered.map(a => ({
        tenant_id: tenantId,
        document_id: a.document_id,
        employee_id: a.employee_id,
        action: "document_assigned",
      }));
      await supabase.from("training_audit_log" as any).insert(auditRows as any);

      // Notify
      if (tenantId) {
        const { data: docs } = await supabase
          .from("training_library" as any)
          .select("id, title")
          .in("id", docIds);
        const titleMap = new Map((docs || []).map((d: any) => [d.id, d.title]));

        const { data: emps } = await supabase
          .from("employees" as any)
          .select("id, user_id")
          .in("id", empIds);
        const userMap = new Map((emps || []).map((e: any) => [e.id, e.user_id]));

        const byEmployee = new Map<string, string[]>();
        for (const a of filtered) {
          const uid = userMap.get(a.employee_id);
          if (!uid) continue;
          if (!byEmployee.has(uid)) byEmployee.set(uid, []);
          byEmployee.get(uid)!.push(titleMap.get(a.document_id) || "Training");
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
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { notifyAdmins } = useNotifyEvent();
  return useMutation({
    mutationFn: async ({ id, updates, action, employeeId, documentId }: {
      id: string;
      updates: Record<string, any>;
      action: string;
      employeeId?: string;
      documentId?: string;
    }) => {
      const { error } = await supabase
        .from("training_assignments" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      await supabase.from("training_audit_log" as any).insert({
        tenant_id: tenantId,
        document_id: documentId,
        assignment_id: id,
        employee_id: employeeId,
        action,
      } as any);

      if (action === "completed" && employeeId && documentId) {
        const [{ data: emp }, { data: doc }] = await Promise.all([
          supabase.from("employees" as any).select("forename, surname").eq("id", employeeId).single(),
          supabase.from("training_library" as any).select("title").eq("id", documentId).single(),
        ]);
        const empName = emp ? `${(emp as any).forename} ${(emp as any).surname}` : "An employee";
        const docTitle = doc ? (doc as any).title : "training";
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
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Quiz Hooks ───

export function useQuizQuestions(documentId?: string) {
  return useQuery({
    queryKey: ["training_quiz", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("training_quiz_questions" as any)
        .select("*")
        .eq("document_id", documentId)
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as QuizQuestion[];
    },
    enabled: !!documentId,
  });
}

// ─── Auto Rules ───

export function useAutoAssignmentRules() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_auto_rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_auto_rules" as any)
        .select("*, training_library(title, category)")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAutoRule() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (rule: Record<string, any>) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase
        .from("training_auto_rules" as any)
        .insert({ ...rule, tenant_id: tenantId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_auto_rules"] });
      toast.success("Auto-assignment rule created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
