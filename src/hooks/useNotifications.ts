import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPayload {
  to: string;
  subject: string;
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update";
  data: Record<string, string>;
}

export function useNotifications() {
  const sendNotification = async (payload: NotificationPayload) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: payload,
      });

      if (error) {
        console.error("Notification error:", error);
        toast.error("Failed to send notification email");
        return false;
      }

      toast.success("Notification email sent");
      return true;
    } catch (err) {
      console.error("Notification error:", err);
      toast.error("Failed to send notification email");
      return false;
    }
  };

  return { sendNotification };
}
