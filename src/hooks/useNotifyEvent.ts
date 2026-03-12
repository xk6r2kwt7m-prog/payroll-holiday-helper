import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";

/**
 * Helper hook to create in-app notification records for operational events.
 * All notifications are tenant-scoped and user-targeted.
 */
export function useNotifyEvent() {
  const { tenantId } = useTenant();
  const { user } = useAuth();

  const notify = useCallback(
    async (payload: {
      userId: string;
      eventType: string;
      title: string;
      body?: string;
      link?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!tenantId) return;
      try {
        await supabase.from("notifications" as any).insert({
          tenant_id: tenantId,
          user_id: payload.userId,
          event_type: payload.eventType,
          title: payload.title,
          body: payload.body || null,
          link: payload.link || null,
          metadata: payload.metadata || {},
        } as any);
      } catch (err) {
        console.error("Failed to create notification:", err);
      }
    },
    [tenantId]
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

  return { notify, notifyMany, notifyAdmins };
}
