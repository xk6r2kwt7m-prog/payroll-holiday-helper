import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";

export type RtwStatus = "not_submitted" | "submitted" | "pending_review" | "approved" | "rejected";

export interface OnboardingData {
  id: string;
  employee_id: string;
  tenant_id: string;
  personal_info: Record<string, any>;
  bank_details: Record<string, any>;
  emergency_contact: Record<string, any>;
  onboarding_completed_at: string | null;
  onboarding_approved_at: string | null;
  onboarding_approved_by: string | null;
  submitted_at: string | null;
  step_completed: number;
  rtw_status: RtwStatus;
  rtw_reviewed_at: string | null;
  rtw_reviewed_by: string | null;
  rtw_review_notes: string | null;
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
        rtw_status: RtwStatus;
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

/**
 * Employee submits onboarding — does NOT mark as complete.
 * Sets submitted_at and status to "starter" (pending manager review).
 * RTW documents go to "pending_review" if they were uploaded.
 */
export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, personalInfo, bankDetails, emergencyContact, hasRtwDocs }: {
      employeeId: string;
      personalInfo: Record<string, any>;
      bankDetails: Record<string, any>;
      emergencyContact: Record<string, any>;
      hasRtwDocs?: boolean;
    }) => {
      // Update onboarding data — submitted but NOT completed
      await supabase
        .from("employee_onboarding_data" as any)
        .update({
          personal_info: personalInfo,
          bank_details: bankDetails,
          emergency_contact: emergencyContact,
          submitted_at: new Date().toISOString(),
          step_completed: 6,
          // If RTW docs were uploaded, move to pending_review
          ...(hasRtwDocs ? { rtw_status: "pending_review" } : { rtw_status: "not_submitted" }),
        } as any)
        .eq("employee_id", employeeId);

      // Update employee record with submitted info — status to starter (awaiting review)
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

      // Notify managers
      const { data: emp } = await supabase
        .from("employees")
        .select("tenant_id, forename, surname")
        .eq("id", employeeId)
        .maybeSingle();

      if (emp?.tenant_id) {
        const { data: admins } = await supabase
          .from("tenant_members" as any)
          .select("user_id")
          .eq("tenant_id", emp.tenant_id)
          .in("role", ["company_admin", "manager"])
          .eq("is_active", true);

        if (admins && admins.length > 0) {
          const rows = (admins as any[])
            .map((a) => a.user_id)
            .filter(Boolean)
            .map((uid: string) => ({
              tenant_id: emp.tenant_id,
              user_id: uid,
              event_type: "onboarding_completed",
              title: "Onboarding submitted — review needed",
              body: `${emp.forename} ${emp.surname} has submitted their onboarding details${hasRtwDocs ? " including right to work documents" : ""}. Please review.`,
              link: "/onboarding",
              metadata: { employee_id: employeeId },
            }));
          await supabase.from("notifications" as any).insert(rows as any);
        }
      }
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Onboarding submitted for review");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/**
 * Manager reviews RTW status for an employee.
 */
export function useReviewRtw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, status, notes }: {
      employeeId: string;
      status: "approved" | "rejected";
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("employee_onboarding_data" as any)
        .update({
          rtw_status: status,
          rtw_reviewed_at: new Date().toISOString(),
          rtw_reviewed_by: userId,
          rtw_review_notes: notes || null,
        } as any)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: (_, { employeeId, status }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data"] });
      qc.invalidateQueries({ queryKey: ["onboarding-review-queue"] });
      toast.success(status === "approved" ? "Right to work approved" : "Right to work rejected — employee will be notified");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/**
 * Manager approves overall onboarding — marks it as complete.
 */
export function useApproveOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId }: { employeeId: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Mark onboarding as approved
      const { error: onbErr } = await supabase
        .from("employee_onboarding_data" as any)
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_approved_at: new Date().toISOString(),
          onboarding_approved_by: userId,
        } as any)
        .eq("employee_id", employeeId);
      if (onbErr) throw onbErr;

      // Set employee to active
      const { error: empErr } = await supabase
        .from("employees")
        .update({ status: "active" as any })
        .eq("id", employeeId);
      if (empErr) throw empErr;
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ["employee_onboarding_data"] });
      qc.invalidateQueries({ queryKey: ["onboarding-review-queue"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Onboarding approved — employee is now active");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/**
 * Fetch all onboarding records for the review queue (manager view).
 */
export function useOnboardingReviewQueue() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["onboarding-review-queue", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get all non-approved onboarding records
      const { data: onbRecords, error: onbErr } = await supabase
        .from("employee_onboarding_data" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .is("onboarding_approved_at", null);
      if (onbErr) throw onbErr;

      if (!onbRecords || onbRecords.length === 0) return [];

      const employeeIds = (onbRecords as any[]).map(r => r.employee_id);

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, forename, surname, department, email, status, start_date")
        .in("id", employeeIds);
      if (empErr) throw empErr;

      const empMap = new Map((employees || []).map(e => [e.id, e]));

      return (onbRecords as any[]).map(r => ({
        ...r,
        employee: empMap.get(r.employee_id) || null,
      })) as (OnboardingData & { employee: any })[];
    },
    enabled: !!tenantId,
  });
}
