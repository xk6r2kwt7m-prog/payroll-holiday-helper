import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OnboardingData {
  id: string;
  employee_id: string;
  tenant_id: string;
  personal_info: Record<string, any>;
  bank_details: Record<string, any>;
  emergency_contact: Record<string, any>;
  onboarding_completed_at: string | null;
  submitted_at: string | null;
  step_completed: number;
  created_at: string;
  updated_at: string;
}

export function useMyOnboardingData(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_onboarding_data", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding_data" as any)
        .select("*")
        .eq("employee_id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OnboardingData | null;
    },
    enabled: !!employeeId,
  });
}

export function useUpdateOnboardingData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      updates,
    }: {
      employeeId: string;
      updates: Partial<{
        personal_info: Record<string, any>;
        bank_details: Record<string, any>;
        emergency_contact: Record<string, any>;
        step_completed: number;
        submitted_at: string;
        onboarding_completed_at: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("employee_onboarding_data" as any)
        .update(updates as any)
        .eq("employee_id", employeeId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data", employeeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useInitOnboardingData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, tenantId }: { employeeId: string; tenantId: string }) => {
      // Check if already exists
      const { data: existing } = await supabase
        .from("employee_onboarding_data" as any)
        .select("id")
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (existing) return existing;

      const { data, error } = await supabase
        .from("employee_onboarding_data" as any)
        .insert({ employee_id: employeeId, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data", employeeId] });
    },
  });
}

export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, personalInfo, bankDetails, emergencyContact }: {
      employeeId: string;
      personalInfo: Record<string, any>;
      bankDetails: Record<string, any>;
      emergencyContact: Record<string, any>;
    }) => {
      // Update onboarding data as submitted
      await supabase
        .from("employee_onboarding_data" as any)
        .update({
          personal_info: personalInfo,
          bank_details: bankDetails,
          emergency_contact: emergencyContact,
          submitted_at: new Date().toISOString(),
          onboarding_completed_at: new Date().toISOString(),
          step_completed: 6,
        } as any)
        .eq("employee_id", employeeId);

      // Update employee record with personal info
      const updates: Record<string, any> = {
        status: "starter",
        nationality: personalInfo.nationality || null,
        ni_number: personalInfo.ni_number || null,
        passport_no: personalInfo.passport_no || null,
        settlement_status: personalInfo.settlement_status || null,
        sharing_code: personalInfo.sharing_code || null,
        residence_permit: personalInfo.residence_permit || null,
        bank_account_no: bankDetails.account_number || null,
        sort_code: bankDetails.sort_code || null,
      };

      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Onboarding completed successfully!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
