import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";

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
        .single();
      
      if (error) throw error;
      return data as Employee;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: EmployeeInsert) => {
      const { data, error } = await supabase
        .from("employees")
        .insert(employee)
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

/**
 * Tables that reference employees via FK — any row here blocks hard delete.
 * Checked in order of operational importance.
 */
const EMPLOYEE_DEPENDENCY_TABLES = [
  { table: "time_entries", label: "timesheets" },
  { table: "payroll_entries", label: "payroll records" },
  { table: "shifts", label: "shifts" },
  { table: "holiday_requests", label: "holiday requests" },
  { table: "holiday_balances", label: "holiday balances" },
  { table: "holiday_adjustments", label: "holiday adjustments" },
  { table: "absence_records", label: "absence records" },
  { table: "employee_documents", label: "documents" },
  { table: "contract_signatures", label: "contract signatures" },
  { table: "disciplinary_records", label: "disciplinary records" },
  { table: "admin_notes", label: "admin notes" },
  { table: "employee_changes", label: "change history" },
  { table: "employee_onboarding_data", label: "onboarding data" },
  { table: "employee_skills", label: "skills" },
  { table: "employee_availability", label: "availability" },
  { table: "employee_branches", label: "branch assignments" },
  { table: "training_assignments", label: "training assignments" },
  { table: "training_records", label: "training records" },
  { table: "evidence_files", label: "evidence files" },
  { table: "evidence_requests", label: "evidence requests" },
  { table: "document_requests", label: "document requests" },
  { table: "announcement_read_receipts", label: "announcement receipts" },
  { table: "talent_profiles", label: "talent profiles" },
] as const;

export interface EmployeeDependencyResult {
  canDelete: boolean;
  linkedRecords: { table: string; label: string; count: number }[];
  summary: string;
}

/**
 * Check whether an employee has any linked records that prevent hard deletion.
 */
export function useEmployeeDependencies(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["employee-dependencies", employeeId],
    queryFn: async (): Promise<EmployeeDependencyResult> => {
      if (!employeeId) return { canDelete: true, linkedRecords: [], summary: "" };

      const linkedRecords: { table: string; label: string; count: number }[] = [];

      // Check all dependency tables in parallel
      const checks = await Promise.all(
        EMPLOYEE_DEPENDENCY_TABLES.map(async ({ table, label }) => {
          try {
            const { count, error } = await supabase
              .from(table as any)
              .select("id", { count: "exact", head: true })
              .eq("employee_id", employeeId);
            
            if (error) return null;
            if (count && count > 0) {
              return { table, label, count };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      for (const result of checks) {
        if (result) linkedRecords.push(result);
      }

      const canDelete = linkedRecords.length === 0;
      const summary = canDelete
        ? ""
        : `This employee has ${linkedRecords.map(r => `${r.count} ${r.label}`).join(", ")}. Use Archive or Mark as Leaver instead.`;

      return { canDelete, linkedRecords, summary };
    },
    enabled: !!employeeId,
    staleTime: 30_000,
  });
}

/**
 * Archive an employee (safe lifecycle action).
 * Sets status to 'leaver' and archived_at timestamp.
 */
export function useArchiveEmployee() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_employees", tenantId!);
      const { error } = await supabase
        .from("employees")
        .update({
          status: "leaver" as any,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

/**
 * Hard delete — only for employees with ZERO linked records.
 * The caller MUST check useEmployeeDependencies first.
 * If FK constraints block the delete, a human-readable error is thrown.
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_employees", tenantId!);
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);
      
      if (error) {
        // Translate FK constraint errors into human-readable messages
        if (
          error.message?.includes("violates foreign key constraint") ||
          error.code === "23503"
        ) {
          throw new Error(
            "Cannot delete this employee because they have linked operational records (timesheets, payroll, shifts, etc.). Use Archive instead."
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
