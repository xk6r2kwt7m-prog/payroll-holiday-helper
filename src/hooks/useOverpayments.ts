import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PayrollOverpayment {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  overlap_start_date: string;
  overlap_end_date: string;
  estimated_overlap_hours: number;
  hourly_rate: number;
  service_charge: number;
  estimated_overpayment: number;
  recovery_status: string;
  recovery_method: string | null;
  recovered_amount: number;
  recovered_in_period_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    forename: string;
    surname: string;
    department: string;
    status: string;
  };
  payroll_periods?: {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
  };
}

export const useOverpayments = () => {
  return useQuery({
    queryKey: ["payroll-overpayments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_overpayments" as any)
        .select(`
          *,
          employees(id, forename, surname, department, status),
          payroll_periods(id, period_name, start_date, end_date)
        `)
        .order("estimated_overpayment", { ascending: false });

      if (error) throw error;
      return data as unknown as PayrollOverpayment[];
    },
  });
};

export const useUpdateOverpaymentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      recovery_status,
      recovery_method,
      recovered_amount,
      recovered_in_period_id,
      notes,
    }: {
      id: string;
      recovery_status: string;
      recovery_method?: string;
      recovered_amount?: number;
      recovered_in_period_id?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, any> = { recovery_status };
      if (recovery_method !== undefined) updateData.recovery_method = recovery_method;
      if (recovered_amount !== undefined) updateData.recovered_amount = recovered_amount;
      if (recovered_in_period_id !== undefined) updateData.recovered_in_period_id = recovered_in_period_id;
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase
        .from("payroll_overpayments" as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-overpayments"] });
    },
  });
};
