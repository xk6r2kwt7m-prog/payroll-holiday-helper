import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTenant } from "@/hooks/useTenant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, BarChart3, Shield, Loader2, FlaskConical, CreditCard } from "lucide-react";
import { PlatformOverview } from "@/components/platform/PlatformOverview";
import { TenantManagement } from "@/components/platform/TenantManagement";
import { PlatformAnalytics } from "@/components/platform/PlatformAnalytics";
import { PermissionVisualizer } from "@/components/platform/PermissionVisualizer";
import { SandboxTestingConsole } from "@/components/platform/SandboxTestingConsole";
import { TalentBillingAdmin } from "@/components/platform/TalentBillingAdmin";

const PlatformAdmin = () => {
  const { isPlatformAdmin, loading } = useTenant();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!loading && !isPlatformAdmin) {
      navigate("/", { replace: true });
    }
  }, [loading, isPlatformAdmin, navigate]);

  if (loading || !isPlatformAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
          <p className="text-muted-foreground text-sm">Manage tenants, subscriptions, and platform health</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-2">
              <Building2 className="h-4 w-4" /> Tenants
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2">
              <FlaskConical className="h-4 w-4" /> Sandbox
            </TabsTrigger>
            <TabsTrigger value="talent-billing" className="gap-2">
              <CreditCard className="h-4 w-4" /> Talent Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <PlatformOverview />
          </TabsContent>

          <TabsContent value="tenants" className="mt-6">
            <TenantManagement />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PlatformAnalytics />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6">
            <PermissionVisualizer />
          </TabsContent>

          <TabsContent value="sandbox" className="mt-6">
            <SandboxTestingConsole />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PlatformAdmin;
