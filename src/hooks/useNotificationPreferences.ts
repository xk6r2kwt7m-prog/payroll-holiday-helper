import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

export interface NotificationPreferences {
  schedule_updates: boolean;
  marketplace_activity: boolean;
  leave_updates: boolean;
  documents: boolean;
  training: boolean;
  announcements: boolean;
}

export type PreferenceCategory = keyof NotificationPreferences;

const DEFAULTS: NotificationPreferences = {
  schedule_updates: true,
  marketplace_activity: true,
  leave_updates: true,
  documents: true,
  training: true,
  announcements: true,
};

/**
 * Maps event_type strings to preference categories.
 * Events not listed here are considered mandatory (always delivered).
 */
const EVENT_TO_CATEGORY: Record<string, PreferenceCategory> = {
  shift_published: "schedule_updates",
  shift_changed: "schedule_updates",
  shift_cancelled: "schedule_updates",
  shift_offered: "marketplace_activity",
  shift_requested: "marketplace_activity",
  shift_claim_approved: "marketplace_activity",
  shift_claim_rejected: "marketplace_activity",
  shift_cover_found: "marketplace_activity",
  holiday_request: "leave_updates",
  holiday_submitted: "leave_updates",
  holiday_approved: "leave_updates",
  holiday_rejected: "leave_updates",
  document_uploaded: "documents",
  document_verified: "documents",
  document_rejected: "documents",
  document_expiry_warning: "documents",
  document_expired: "documents",
  training_assigned: "training",
  training_completed: "training",
  training_due_soon: "training",
  training_overdue: "training",
  announcement: "announcements",
};

/** Returns the preference category for an event type, or null if mandatory. */
export function getCategoryForEvent(eventType: string): PreferenceCategory | null {
  return EVENT_TO_CATEGORY[eventType] ?? null;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const queryKey = ["notification_preferences", user?.id, tenantId];

  const { data: preferences = DEFAULTS, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("schedule_updates, marketplace_activity, leave_updates, documents, training, announcements")
        .eq("user_id", user!.id)
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return data as unknown as NotificationPreferences;
    },
    enabled: !!user?.id && !!tenantId,
  });

  const updatePreference = useMutation({
    mutationFn: async ({ category, enabled }: { category: PreferenceCategory; enabled: boolean }) => {
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert(
          {
            user_id: user!.id,
            tenant_id: tenantId,
            ...DEFAULTS,
            ...preferences,
            [category]: enabled,
          } as any,
          { onConflict: "user_id,tenant_id" as any }
        );
      if (error) throw error;
    },
    onMutate: async ({ category, enabled }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old: any) => ({ ...DEFAULTS, ...old, [category]: enabled }));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(queryKey, context.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  return { preferences, isLoading, updatePreference, DEFAULTS };
}

/**
 * Check if a user has opted out of a notification category.
 * Used by the notify pipeline — returns true if notification should be sent.
 */
export async function shouldDeliverNotification(
  userId: string,
  tenantId: string,
  eventType: string
): Promise<boolean> {
  const category = getCategoryForEvent(eventType);
  // Mandatory / unmapped events always deliver
  if (!category) return true;

  const { data } = await supabase
    .from("notification_preferences" as any)
    .select(category)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // No preferences row = defaults (all enabled)
  if (!data) return true;
  return (data as any)[category] !== false;
}
