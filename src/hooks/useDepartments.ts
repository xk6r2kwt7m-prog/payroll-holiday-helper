import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface Department {
  id: string;
  tenant_id: string;
  key: string;
  label: string;
  emoji: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

export function useDepartments(includeInactive = false) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["departments", tenantId, { includeInactive }],
    queryFn: async () => {
      if (!tenantId) return [] as Department[];

      let query = supabase
        .from("departments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort_order");

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If no departments exist yet, seed defaults
      if (data.length === 0) {
        const { error: rpcError } = await supabase.rpc("seed_default_departments", {
          _tenant_id: tenantId,
        });
        if (!rpcError) {
          const { data: seeded } = await supabase
            .from("departments")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("sort_order");
          return (seeded || []) as Department[];
        }
      }

      return data as Department[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (dept: { key: string; label: string; emoji: string; description: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .insert({ ...dept, tenant_id: tenantId!, is_system: false, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Department> }) => {
      const { data, error } = await supabase
        .from("departments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}
