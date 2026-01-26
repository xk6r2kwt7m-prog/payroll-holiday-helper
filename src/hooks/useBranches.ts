import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BranchType = Database["public"]["Enums"]["branch_type"];

export const BRANCHES: BranchType[] = ["Fitzrovia", "Carnaby", "Brixton"];

export const BRANCH_COLORS: Record<BranchType, string> = {
  Fitzrovia: "bg-violet-100 text-violet-700 border-violet-200",
  Carnaby: "bg-rose-100 text-rose-700 border-rose-200",
  Brixton: "bg-amber-100 text-amber-700 border-amber-200",
};

export const BRANCH_EMOJI: Record<BranchType, string> = {
  Fitzrovia: "🏛️",
  Carnaby: "🎭",
  Brixton: "🌆",
};

interface EmployeeBranch {
  id: string;
  employee_id: string;
  branch: BranchType;
  is_primary: boolean;
  created_at: string;
}

export function useEmployeeBranches(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_branches", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("employee_branches")
        .select("*")
        .order("is_primary", { ascending: false });
      
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeBranch[];
    },
  });
}

export function useAllEmployeeBranches() {
  return useQuery({
    queryKey: ["employee_branches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_branches")
        .select("*")
        .order("is_primary", { ascending: false });
      
      if (error) throw error;
      return data as EmployeeBranch[];
    },
  });
}

export function useSetEmployeeBranches() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      branches, 
      primaryBranch 
    }: { 
      employeeId: string; 
      branches: BranchType[]; 
      primaryBranch?: BranchType;
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
      }));
      
      const { error } = await supabase
        .from("employee_branches")
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ["employee_branches"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
