import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGenerateSigningLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeDocumentId,
      employeeId,
      signerType,
      expiresInDays = 7,
    }: {
      employeeDocumentId: string;
      employeeId: string;
      signerType: "employee" | "employer";
      expiresInDays?: number;
    }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from("signing_tokens")
        .insert({
          employee_document_id: employeeDocumentId,
          employee_id: employeeId,
          signer_type: signerType,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_signatures"] });
      queryClient.invalidateQueries({ queryKey: ["signing_tokens"] });
    },
  });
}

export function useContractSignatures(employeeDocumentId?: string) {
  return useQuery({
    queryKey: ["contract_signatures", employeeDocumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("employee_document_id", employeeDocumentId!)
        .order("signed_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!employeeDocumentId,
  });
}

export function useSigningTokens(employeeDocumentId?: string) {
  return useQuery({
    queryKey: ["signing_tokens", employeeDocumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signing_tokens")
        .select("*")
        .eq("employee_document_id", employeeDocumentId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!employeeDocumentId,
  });
}
