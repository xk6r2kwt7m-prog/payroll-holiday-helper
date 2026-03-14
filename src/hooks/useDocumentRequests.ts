import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface DocumentRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  requested_by: string | null;
  document_type: string;
  request_title: string;
  request_description: string | null;
  due_date: string | null;
  priority: string;
  requires_verification: boolean;
  status: string;
  fulfilled_document_id: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  verified_at: string | null;
  viewed_at: string | null;
  cancelled_at: string | null;
  employees?: {
    id: string;
    forename: string;
    surname: string;
    department: string;
    email: string | null;
  };
}

export const REQUEST_DOCUMENT_TYPES = [
  { value: "passport", label: "Passport", emoji: "🛂" },
  { value: "visa", label: "Visa", emoji: "🎫" },
  { value: "right_to_work", label: "Right to Work", emoji: "✅" },
  { value: "share_code", label: "Share Code Evidence", emoji: "🔑" },
  { value: "bank_details", label: "Bank Details Confirmation", emoji: "🏦" },
  { value: "proof_of_address", label: "Proof of Address", emoji: "🏠" },
  { value: "food_hygiene", label: "Food Hygiene Certificate", emoji: "🍽️" },
  { value: "training_certificate", label: "Training Certificate", emoji: "🎓" },
  { value: "signed_contract", label: "Signed Contract", emoji: "📝" },
  { value: "policy_acknowledgement", label: "Policy Acknowledgement", emoji: "📋" },
  { value: "sick_note", label: "Sick Note", emoji: "🏥" },
  { value: "p45", label: "P45", emoji: "📋" },
  { value: "driving_license", label: "Driving License", emoji: "🚗" },
  { value: "other", label: "Other / Custom", emoji: "📎" },
];

// ─── Admin/Manager hooks ───

export function useDocumentRequests(filters?: {
  status?: string;
  employeeId?: string;
  priority?: string;
}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_requests", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("document_requests" as any)
        .select("*, employees:employee_id(id, forename, surname, department, email)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DocumentRequest[];
    },
    enabled: !!tenantId,
  });
}

export function useOverdueDocumentRequests() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_requests_overdue", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("document_requests" as any)
        .select("*, employees:employee_id(id, forename, surname, department)")
        .eq("tenant_id", tenantId!)
        .in("status", ["requested", "viewed"])
        .lt("due_date", today)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DocumentRequest[];
    },
    enabled: !!tenantId,
  });
}

