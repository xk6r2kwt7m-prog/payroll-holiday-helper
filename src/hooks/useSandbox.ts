import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SandboxConfig {
  tenantName: string;
  country: string;
  timezone: string;
  workStyle: string;
  teamSize: "small" | "medium" | "large";
  locationCount: number;
  modulesEnabled: Record<string, boolean>;
  payrollFrequency: string;
  serviceChargeEnabled: boolean;
  setupState: "new_signup" | "half_configured" | "fully_configured";
  preset: string;
}

const DEFAULT_CONFIG: SandboxConfig = {
  tenantName: "Sandbox Restaurant",
  country: "GB",
  timezone: "Europe/London",
  workStyle: "restaurant",
  teamSize: "small",
  locationCount: 1,
  modulesEnabled: { scheduling: true, payroll: true, training: true, documents: true, analytics: true },
  payrollFrequency: "monthly",
  serviceChargeEnabled: false,
  setupState: "fully_configured",
  preset: "small_restaurant",
};

const SAMPLE_EMPLOYEES: Record<string, Array<{ forename: string; surname: string; department: string; hourly_rate: number; role_label: string }>> = {
  small_restaurant: [
    { forename: "Alex", surname: "Chen", department: "kitchen", hourly_rate: 14.50, role_label: "Head Chef" },
    { forename: "Maria", surname: "Santos", department: "front_of_house", hourly_rate: 12.00, role_label: "Server" },
    { forename: "James", surname: "Wilson", department: "front_of_house", hourly_rate: 13.00, role_label: "Bartender" },
    { forename: "Priya", surname: "Patel", department: "kitchen", hourly_rate: 11.50, role_label: "Commis Chef" },
    { forename: "Tom", surname: "Baker", department: "management", hourly_rate: 16.00, role_label: "Manager" },
  ],
  multi_branch: [
    { forename: "Alex", surname: "Chen", department: "kitchen", hourly_rate: 14.50, role_label: "Head Chef" },
    { forename: "Maria", surname: "Santos", department: "front_of_house", hourly_rate: 12.00, role_label: "Server" },
    { forename: "James", surname: "Wilson", department: "front_of_house", hourly_rate: 13.00, role_label: "Bartender" },
    { forename: "Priya", surname: "Patel", department: "kitchen", hourly_rate: 11.50, role_label: "Commis Chef" },
    { forename: "Tom", surname: "Baker", department: "management", hourly_rate: 16.00, role_label: "Manager" },
    { forename: "Sophie", surname: "Lee", department: "front_of_house", hourly_rate: 12.50, role_label: "Senior Server" },
    { forename: "Omar", surname: "Hassan", department: "kitchen", hourly_rate: 13.50, role_label: "Sous Chef" },
    { forename: "Emma", surname: "Davis", department: "management", hourly_rate: 15.00, role_label: "Supervisor" },
  ],
  empty: [],
};

const BRANCHES_BY_SIZE: Record<number, string[]> = {
  1: ["Main"],
  2: ["Fitzrovia", "Carnaby"],
  3: ["Fitzrovia", "Carnaby", "Brixton"],
};

