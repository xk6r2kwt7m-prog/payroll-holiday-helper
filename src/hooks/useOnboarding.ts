import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OnboardingTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface OnboardingProgress {
  id: string;
  employee_id: string;
  template_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  onboarding_templates?: OnboardingTemplate;
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: ["onboarding_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as OnboardingTemplate[];
    },
  });
}

export function useOnboardingProgress(employeeId: string) {
  return useQuery({
    queryKey: ["onboarding_progress", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_progress" as any)
        .select("*, onboarding_templates(*)")
        .eq("employee_id", employeeId);
      if (error) throw error;
      return (data || []) as unknown as OnboardingProgress[];
    },
  });
}

export function useInitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      // Get active templates
      const { data: templates, error: tErr } = await supabase
        .from("onboarding_templates" as any)
        .select("id")
        .eq("is_active", true);
      if (tErr) throw tErr;
      if (!templates || templates.length === 0) return;

      // Check if already initialised
      const { data: existing } = await supabase
        .from("onboarding_progress" as any)
        .select("id")
        .eq("employee_id", employeeId)
        .limit(1);
      if (existing && existing.length > 0) return; // already done

      const rows = (templates as any[]).map((t: any) => ({
        employee_id: employeeId,
        template_id: t.id,
      }));
      const { error } = await supabase.from("onboarding_progress" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding_progress"] });
      toast.success("Onboarding checklist created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("onboarding_progress" as any)
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding_progress"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
