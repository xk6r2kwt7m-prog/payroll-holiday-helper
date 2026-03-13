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
  provider?: string;
  recipient?: string;
  template?: string;
  status?: string;
  message_id?: string;
  error?: string;
  provider_response?: unknown;
}

export function useNotifications() {
  const sendNotification = async (payload: NotificationPayload): Promise<boolean> => {
    console.log("[EMAIL_CLIENT] Invoking send-notification:", {
      to: payload.to,
      subject: payload.subject,
      type: payload.type,
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
      toast.success("Notification email sent");
      return true;
    } catch (err) {
      console.error("[EMAIL_CLIENT] Exception:", err);
      toast.error("Failed to send notification email");
      return false;
    }
  };

  const sendTestEmail = async (
    recipientEmail: string
  ): Promise<{ success: boolean; diagnostics?: EmailDiagnostics; error?: string }> => {
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

      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, diagnostics: data.diagnostics, error: data.error };
      return { success: true, diagnostics: data?.diagnostics };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  return { sendNotification, sendTestEmail };
}
