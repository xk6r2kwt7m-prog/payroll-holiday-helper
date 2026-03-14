import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { assertPermission } from "@/lib/permission-guard";

export interface HolidayRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export function useMyHolidayRequests(employeeId: string | null) {
  return useQuery({
    queryKey: ["my_holiday_requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_requests" as any)
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as HolidayRequest[];
    },
    enabled: !!employeeId,
  });
}

export function useSubmitHolidayRequest() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      start_date: string;
      end_date: string;
      hours_requested: number;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("holiday_requests" as any)
        .insert({ tenant_id: tenantId, ...payload } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_holiday_requests"] });
    },
  });
}

export function useAllHolidayRequests() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["all_holiday_requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_requests" as any)
        .select("*, employees(forename, surname, department)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });
}

export function useReviewHolidayRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: "approved" | "rejected"; review_notes?: string }) => {
      if (!user) throw new Error("Not authenticated");
      await assertPermission("approve_holidays", tenantId!);

      const { error } = await supabase
        .from("holiday_requests" as any)
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_holiday_requests"] });
      qc.invalidateQueries({ queryKey: ["my_holiday_requests"] });
    },
  });
}
