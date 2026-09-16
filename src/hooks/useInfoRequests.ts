import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export type InfoSection = "personal" | "emergency" | "bank" | "rtw";

export interface EmployeeInfoRequest {
  id: string;
  employee_id: string;
  requested_fields: string[];
  recipient_email: string | null;
  requested_by_name: string | null;
  status: string;
  sent_at: string;
  opened_at: string | null;
  submitted_at: string | null;
  token_expires_at: string;
  rtw_uploaded_count: number;
}

export function useInfoRequests(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["employee_info_requests", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [] as EmployeeInfoRequest[];
      let q = supabase
        .from("employee_info_requests")
        .select("id, employee_id, requested_fields, recipient_email, requested_by_name, status, sent_at, opened_at, submitted_at, token_expires_at, rtw_uploaded_count")
        .eq("tenant_id", tenantId)
        .order("sent_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmployeeInfoRequest[];
    },
    enabled: !!tenantId,
  });
}

export function useSendInfoRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: {
      employeeIds: string[];
      sections: InfoSection[];
      recipientOverride?: string | null;
      testSend?: boolean;
      expiryDays?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-info-request", {
        body: { tenant_id: tenantId, ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { sent: number; results: { employee_id: string; sent: boolean; error?: string }[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employee_info_requests"] });
      const failed = data.results.filter((r) => !r.sent);
      if (data.sent > 0) toast.success(`Request sent to ${data.sent} staff member${data.sent > 1 ? "s" : ""}`);
      if (failed.length > 0) toast.error(`${failed.length} could not be sent: ${failed[0].error ?? "unknown reason"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
