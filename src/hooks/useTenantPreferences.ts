import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

export type PreferenceCategory =
  | "scheduling"
  | "payroll_display"
  | "holiday_display"
  | "training_docs"
  | "people_lifecycle"
  | "branding";

/** Load preferences for a category */
export function useTenantPreferences<T extends Record<string, any>>(
  category: PreferenceCategory,
  defaults: T
) {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["tenant_preferences", tenantId, category],
    queryFn: async (): Promise<T> => {
      if (!tenantId) return defaults;

      const { data, error } = await supabase
        .from("tenant_preferences")
        .select("preferences")
        .eq("tenant_id", tenantId)
        .eq("category", category)
        .maybeSingle();

      if (error) throw error;
      if (!data) return defaults;

      return { ...defaults, ...(data.preferences as T) };
    },
    enabled: !!tenantId,
  });

  return query;
}

/** Save preferences for a category */
export function useSaveTenantPreferences() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ category, preferences }: { category: PreferenceCategory; preferences: Record<string, any> }) => {
      if (!tenantId || !user) throw new Error("No tenant or user");

      const { error } = await supabase
        .from("tenant_preferences")
        .upsert(
          {
            tenant_id: tenantId,
            category,
            preferences,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,category" }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["tenant_preferences", tenantId, variables.category] });
    },
  });
}
