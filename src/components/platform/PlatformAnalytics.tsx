import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, DollarSign, GraduationCap, FileText, Users, Loader2 } from "lucide-react";

export function PlatformAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const [
        employeesRes,
        shiftsRes,
        payrollRes,
        trainingRes,
        docsRes,
        onboardingRes,
      ] = await Promise.all([
        supabase.from("employees").select("id, tenant_id, status"),
        supabase.from("shifts").select("id, tenant_id").limit(1000),
        supabase.from("payroll_periods").select("id, tenant_id, status").limit(1000),
        supabase.from("training_records").select("id, tenant_id").limit(1000),
        supabase.from("employee_documents").select("id, tenant_id").limit(1000),
        supabase.from("tenant_onboarding_state").select("id, tenant_id, completed_at"),
      ]);

      const employees = employeesRes.data || [];
      const shifts = shiftsRes.data || [];
      const payroll = payrollRes.data || [];
      const training = trainingRes.data || [];
      const docs = docsRes.data || [];
      const onboarding = onboardingRes.data || [];

      // Module usage by tenant
      const tenantModuleUsage = new Map<string, Set<string>>();
      const addUsage = (items: any[], module: string) => {
        items.forEach((item) => {
          if (!tenantModuleUsage.has(item.tenant_id)) tenantModuleUsage.set(item.tenant_id, new Set());
          tenantModuleUsage.get(item.tenant_id)!.add(module);
        });
      };
      addUsage(shifts, "scheduling");
      addUsage(payroll, "payroll");
      addUsage(training, "training");
      addUsage(docs, "documents");

      const moduleAdoption: Record<string, number> = { scheduling: 0, payroll: 0, training: 0, documents: 0 };
      tenantModuleUsage.forEach((modules) => {
        modules.forEach((m) => { moduleAdoption[m] = (moduleAdoption[m] || 0) + 1; });
      });

      const completedOnboarding = onboarding.filter((o) => o.completed_at).length;

      return {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === "active").length,
        totalShifts: shifts.length,
        totalPayrollPeriods: payroll.length,
        totalTraining: training.length,
        totalDocuments: docs.length,
        moduleAdoption,
        onboardingCompletion: onboarding.length > 0
          ? Math.round((completedOnboarding / onboarding.length) * 100)
          : 0,
        tenantsUsingPlatform: tenantModuleUsage.size,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: data?.totalEmployees || 0, icon: Users },
          { label: "Active Employees", value: data?.activeEmployees || 0, icon: Users },
          { label: "Shifts Created", value: data?.totalShifts || 0, icon: Calendar },
          { label: "Payroll Periods", value: data?.totalPayrollPeriods || 0, icon: DollarSign },
          { label: "Training Records", value: data?.totalTraining || 0, icon: GraduationCap },
          { label: "Documents", value: data?.totalDocuments || 0, icon: FileText },
          { label: "Active Tenants", value: data?.tenantsUsingPlatform || 0, icon: BarChart3 },
          { label: "Onboarding %", value: `${data?.onboardingCompletion || 0}%`, icon: BarChart3 },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-card-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Adoption */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm">Module Adoption (tenants actively using)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data?.moduleAdoption || {}).map(([module, count]) => (
              <div key={module} className="flex items-center justify-between">
                <span className="text-sm capitalize text-card-foreground">{module}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, ((count as number) / Math.max(data?.tenantsUsingPlatform || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-card-foreground w-8 text-right">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
