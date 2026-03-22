import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";

interface InviteEmailPayload {
  recipientEmail: string;
  employeeName: string;
  companyName?: string;
  tenantId: string;
}

interface InviteEmailResult {
  attempted: boolean;
  success: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Centralised hook for sending employee invitation emails.
 * Wraps the send-notification edge function with structured diagnostics.
 */
export function useInviteEmail() {
  const sendInviteEmail = useCallback(
    async (payload: InviteEmailPayload): Promise<InviteEmailResult> => {
      const timestamp = new Date().toISOString();
      const loginUrl = `${window.location.origin}/auth`;

      console.log("[INVITE_EMAIL] Attempting send", {
        to: payload.recipientEmail,
        employee: payload.employeeName,
        tenant: payload.tenantId,
        timestamp,
      });

      try {
        const { data, error } = await supabase.functions.invoke("send-notification", {
          body: {
            to: payload.recipientEmail,
            subject: "Set up your access to Ugly Dumpling",
            type: "employee_invitation",
            data: {
              company_name: payload.companyName || "Ugly Dumpling",
              employee_name: payload.employeeName,
              login_url: loginUrl,
            },
            tenant_id: payload.tenantId,
          },
        });

        if (error) {
          console.error("[INVITE_EMAIL] Edge function error", { error: error.message, timestamp });
          return { attempted: true, success: false, error: error.message, timestamp };
        }

        if (data?.error) {
          console.error("[INVITE_EMAIL] Provider error", {
            error: data.error,
            provider: data.diagnostics?.provider,
            timestamp,
          });
          return {
            attempted: true,
            success: false,
            provider: data.diagnostics?.provider,
            error: data.error,
            timestamp,
          };
        }

        console.log("[INVITE_EMAIL] Sent successfully", {
          provider: data?.diagnostics?.provider,
          messageId: data?.diagnostics?.message_id,
          timestamp,
        });

        return {
          attempted: true,
          success: true,
          provider: data?.diagnostics?.provider,
          messageId: data?.diagnostics?.message_id,
          timestamp,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[INVITE_EMAIL] Exception", { error: msg, timestamp });
        return { attempted: true, success: false, error: msg, timestamp };
      }
    },
    []
  );

  return { sendInviteEmail };
}
