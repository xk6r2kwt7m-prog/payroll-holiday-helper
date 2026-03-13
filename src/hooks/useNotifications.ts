import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPayload {
  to: string;
  subject: string;
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update" | "test";
  data: Record<string, string>;
}

interface EmailDiagnostics {
  timestamp: string;
  resend_api_key_configured: boolean;
  resend_api_key_prefix: string;
  recipient?: string;
  subject?: string;
  type?: string;
  from?: string;
  success?: boolean;
  error?: string;
  provider_error?: any;
  hint?: string;
  resend_response?: any;
}

export function useNotifications() {
  const sendNotification = async (payload: NotificationPayload): Promise<boolean> => {
    console.log("[EMAIL_CLIENT] Invoking send-notification:", {
      to: payload.to,
      subject: payload.subject,
      type: payload.type,
      timestamp: new Date().toISOString(),
    });

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: payload,
      });

      if (error) {
        console.error("[EMAIL_CLIENT] Function invocation error:", error);
        toast.error("Failed to send notification email");
        return false;
      }

      const diagnostics = data?.diagnostics as EmailDiagnostics | undefined;

      if (data?.error) {
        console.error("[EMAIL_CLIENT] Provider error:", data.error, diagnostics);
        if (diagnostics?.hint) {
          console.warn("[EMAIL_CLIENT] Hint:", diagnostics.hint);
        }
        toast.error(`Email failed: ${data.error}`);
        return false;
      }

      console.log("[EMAIL_CLIENT] Send successful:", diagnostics);
      toast.success("Notification email sent");
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
  const sendTestEmail = async (recipientEmail: string): Promise<{ success: boolean; diagnostics?: EmailDiagnostics; error?: string }> => {
    console.log("[EMAIL_CLIENT] Sending test email to:", recipientEmail);

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: recipientEmail,
          subject: "UGLO HR – Email Delivery Test",
          type: "test",
          data: {},
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, diagnostics: data.diagnostics, error: data.error };
      }

      return { success: true, diagnostics: data?.diagnostics };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { sendNotification, sendTestEmail };
}
