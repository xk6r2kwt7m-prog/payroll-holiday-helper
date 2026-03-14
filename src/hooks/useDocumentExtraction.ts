import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExtractedDocumentData {
  document_type?: string;
  full_name?: string;
  surname?: string;
  given_names?: string;
  document_number?: string;
  nationality?: string;
  date_of_birth?: string;
  issue_date?: string;
  expiry_date?: string;
  gender?: string;
  mrz_data?: {
    line1?: string;
    line2?: string;
    passport_number?: string;
    surname?: string;
    given_names?: string;
    nationality?: string;
    date_of_birth?: string;
    expiry_date?: string;
    gender?: string;
  };
}

export interface ExtractionWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface ExtractionResult {
  extracted: boolean;
  data?: ExtractedDocumentData;
  warnings?: ExtractionWarning[];
  confidence?: number;
  source?: string;
}

export function useExtractDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      tenantId,
    }: {
      documentId: string;
      tenantId: string;
    }): Promise<ExtractionResult> => {
      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { documentId, tenantId },
      });

      if (error) throw new Error(error.message || "Extraction failed");
      if (data?.error) throw new Error(data.error);

      return data as ExtractionResult;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
      if (result.extracted) {
        const warnCount = result.warnings?.filter((w) => w.severity === "error").length || 0;
        if (warnCount > 0) {
          toast.warning("Document extracted with warnings — review needed");
        } else {
          toast.success("Document data extracted successfully");
        }
      } else {
        toast.info("Document format doesn't support extraction");
      }
    },
    onError: (e: Error) => {
      if (e.message.includes("Rate limit")) {
        toast.error("Too many requests — please try again shortly");
      } else if (e.message.includes("credits")) {
        toast.error("AI credits exhausted — contact your administrator");
      } else {
        toast.error(`Extraction failed: ${e.message}`);
      }
    },
  });
}
