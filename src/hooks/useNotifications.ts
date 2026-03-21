import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EmailEventType =
  | "holiday_request"
  | "holiday_approved"
  | "holiday_rejected"
  | "payroll_reminder"
  | "payroll_approved"
  | "shift_update"
  | "schedule_published"
  | "schedule_published_setup_required"
  | "document_expiry"
  | "employee_invitation"
  | "test";

interface NotificationPayload {
  to: string;
  subject: string;
  type: EmailEventType;
  data: Record<string, string>;
  tenant_id?: string;
}

interface EmailDiagnostics {
  timestamp: string;
  provider?: string;
  recipient?: string;
  template?: string;
  tenant_id?: string;
  status?: string;
  message_id?: string;
  error?: string;
  provider_response?: unknown;
}

export function useNotifications() {
  /**
   * Send an email notification via the edge function.
   */
  const sendNotification = async (payload: NotificationPayload): Promise<boolean> => {
    console.log("[EMAIL_CLIENT] Invoking send-notification:", {
      to: payload.to,
      type: payload.type,
      tenant_id: payload.tenant_id,
    });

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: payload,
      });

      if (error) {
        console.error("[EMAIL_CLIENT] Invocation error:", error);
        toast.error("Failed to send notification email");
        return false;
      }

      if (data?.error) {
        console.error("[EMAIL_CLIENT] Provider error:", data.error, data.diagnostics);
        toast.error(`Email failed: ${data.error}`);
        return false;
      }

      console.log("[EMAIL_CLIENT] Sent via", data?.diagnostics?.provider, "→", data?.diagnostics?.status);
      return true;
    } catch (err) {
      console.error("[EMAIL_CLIENT] Exception:", err);
      toast.error("Failed to send notification email");
      return false;
    }
  };

  /**
   * Send a diagnostic test email to verify the email pipeline is working.
   */
  const sendTestEmail = async (
    recipientEmail: string
  ): Promise<{ success: boolean; diagnostics?: EmailDiagnostics; error?: string }> => {
    console.log("[EMAIL_CLIENT] Sending test email to:", recipientEmail);

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: recipientEmail,
          subject: "UglyOps HR Platform – Email Test",
          type: "test",
          data: {},
        },
      });

      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, diagnostics: data.diagnostics, error: data.error };
      return { success: true, diagnostics: data?.diagnostics };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  /**
   * Helper to send an email alongside an in-app notification.
   * Checks if email_notifications is enabled in company settings.
   * Skips silently (with a warning log) if no recipient email is provided.
   */
  const sendNotificationEmail = async ({
    recipient,
    eventType,
    subject,
    payload,
    tenantId,
  }: {
    recipient: string | null | undefined;
    eventType: EmailEventType;
    subject: string;
    payload: Record<string, string>;
    tenantId?: string;
  }): Promise<boolean> => {
    if (!recipient) {
      console.warn("[EMAIL_CLIENT] No recipient email, skipping email for event:", eventType);
      return false;
    }

    return sendNotification({
      to: recipient,
      subject,
      type: eventType,
      data: payload,
      tenant_id: tenantId,
    });
  };

  return { sendNotification, sendTestEmail, sendNotificationEmail };
}
