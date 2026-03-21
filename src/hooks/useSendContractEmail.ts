import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useCallback } from "react";

interface SendContractEmailParams {
  recipientEmail: string;
  employeeName: string;
  signingUrl: string;
  signingTokenId: string;
  employeeId: string;
  employeeDocumentId: string;
}

interface SendContractEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export function useSendContractEmail() {
  const { tenantId } = useTenant();

  const sendContractEmail = useCallback(
    async (params: SendContractEmailParams): Promise<SendContractEmailResult> => {
      const {
        recipientEmail,
        employeeName,
        signingUrl,
        signingTokenId,
        employeeId,
        employeeDocumentId,
      } = params;

      console.log("[CONTRACT_EMAIL] Sending contract to", recipientEmail, {
        employee: employeeName,
        tokenId: signingTokenId,
        documentId: employeeDocumentId,
      });

      try {
        const { data, error } = await supabase.functions.invoke("send-notification", {
          body: {
            to: recipientEmail,
            subject: "Your contract is ready to sign",
            type: "contract_signing",
            data: {
              employee_name: employeeName,
              signing_url: signingUrl,
            },
            tenant_id: tenantId,
          },
        });

        if (error) {
          console.error("[CONTRACT_EMAIL] Edge function error", error.message);
          return { success: false, error: error.message };
        }

        if (data?.error) {
          console.error("[CONTRACT_EMAIL] Provider error", data.error);
          return { success: false, error: data.error };
        }

        // Log to audit
        try {
          await supabase.from("audit_log").insert({
            action: "create" as const,
            table_name: "contract_email_sent",
            record_id: signingTokenId,
            tenant_id: tenantId,
            new_data: {
              event: "contract_email_sent",
              employee_id: employeeId,
              employee_document_id: employeeDocumentId,
              signing_token_id: signingTokenId,
              recipient_email: recipientEmail,
              employee_name: employeeName,
              message_id: data?.diagnostics?.message_id || null,
              provider: data?.diagnostics?.provider || null,
              sent_at: new Date().toISOString(),
            },
          });
        } catch (auditErr) {
          console.warn("[CONTRACT_EMAIL] Audit log failed (non-critical)", auditErr);
        }

        console.log("[CONTRACT_EMAIL] Sent successfully", {
          messageId: data?.diagnostics?.message_id,
          provider: data?.diagnostics?.provider,
        });

        return {
          success: true,
          messageId: data?.diagnostics?.message_id,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[CONTRACT_EMAIL] Exception", msg);
        return { success: false, error: msg };
      }
    },
    [tenantId]
  );

  return { sendContractEmail };
}
