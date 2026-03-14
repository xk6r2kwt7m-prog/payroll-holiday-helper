import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";

export type DocumentType = Database["public"]["Enums"]["document_type"];

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: DocumentType;
  document_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES: { value: DocumentType; label: string; emoji: string }[] = [
  { value: "contract", label: "Contract", emoji: "📄" },
  { value: "id_document", label: "ID Document", emoji: "🪪" },
  { value: "passport", label: "Passport", emoji: "🛂" },
  { value: "right_to_work", label: "Right to Work", emoji: "✅" },
  { value: "visa", label: "Visa", emoji: "🎫" },
  { value: "driving_license", label: "Driving License", emoji: "🚗" },
  { value: "bank_statement", label: "Bank Statement", emoji: "🏦" },
  { value: "p45", label: "P45", emoji: "📋" },
  { value: "p60", label: "P60", emoji: "📋" },
  { value: "other", label: "Other", emoji: "📎" },
];

export function useEmployeeDocuments(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_documents", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!employeeId,
  });
}

export function useAllExpiringDocuments(daysAhead: number = 30) {
  return useQuery({
    queryKey: ["expiring_documents", daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from("employee_documents")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .not("expires_at", "is", null)
        .lte("expires_at", futureDate.toISOString().split("T")[0])
        .order("expires_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      employeeId,
      file,
      documentType,
      documentName,
      expiresAt,
      notes,
    }: {
      employeeId: string;
      file: File;
      documentType: DocumentType;
      documentName: string;
      expiresAt?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${employeeId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employeeId,
          document_type: documentType,
          document_name: documentName,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          expires_at: expiresAt || null,
          notes: notes || null,
          uploaded_by: user?.id,
          tenant_id: tenantId!,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee_documents", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["expiring_documents"] });

      // Notify admins about new document upload
      if (tenantId) {
        try {
          const { data: emp } = await supabase
            .from("employees")
            .select("forename, surname")
            .eq("id", employeeId)
            .maybeSingle();

          const { data: admins } = await supabase
            .from("tenant_members" as any)
            .select("user_id")
            .eq("tenant_id", tenantId)
            .in("role", ["company_admin", "manager"])
            .eq("is_active", true);

          if (admins && admins.length > 0 && emp) {
            const rows = (admins as any[])
              .map((a) => a.user_id)
              .filter(Boolean)
              .map((uid: string) => ({
                tenant_id: tenantId,
                user_id: uid,
                event_type: "document_uploaded",
                title: "New document uploaded",
                body: `${emp.forename} ${emp.surname} uploaded a document for review.`,
                link: "/employees",
                metadata: { employee_id: employeeId },
              }));
            await supabase.from("notifications" as any).insert(rows as any);
          }
        } catch (err) {
          console.warn("Failed to send document upload notification:", err);
        }
      }
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        document_name?: string;
        expires_at?: string | null;
        notes?: string | null;
      };
    }) => {
      const { data, error } = await supabase
        .from("employee_documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_documents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring_documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from("employee-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete document record
      const { error } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_documents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring_documents"] });
    },
  });
}

export function useDocumentDownloadUrl(filePath: string) {
  return useQuery({
    queryKey: ["document_url", filePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 1000 * 60 * 55, // Refetch 5 mins before expiry
  });
}

export function getExpiryStatus(expiresAt: string | null): {
  status: "valid" | "expiring" | "expired";
  label: string;
  daysUntil: number | null;
} {
  if (!expiresAt) {
    return { status: "valid", label: "No expiry", daysUntil: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiresAt);
  expiryDate.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return { status: "expired", label: `Expired ${Math.abs(daysUntil)} days ago`, daysUntil };
  } else if (daysUntil <= 30) {
    return { status: "expiring", label: `Expires in ${daysUntil} days`, daysUntil };
  } else {
    return { status: "valid", label: `Expires ${expiryDate.toLocaleDateString()}`, daysUntil };
  }
}
