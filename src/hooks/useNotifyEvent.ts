import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { shouldDeliverNotification } from "@/hooks/useNotificationPreferences";

/**
 * Helper hook to create in-app notification records for operational events.
 * Optionally sends an email via Postmark when email_notifications is enabled.
 * All notifications are tenant-scoped and user-targeted.
 */
export function useNotifyEvent() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { sendNotificationEmail } = useNotifications();
  const { data: companySettings } = useCompanySettings();

  const emailEnabled = companySettings?.email_notifications ?? false;

  const notify = useCallback(
    async (payload: {
      userId: string;
      eventType: string;
      title: string;
      body?: string;
      link?: string;
      metadata?: Record<string, any>;
      /** Optional: send an email alongside the in-app notification */
      email?: {
        recipientEmail: string | null | undefined;
        subject: string;
        emailType: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "payroll_approved" | "shift_update" | "schedule_published" | "document_expiry" | "employee_invitation";
        emailData: Record<string, string>;
      };
    }) => {
      if (!tenantId) return;
      try {
        // In-app notification
        await supabase.from("notifications" as any).insert({
          tenant_id: tenantId,
          user_id: payload.userId,
          event_type: payload.eventType,
          title: payload.title,
          body: payload.body || null,
          link: payload.link || null,
          metadata: payload.metadata || {},
        } as any);

        // Email notification (if enabled and email data provided)
        if (emailEnabled && payload.email) {
          await sendNotificationEmail({
            recipient: payload.email.recipientEmail,
            eventType: payload.email.emailType,
            subject: payload.email.subject,
            payload: payload.email.emailData,
            tenantId,
          });
        }
      } catch (err) {
        console.error("Failed to create notification:", err);
      }
    },
    [tenantId, emailEnabled, sendNotificationEmail]
  );

  /**
   * Notify multiple users at once (e.g. all admins, all managers).
   */
  const notifyMany = useCallback(
    async (
      userIds: string[],
      eventType: string,
      title: string,
      body?: string,
      link?: string,
      metadata?: Record<string, any>
    ) => {
      if (!tenantId || userIds.length === 0) return;
      try {
        const rows = userIds.map((uid) => ({
          tenant_id: tenantId,
          user_id: uid,
          event_type: eventType,
          title,
          body: body || null,
          link: link || null,
          metadata: metadata || {},
        }));
        await supabase.from("notifications" as any).insert(rows as any);
      } catch (err) {
        console.error("Failed to create notifications:", err);
      }
    },
    [tenantId]
  );

  /**
   * Notify all tenant admins/managers (fetches user_ids from tenant_members).
   */
  const notifyAdmins = useCallback(
    async (
      eventType: string,
      title: string,
      body?: string,
      link?: string,
      metadata?: Record<string, any>
    ) => {
      if (!tenantId) return;
      try {
        const { data: members } = await supabase
          .from("tenant_members" as any)
          .select("user_id")
          .eq("tenant_id", tenantId)
          .in("role", ["company_admin", "manager"])
          .eq("is_active", true);
        if (!members || members.length === 0) return;
        const userIds = (members as any[]).map((m) => m.user_id).filter(Boolean);
        await notifyMany(userIds, eventType, title, body, link, metadata);
      } catch (err) {
        console.error("Failed to notify admins:", err);
      }
    },
    [tenantId, notifyMany]
  );

  return { notify, notifyMany, notifyAdmins, emailEnabled };
}