export function usePendingReviewRequests() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_requests_pending_review", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_requests" as any)
        .select("*, employees(id, forename, surname, department)")
        .eq("tenant_id", tenantId!)
        .in("status", ["uploaded", "pending_review"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DocumentRequest[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateDocumentRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      document_type: string;
      request_title: string;
      request_description?: string;
      due_date?: string;
      priority?: string;
      requires_verification?: boolean;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("document_requests" as any)
        .insert({
          tenant_id: tenantId!,
          employee_id: payload.employee_id,
          requested_by: user?.id,
          document_type: payload.document_type,
          request_title: payload.request_title,
          request_description: payload.request_description || null,
          due_date: payload.due_date || null,
          priority: payload.priority || "normal",
          requires_verification: payload.requires_verification ?? false,
          notes: payload.notes || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Audit log
      await supabase.from("document_request_audit" as any).insert({
        tenant_id: tenantId!,
        request_id: (data as any).id,
        employee_id: payload.employee_id,
        performed_by: user?.id,
        action: "request_created",
        metadata: { document_type: payload.document_type, priority: payload.priority },
      } as any);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success("Document request created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useBulkCreateDocumentRequests() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (payload: {
      employee_ids: string[];
      document_type: string;
      request_title: string;
      request_description?: string;
      due_date?: string;
      priority?: string;
      requires_verification?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = payload.employee_ids.map(eid => ({
        tenant_id: tenantId!,
        employee_id: eid,
        requested_by: user?.id,
        document_type: payload.document_type,
        request_title: payload.request_title,
        request_description: payload.request_description || null,
        due_date: payload.due_date || null,
        priority: payload.priority || "normal",
        requires_verification: payload.requires_verification ?? false,
      }));

      const { data, error } = await supabase
        .from("document_requests" as any)
        .insert(rows as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success(`${(data as any[]).length} document requests created`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDocumentRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<DocumentRequest>;
    }) => {
      const { error } = await supabase
        .from("document_requests" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useVerifyDocumentRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, employeeId, tenantId }: {
      requestId: string;
      employeeId: string;
      tenantId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("document_requests" as any)
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId);
      if (error) throw error;

      await supabase.from("document_request_audit" as any).insert({
        tenant_id: tenantId,
        request_id: requestId,
        employee_id: employeeId,
        performed_by: user?.id,
        action: "request_verified",
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success("Document request verified");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejectDocumentRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, employeeId, tenantId, reason }: {
      requestId: string;
      employeeId: string;
      tenantId: string;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("document_requests" as any)
        .update({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId);
      if (error) throw error;

      await supabase.from("document_request_audit" as any).insert({
        tenant_id: tenantId,
        request_id: requestId,
        employee_id: employeeId,
        performed_by: user?.id,
        action: "request_rejected",
        metadata: { reason },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success("Document rejected — employee notified");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCancelDocumentRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, employeeId, tenantId }: {
      requestId: string;
      employeeId: string;
      tenantId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("document_requests" as any)
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId);
      if (error) throw error;

      await supabase.from("document_request_audit" as any).insert({
        tenant_id: tenantId,
        request_id: requestId,
        employee_id: employeeId,
        performed_by: user?.id,
        action: "request_cancelled",
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success("Request cancelled");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Employee hooks ───

export function useMyDocumentRequests(employeeId: string) {
  return useQuery({
    queryKey: ["my_document_requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_requests" as any)
        .select("*")
        .eq("employee_id", employeeId)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DocumentRequest[];
    },
    enabled: !!employeeId,
  });
}

export function useMarkRequestViewed() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from("document_requests" as any)
        .update({
          status: "viewed",
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId)
        .eq("status", "requested");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_document_requests"] });
    },
  });
}

export function useFulfillDocumentRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, documentId, tenantId, employeeId }: {
      requestId: string;
      documentId: string;
      tenantId: string;
      employeeId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("document_requests" as any)
        .update({
          status: "uploaded",
          fulfilled_document_id: documentId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", requestId);
      if (error) throw error;

      await supabase.from("document_request_audit" as any).insert({
        tenant_id: tenantId,
        request_id: requestId,
        employee_id: employeeId,
        performed_by: user?.id,
        action: "document_uploaded",
        metadata: { document_id: documentId },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_document_requests"] });
      qc.invalidateQueries({ queryKey: ["document_requests"] });
      toast.success("Document uploaded successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Templates ───

export function useDocumentRequestTemplates() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_request_templates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_request_templates" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("template_name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });
}

// ─── Dashboard stats ───

export function useDocumentRequestStats() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_request_stats", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      const soonStr = soon.toISOString().split("T")[0];

      const { data: all, error } = await supabase
        .from("document_requests" as any)
        .select("id, status, due_date, priority")
        .eq("tenant_id", tenantId!)
        .not("status", "in", '("verified","cancelled")');
      if (error) throw error;

      const items = (all || []) as any[];
      const overdue = items.filter(r => r.due_date && r.due_date < today && ["requested", "viewed"].includes(r.status));
      const dueSoon = items.filter(r => r.due_date && r.due_date >= today && r.due_date <= soonStr && ["requested", "viewed"].includes(r.status));
      const pendingReview = items.filter(r => ["uploaded", "pending_review"].includes(r.status));
      const rejected = items.filter(r => r.status === "rejected");

      return {
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        pendingReview: pendingReview.length,
        rejected: rejected.length,
        total: items.length,
      };
    },
    enabled: !!tenantId,
  });
}
