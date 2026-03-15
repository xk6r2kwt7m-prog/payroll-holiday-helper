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
  seedTalentProfiles?: boolean;
  seedVacancies?: boolean;
  seedPayrollPeriods?: boolean;
  seedArchivedLeaver?: boolean;
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
  seedTalentProfiles: false,
  seedVacancies: false,
  seedPayrollPeriods: false,
  seedArchivedLeaver: false,
};

interface SampleEmployee {
  forename: string;
  surname: string;
  department: string;
  hourly_rate: number;
  role_label: string;
  hasTalentProfile?: boolean;
  isLeaver?: boolean;
}

const SAMPLE_EMPLOYEES: Record<string, SampleEmployee[]> = {
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

async function logSandboxAudit(
  tenantId: string,
  userId: string,
  event: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("audit_log").insert({
    action: "INSERT" as any,
    table_name: "sandbox_tenants",
    record_id: tenantId,
    tenant_id: tenantId,
    user_id: userId,
    new_data: { event, sandbox: true, ...metadata },
  });
}

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

      // 3. Seed default departments
      await supabase.rpc("seed_default_departments", { _tenant_id: tenant.id });

      // 4. Create branches
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

      // 5. Create sample employees if preset has data
      const employees = SAMPLE_EMPLOYEES[cfg.preset] || SAMPLE_EMPLOYEES.small_restaurant;
      const testUsers: Array<{ label: string; role: string; employee_id?: string }> = [
        { label: "Company Admin", role: "admin" },
        { label: "Manager", role: "manager" },
        { label: "Supervisor", role: "supervisor" },
      ];

      const createdEmployeeIds: string[] = [];

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
            createdEmployeeIds.push(empData.id);
            await supabase.from("employee_branches").insert({
              tenant_id: tenant.id,
              employee_id: empData.id,
              branch,
              is_primary: true,
            });
          }
        }

        testUsers.push(
          { label: `Staff – ${employees[0]?.role_label || "Kitchen"}`, role: "staff" },
          { label: `Staff – ${employees[1]?.role_label || "FOH"}`, role: "staff" },
        );

        // 5b. Seed archived leaver
        if (cfg.seedArchivedLeaver) {
          const { data: leaverData } = await supabase.from("employees").insert({
            tenant_id: tenant.id,
            forename: "Dana",
            surname: "Fletcher",
            department: "front_of_house" as any,
            hourly_rate: 11.00,
            status: "archived" as any,
            archived_at: new Date(Date.now() - 30 * 86400000).toISOString(),
            end_date: new Date(Date.now() - 37 * 86400000).toISOString().split("T")[0],
          }).select("id").single();
          if (leaverData) createdEmployeeIds.push(leaverData.id);
        }

        // 5c. Seed talent profiles
        if (cfg.seedTalentProfiles && createdEmployeeIds.length >= 2) {
          await supabase.from("talent_profiles").insert([{
            employee_id: createdEmployeeIds[0],
            talent_pool_status: "open_to_work" as any,
            visibility_mode: "public" as any,
            seeking_visibility: "actively_looking" as any,
            preferred_roles: ["Chef", "Kitchen Lead"],
            preferred_locations: ["London"],
            profile_summary: "Experienced chef seeking new opportunities in central London.",
          }]);
          // Second employee: no talent profile (intentional gap for testing)
        }

        // 5d. Seed vacancies
        if (cfg.seedVacancies) {
          const vacancyData = [
            { title: "Sous Chef", description: "Looking for an experienced sous chef to join our kitchen team.", employment_type: "full_time", location: branches[0], country: cfg.country },
            { title: "Waitstaff", description: "Friendly and experienced servers needed for busy restaurant.", employment_type: "part_time", location: branches[0], country: cfg.country },
          ];
          for (const v of vacancyData) {
            await supabase.from("talent_vacancies").insert({
              tenant_id: tenant.id,
              created_by: user.id,
              title: v.title,
              description: v.description,
              employment_type: v.employment_type,
              location: v.location,
              country: v.country,
              status: "published",
            });
          }
        }

        // 5e. Seed payroll periods
        if (cfg.seedPayrollPeriods) {
          const now = new Date();
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(thisMonth.getTime() - 86400000);
          const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          await supabase.from("payroll_periods").insert([
            {
              tenant_id: tenant.id,
              period_name: `${lastMonth.toLocaleString("en", { month: "long", year: "numeric" })}`,
              start_date: lastMonth.toISOString().split("T")[0],
              end_date: lastMonthEnd.toISOString().split("T")[0],
              status: "approved" as any,
            },
            {
              tenant_id: tenant.id,
              period_name: `${thisMonth.toLocaleString("en", { month: "long", year: "numeric" })}`,
              start_date: thisMonth.toISOString().split("T")[0],
              end_date: thisMonthEnd.toISOString().split("T")[0],
              status: "draft",
            },
          ]);
        }
      } else {
        testUsers.push({ label: "Staff 1", role: "staff" }, { label: "Staff 2", role: "staff" });
      }

      // 6. Create company settings if not new_signup
      if (cfg.setupState !== "new_signup") {
        await supabase.from("company_settings").insert({
          tenant_id: tenant.id,
          company_name: cfg.tenantName,
          pay_period: cfg.payrollFrequency === "monthly" ? "Monthly" : "4-Weekly",
        });
      }

      // 7. Register as sandbox
      const { error: sandboxErr } = await supabase.from("sandbox_tenants").insert({
        tenant_id: tenant.id,
        created_by: user.id,
        preset_name: cfg.preset,
        setup_state: cfg.setupState,
        test_users: testUsers,
      });
      if (sandboxErr) throw sandboxErr;

      // 8. Audit log
      await logSandboxAudit(tenant.id, user.id, "sandbox_created", {
        preset: cfg.preset,
        setup_state: cfg.setupState,
        employees_seeded: createdEmployeeIds.length,
        talent_profiles: cfg.seedTalentProfiles,
        vacancies: cfg.seedVacancies,
        payroll_periods: cfg.seedPayrollPeriods,
        archived_leaver: cfg.seedArchivedLeaver,
      });

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      if (user) {
        await logSandboxAudit(tenantId, user.id, "sandbox_deleted");
      }
      await supabase.from("sandbox_tenants").delete().eq("tenant_id", tenantId);
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      // Delete operational data
      await Promise.all([
        supabase.from("shifts").delete().eq("tenant_id", tenantId),
        supabase.from("holiday_requests").delete().eq("tenant_id", tenantId),
        supabase.from("absence_records").delete().eq("tenant_id", tenantId),
        supabase.from("time_entries").delete().eq("tenant_id", tenantId),
        supabase.from("talent_contact_unlocks").delete().eq("tenant_id", tenantId),
        supabase.from("talent_credit_purchases").delete().eq("tenant_id", tenantId),
        supabase.from("talent_credit_ledger").delete().eq("tenant_id", tenantId),
        supabase.from("talent_credit_wallets").delete().eq("tenant_id", tenantId),
      ]);
      // Reset employees (cascades talent profiles, documents, etc.)
      await supabase.from("employees").delete().eq("tenant_id", tenantId);

      if (user) {
        await logSandboxAudit(tenantId, user.id, "sandbox_reset");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox-tenants"] });
      toast.success("Sandbox data reset");
    },
  });
}
