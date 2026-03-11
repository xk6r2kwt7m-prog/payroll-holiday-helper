import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  business_type: string;
  icon: string;
  is_platform_template: boolean;
  template_data: {
    departments?: string[];
    roles?: string[];
    training_modules?: string[];
    shift_templates?: { name: string; start: string; end: string }[];
    compliance_items?: string[];
  };
}

export function useTenantTemplates() {
  return useQuery({
    queryKey: ["tenant-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data || []) as TenantTemplate[];
    },
  });
}
