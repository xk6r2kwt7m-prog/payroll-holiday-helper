import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEmailPolicy } from "@/hooks/useEmailPolicy";
import { applyTestSubject } from "@/lib/contract-test-mode";

interface SendContractEmailParams {
  recipientEmail: string;
  employeeName: string;
  signingUrl: string;
  signingTokenId: string;
  employeeId: string;
  employeeDocumentId: string;
  /**
   * Rehearsal send to the admin's own inbox. The staff member's record is
   * never marked as sent; the send is audit logged as a test.
   */
  testMode?: boolean;
}

interface SendContractEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export function useSendContractEmail() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { isSendAllowed } = useEmailPolicy();

  const sendContractEmail = useCallback(
    async (params: SendContractEmailParams): Promise<SendContractEmailResult> => {
      // Check email policy before sending
      if (!isSendAllowed("contracts")) {
        console.warn("[CONTRACT_EMAIL] Blocked by email policy: contracts category is disabled");

        // Log blocked attempt to audit
        try {
          await supabase.from("audit_log").insert({
            action: "create" as const,
            table_name: "contract_email_blocked",
            record_id: params.employeeDocumentId,
            tenant_id: tenantId,
            new_data: {
              event: "contract_email_blocked",
              status: "blocked",
              reason: "Email automation policy: contracts category is disabled",
              recipient_email: params.recipientEmail,
              employee_name: params.employeeName,
              employee_document_id: params.employeeDocumentId,
              trigger: "manual_send",
              blocked_at: new Date().toISOString(),
            },
          });
        } catch { /* non-critical */ }

        return {
          success: false,
          error: "Contract emails are currently disabled. Enable them in Settings → Email Automation.",
        };
      }
      const {
        recipientEmail,
        employeeName,
        signingUrl,
        signingTokenId,
        employeeId,
        employeeDocumentId,
      } = params;
      const isTest = !!params.testMode;

      console.log("[CONTRACT_EMAIL] Sending contract to", recipientEmail, {
        employee: employeeName,
        tokenId: signingTokenId,
        documentId: employeeDocumentId,
      });

      try {
        const { data, error } = await supabase.functions.invoke("send-notification", {
          body: {
            to: recipientEmail,
            subject: applyTestSubject("Your contract is ready to sign", isTest),
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
          // Persist failure (never on a test run — the staff record stays untouched)
          if (!isTest) {
            await supabase
              .from("employee_documents")
              .update({
                contract_send_status: "failed",
                contract_send_error: error.message,
              } as any)
              .eq("id", employeeDocumentId);
          }
          return { success: false, error: error.message };
        }

        if (data?.error) {
          console.error("[CONTRACT_EMAIL] Provider error", data.error);
          if (!isTest) {
            await supabase
              .from("employee_documents")
              .update({
                contract_send_status: "failed",
                contract_send_error: data.error,
              } as any)
              .eq("id", employeeDocumentId);
          }
          return { success: false, error: data.error };
        }

        // Persist sent status on the document record (real sends only)
        if (!isTest) {
          await supabase
            .from("employee_documents")
            .update({
              contract_sent_at: new Date().toISOString(),
              contract_sent_to: recipientEmail,
              contract_send_status: "sent",
              contract_send_error: null,
              contract_last_token_id: signingTokenId,
            } as any)
            .eq("id", employeeDocumentId);
        }

        // Log to audit
        try {
          await supabase.from("audit_log").insert({
            action: "create" as const,
            table_name: isTest ? "contract_email_test_send" : "contract_email_sent",
            record_id: signingTokenId,
            tenant_id: tenantId,
            new_data: {
              event: isTest ? "contract_email_test_send" : "contract_email_sent",
              test_send: isTest,
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

        // Invalidate queries so UI reflects new status
        queryClient.invalidateQueries({ queryKey: ["all_contracts"] });
        queryClient.invalidateQueries({ queryKey: ["employee_documents"] });
        queryClient.invalidateQueries({ queryKey: ["signing_tokens"] });
        queryClient.invalidateQueries({ queryKey: ["employee_readiness"] });
        queryClient.invalidateQueries({ queryKey: ["team_readiness"] });
        queryClient.invalidateQueries({ queryKey: ["contract-email-delivery", employeeDocumentId] });

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
        // Persist failure (real sends only)
        if (!isTest) {
          try {
            await supabase
              .from("employee_documents")
              .update({
                contract_send_status: "failed",
                contract_send_error: msg,
              } as any)
              .eq("id", employeeDocumentId);
          } catch { /* non-critical */ }
        }
        return { success: false, error: msg };
      }
    },
    [tenantId, queryClient, isSendAllowed]
  );

  return { sendContractEmail };
}
