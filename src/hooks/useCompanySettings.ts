import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";

export interface CompanySettings {
  id: string;
  company_name: string;
  company_email: string | null;
  company_logo_url: string | null;
  address: string | null;
  pay_period: string | null;
  default_pay_day: string | null;
  auto_calculate_overtime: boolean | null;
  email_notifications: boolean | null;
  holiday_request_alerts: boolean | null;
  payroll_reminders: boolean | null;
  two_factor_auth: boolean | null;
  session_timeout: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      // First check if settings exist
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("company_settings")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("company_settings")
          .insert({ ...updates, tenant_id: tenantId! } as any)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
