import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * Branch type is now a plain string (was previously a DB enum).
 * Each tenant defines their own branches via location_settings.
 */
export type BranchType = string;

/**
 * Dynamic color palette for branches — assigns colors by index.
 */
const BRANCH_COLOR_PALETTE = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];

const BRANCH_EMOJI_PALETTE = ["🏛️", "🎭", "🌆", "📍", "🏢", "🏪", "🏬", "🗺️"];

export function getBranchColor(branch: string, allBranches: string[]): string {
  const idx = allBranches.indexOf(branch);
  return BRANCH_COLOR_PALETTE[idx >= 0 ? idx % BRANCH_COLOR_PALETTE.length : 0];
}

export function getBranchEmoji(branch: string, allBranches: string[]): string {
  const idx = allBranches.indexOf(branch);
  return BRANCH_EMOJI_PALETTE[idx >= 0 ? idx % BRANCH_EMOJI_PALETTE.length : 0];
}

/**
 * Fetch the current tenant's branches from location_settings.
 * Returns an array of branch name strings.
 */
export function useTenantBranches() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant_branches", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("location_settings")
        .select("branch, display_name")
        .eq("tenant_id", tenantId)
        .order("display_name");
      if (error) throw error;
      return (data || []).map((d: any) => d.branch as string);
    },
    enabled: !!tenantId,
  });
}

interface EmployeeBranch {
  id: string;
  employee_id: string;
  branch: string;
  is_primary: boolean;
  created_at: string;
}

export function useEmployeeBranches(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_branches", employeeId],
    queryFn: async () => {
      if (!employeeId) return [] as EmployeeBranch[];
      
      const { data, error } = await supabase
        .from("employee_branches")
        .select("*")
        .eq("employee_id", employeeId)
        .order("is_primary", { ascending: false });
      
      if (error) throw error;
      return data as EmployeeBranch[];
    },
    enabled: !!employeeId,
  });
}

export function useAllEmployeeBranches() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["employee_branches", "all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as EmployeeBranch[];
      const { data, error } = await supabase
        .from("employee_branches")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_primary", { ascending: false });
      
      if (error) throw error;
      return data as EmployeeBranch[];
    },
    enabled: !!tenantId,
  });
}

export function useSetEmployeeBranches() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      branches, 
      primaryBranch 
    }: { 
      employeeId: string; 
      branches: string[]; 
      primaryBranch?: string;
    }) => {
      // Delete existing branches
      await supabase
        .from("employee_branches")
        .delete()
        .eq("employee_id", employeeId);
      
      if (branches.length === 0) return;
      
      // Insert new branches
      const inserts = branches.map(branch => ({
        employee_id: employeeId,
        branch,
        is_primary: branch === (primaryBranch || branches[0]),
        tenant_id: tenantId!,
      }));
      
      const { error } = await supabase
        .from("employee_branches")
        .insert(inserts as any);
      
      if (error) throw error;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee_branches"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
