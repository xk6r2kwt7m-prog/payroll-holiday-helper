import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";

export function useEvidenceRequests(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["evidence_requests", tenantId, employeeId],
    queryFn: async () => {
      let query = supabase
        .from("evidence_requests" as any)
        .select("*, employees(id, forename, surname)")
        .order("created_at", { ascending: false });
      if (employeeId) query = query.eq("employee_id", employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });
}

export function useMyEvidenceRequests() {
  return useQuery({
    queryKey: ["my_evidence_requests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) return [];
      const { data, error } = await supabase
        .from("evidence_requests" as any)
        .select("*")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useMyEvidenceFiles() {
  return useQuery({
    queryKey: ["my_evidence_files"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) return [];
      const { data, error } = await supabase
        .from("evidence_files" as any)
        .select("*")
        .eq("employee_id", emp.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useEvidenceFiles(filters?: { employeeId?: string; requestId?: string; status?: string }) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["evidence_files", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("evidence_files" as any)
        .select("*, employees(id, forename, surname), evidence_requests(id, title, request_type)")
        .order("uploaded_at", { ascending: false });
      if (filters?.employeeId) query = query.eq("employee_id", filters.employeeId);
      if (filters?.requestId) query = query.eq("request_id", filters.requestId);
      if (filters?.status) query = query.eq("review_status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateEvidenceRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (req: {
      employee_id: string;
      request_type: string;
      title: string;
      description?: string;
      due_date?: string;
      related_date?: string;
      related_time_entry_id?: string;
      related_absence_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("evidence_requests" as any)
        .insert({ ...req, tenant_id: tenantId!, requested_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence_requests"] });
    },
  });
}

export function useUploadEvidence() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      file: File;
      fileType: string;
      notes?: string;
      relatedDate?: string;
      requestId?: string;
    }) => {
      const filePath = `${tenantId}/${params.employeeId}/${Date.now()}_${params.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, params.file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("evidence_files" as any)
        .insert({
          employee_id: params.employeeId,
          tenant_id: tenantId!,
          request_id: params.requestId || null,
          file_type: params.fileType,
          file_path: filePath,
          original_filename: params.file.name,
          file_size: params.file.size,
          mime_type: params.file.type,
          related_date: params.relatedDate || null,
          notes: params.notes || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // If linked to a request, update request status
      if (params.requestId) {
        await supabase
          .from("evidence_requests" as any)
          .update({ status: "uploaded" } as any)
          .eq("id", params.requestId);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence_files"] });
      qc.invalidateQueries({ queryKey: ["my_evidence_files"] });
      qc.invalidateQueries({ queryKey: ["evidence_requests"] });
      qc.invalidateQueries({ queryKey: ["my_evidence_requests"] });
    },
  });
}

export function useReviewEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fileId: string;
      status: "approved" | "rejected" | "more_info_requested";
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("evidence_files" as any)
        .update({
          review_status: params.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: params.notes || null,
        } as any)
        .eq("id", params.fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence_files"] });
      qc.invalidateQueries({ queryKey: ["my_evidence_files"] });
    },
  });
}

export function useUpdateEvidenceRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: string }) => {
      const { error } = await supabase
        .from("evidence_requests" as any)
        .update({ status: params.status, updated_at: new Date().toISOString() } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence_requests"] });
      qc.invalidateQueries({ queryKey: ["my_evidence_requests"] });
    },
  });
}
