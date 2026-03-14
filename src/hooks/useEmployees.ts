import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";

export type Employee = Tables<"employees">;
export type EmployeeInsert = TablesInsert<"employees">;
export type EmployeeUpdate = TablesUpdate<"employees">;

export function useEmployees(includeArchived = false) {
  const { tenantId } = useTenant();
  
  return useQuery({
    queryKey: ["employees", tenantId, { includeArchived }],
    queryFn: async () => {
      if (!tenantId) return [] as Employee[];
      
      // Auto-archive leavers older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("employees")
        .update({ archived_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("status", "leaver")
        .is("archived_at", null)
        .lte("updated_at", sevenDaysAgo);

      let query = supabase
        .from("employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("forename");

      if (!includeArchived) {
        query = query.is("archived_at", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!tenantId,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Employee | null;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (employee: Omit<EmployeeInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...employee, tenant_id: tenantId! })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EmployeeUpdate }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Defensive: verify caller has edit rights
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const userRoles = roles?.map(r => r.role) || [];
      const canDelete = userRoles.some(r => r === "admin");
      if (!canDelete) throw new Error("Permission denied: only admin can delete employees");

      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
