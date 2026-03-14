import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  tenant_id: string;
  skill_type: "role" | "skill" | "language";
  skill_value: string;
  proficiency_level: number;
}

export function useEmployeeSkills(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_skills", employeeId],
    queryFn: async () => {
      if (!employeeId) return [] as EmployeeSkill[];
      const { data, error } = await supabase
        .from("employee_skills" as any)
        .select("*")
        .eq("employee_id", employeeId)
        .order("skill_type");
      if (error) throw error;
      return (data || []) as unknown as EmployeeSkill[];
    },
    enabled: !!employeeId,
  });
}

export function useAllEmployeeSkills() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["employee_skills", "all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as EmployeeSkill[];
      const { data, error } = await supabase
        .from("employee_skills" as any)
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as unknown as EmployeeSkill[];
    },
    enabled: !!tenantId,
  });
}

export function useAddSkill() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      skillType,
      skillValue,
      proficiencyLevel,
    }: {
      employeeId: string;
      skillType: string;
      skillValue: string;
      proficiencyLevel?: number;
    }) => {
      const { error } = await supabase.from("employee_skills" as any).insert({
        employee_id: employeeId,
        tenant_id: tenantId!,
        skill_type: skillType,
        skill_value: skillValue,
        proficiency_level: proficiencyLevel || 3,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_skills"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_skills" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_skills"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