export function useSandboxTenants() {
  return useQuery({
    queryKey: ["sandbox-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sandbox_tenants")
        .select("*, tenants(id, name, country, status, service_charge_enabled, enabled_modules)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateSandbox() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<SandboxConfig>) => {
      const cfg = { ...DEFAULT_CONFIG, ...config };
      if (!user) throw new Error("Not authenticated");

      // 1. Create the tenant
      const slug = `sandbox-${Date.now()}`;
      const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .insert({
          name: `🧪 ${cfg.tenantName}`,
          slug,
          country: cfg.country,
          timezone: cfg.timezone,
          status: "active" as any,
          service_charge_enabled: cfg.serviceChargeEnabled,
          enabled_modules: cfg.modulesEnabled,
          payroll_frequency: cfg.payrollFrequency,
          settings: { sandbox: true, work_style: cfg.workStyle },
        })
        .select("id, name")
        .single();
      if (tenantErr) throw tenantErr;

      // 2. Add platform admin as company_admin member
      await supabase.from("tenant_members").insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "company_admin" as any,
        is_active: true,
      });

      // 3. Create branches
      const branches = BRANCHES_BY_SIZE[Math.min(cfg.locationCount, 3)] || ["Main"];
      for (const branch of branches) {
        await supabase.from("branch_locations").insert({
          tenant_id: tenant.id,
          branch,
          display_name: branch,
          latitude: 51.5074,
          longitude: -0.1278,
        });
      }

      // 4. Create sample employees if preset has data
      const employees = SAMPLE_EMPLOYEES[cfg.preset] || SAMPLE_EMPLOYEES.small_restaurant;
      const testUsers: Array<{ label: string; role: string; employee_id?: string }> = [
        { label: "Company Admin", role: "admin" },
        { label: "Manager", role: "manager" },
        { label: "Supervisor", role: "supervisor" },
      ];

      if (cfg.setupState !== "new_signup" && employees.length > 0) {
        for (const emp of employees) {
          const branch = branches[Math.floor(Math.random() * branches.length)];
          const { data: empData } = await supabase.from("employees").insert({
            tenant_id: tenant.id,
            forename: emp.forename,
            surname: emp.surname,
            department: emp.department as any,
            hourly_rate: emp.hourly_rate,
            status: "active" as any,
            service_charge_eligible: cfg.serviceChargeEnabled,
          }).select("id").single();

          if (empData) {
            await supabase.from("employee_branches").insert({
              tenant_id: tenant.id,
              employee_id: empData.id,
              branch,
              is_primary: true,
            });
          }
        }

        // Add staff test user entries
        testUsers.push(
          { label: `Staff – ${employees[0]?.role_label || "Kitchen"}`, role: "staff" },
          { label: `Staff – ${employees[1]?.role_label || "FOH"}`, role: "staff" },
        );
      } else {
        testUsers.push({ label: "Staff 1", role: "staff" }, { label: "Staff 2", role: "staff" });
      }

      // 5. Create company settings if not new_signup
      if (cfg.setupState !== "new_signup") {
        await supabase.from("company_settings").insert({
          tenant_id: tenant.id,
          company_name: cfg.tenantName,
          pay_period: cfg.payrollFrequency === "monthly" ? "Monthly" : "4-Weekly",
        });
      }

      // 6. Register as sandbox
      const { error: sandboxErr } = await supabase.from("sandbox_tenants").insert({
        tenant_id: tenant.id,
        created_by: user.id,
        preset_name: cfg.preset,
        setup_state: cfg.setupState,
        test_users: testUsers,
      });
      if (sandboxErr) throw sandboxErr;

      return { tenantId: tenant.id, tenantName: tenant.name, testUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox-tenants"] });
      toast.success("Sandbox tenant created");
    },
    onError: (err: any) => {
      toast.error(`Failed to create sandbox: ${err.message}`);
    },
  });
}

export function useDeleteSandbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      // Delete in order: sandbox record, then tenant (cascades)
      await supabase.from("sandbox_tenants").delete().eq("tenant_id", tenantId);
      // Delete tenant members, employees, etc. via cascade
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox-tenants"] });
      toast.success("Sandbox deleted");
    },
    onError: (err: any) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });
}

export function useResetSandbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      // Delete all employees, shifts, payroll data for this tenant
      await Promise.all([
        supabase.from("shifts").delete().eq("tenant_id", tenantId),
        supabase.from("holiday_requests").delete().eq("tenant_id", tenantId),
        supabase.from("absence_records").delete().eq("tenant_id", tenantId),
        supabase.from("time_entries").delete().eq("tenant_id", tenantId),
      ]);
      // Reset employees
      await supabase.from("employees").delete().eq("tenant_id", tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox-tenants"] });
      toast.success("Sandbox data reset");
    },
  });
}
