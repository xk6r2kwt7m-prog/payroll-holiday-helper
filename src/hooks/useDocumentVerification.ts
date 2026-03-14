import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export type DocumentStatus = "uploaded" | "pending_verification" | "verified" | "rejected" | "expired";

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      employeeId,
      tenantId,
      verificationMethod,
      notes,
    }: {
      documentId: string;
      employeeId: string;
      tenantId: string;
      verificationMethod: string;
      notes?: string;
    }) => {
      await assertPermission("manage_documents", tenantId);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("employee_documents")
        .update({
          document_status: "verified",
          verified_by: user?.id,
          verification_date: new Date().toISOString(),
          verification_method: verificationMethod,
          verification_notes: notes || null,
        } as any)
        .eq("id", documentId);
      if (error) throw error;

      await supabase
        .from("document_audit_log" as any)
        .insert({
          document_id: documentId,
          employee_id: employeeId,
          tenant_id: tenantId,
          action: "verify",
          performed_by: user?.id,
          metadata: { verification_method: verificationMethod, notes },
        } as any);

      // Notify the employee their document was verified
      const { data: emp } = await supabase
        .from("employees")
        .select("user_id, forename")
        .eq("id", employeeId)
        .maybeSingle();

      if (emp?.user_id) {
        await supabase.from("notifications" as any).insert({
          tenant_id: tenantId,
          user_id: emp.user_id,
          event_type: "document_verified",
          title: "Document verified",
          body: "Your document has been reviewed and approved.",
          link: "/staff",
          metadata: { document_id: documentId },
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
      toast.success("Document verified");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      employeeId,
      tenantId,
      reason,
    }: {
      documentId: string;
      employeeId: string;
      tenantId: string;
      reason: string;
    }) => {
      await assertPermission("manage_documents", tenantId);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("employee_documents")
        .update({
          document_status: "rejected",
          rejected_reason: reason,
          verified_by: user?.id,
          verification_date: new Date().toISOString(),
        } as any)
        .eq("id", documentId);
      if (error) throw error;

      await supabase
        .from("document_audit_log" as any)
        .insert({
          document_id: documentId,
          employee_id: employeeId,
          tenant_id: tenantId,
          action: "reject",
          performed_by: user?.id,
          metadata: { reason },
        } as any);

      // Notify the employee their document was rejected
      const { data: emp } = await supabase
        .from("employees")
        .select("user_id, forename")
        .eq("id", employeeId)
        .maybeSingle();

      if (emp?.user_id) {
        await supabase.from("notifications" as any).insert({
          tenant_id: tenantId,
          user_id: emp.user_id,
          event_type: "document_rejected",
          title: "Document needs attention",
          body: `Your document was not approved: ${reason}. Please upload a new version.`,
          link: "/staff",
          metadata: { document_id: documentId, reason },
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
      toast.success("Document rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useLogDocumentAction() {
  return useMutation({
    mutationFn: async ({
      documentId,
      employeeId,
      tenantId,
      action,
      metadata,
    }: {
      documentId: string;
      employeeId: string;
      tenantId: string;
      action: string;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("document_audit_log" as any)
        .insert({
          document_id: documentId,
          employee_id: employeeId,
          tenant_id: tenantId,
          action,
          performed_by: user?.id,
          metadata: metadata || null,
        } as any);
    },
  });
}
