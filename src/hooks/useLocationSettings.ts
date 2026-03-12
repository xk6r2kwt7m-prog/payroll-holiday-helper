import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface LocationSettings {
  id: string;
  branch: string;
  display_name: string;
  address: string | null;
  timezone: string;
  operating_hours: Record<string, { open: string; close: string }>;
  allow_open_shifts: boolean;
  allow_shift_swaps: boolean;
  allow_shift_offers: boolean;
  scheduling_suggestion_order: string;
  allow_web_clock_in: boolean;
  allow_mobile_clock_in: boolean;
  require_gps_on_clock_in: boolean;
  require_geofence: boolean;
  geofence_radius_meters: number;
  auto_approve_timesheets: boolean;
  minimum_shift_length_minutes: number;
  default_break_minutes: number;
  enforce_break_after_hours: number;
  created_at: string;
  updated_at: string;
}

export function useLocationSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["location_settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("location_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_name");
      if (error) throw error;
      return data as unknown as LocationSettings[];
    },
    enabled: !!tenantId,
  });
}

export function useUpdateLocationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocationSettings> & { id: string }) => {
      const { error } = await supabase
        .from("location_settings")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_settings"] });
      queryClient.invalidateQueries({ queryKey: ["tenant_branches"] });
      toast.success("Location settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });
}
