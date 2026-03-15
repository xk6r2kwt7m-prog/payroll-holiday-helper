import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Search, FileText, Sparkles, Briefcase, MessageSquare, ClipboardList, CreditCard } from "lucide-react";
import { TalentSearch } from "@/components/talent/TalentSearch";
import { TalentRequestList } from "@/components/talent/TalentRequestList";
import { TalentProfileManager } from "@/components/talent/TalentProfileManager";
import { VacancyBrowse } from "@/components/talent/VacancyBrowse";
import { TalentInbox } from "@/components/talent/TalentInbox";
import { MyApplications } from "@/components/talent/MyApplications";
import { TalentBillingHistory } from "@/components/talent/TalentBillingHistory";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useOwnTalentProfile } from "@/hooks/useTalentPool";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Effective admin resolution for Talent Pool employer features.
 * True if ANY of:
 *   - Platform admin
 *   - user_roles.role === 'admin'
 *   - tenant_members.role === 'company_admin'
 *   - Impersonating as admin
 */
function useIsEffectiveAdmin(): boolean {
  const { isAdmin: isAppRoleAdmin } = useAuth();
  const { isPlatformAdmin, isTenantAdmin } = useTenant();
  const { active, impersonatedRole } = useImpersonation();

  return (
    isPlatformAdmin ||
    isAppRoleAdmin ||
    isTenantAdmin ||
    (active && impersonatedRole === "admin")
  );
}

const TalentPool = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { user } = useAuth();
  const { tenantId, isPlatformAdmin, isTenantAdmin, tenantRole } = useTenant();
  const { active: impersonating, impersonatedRole } = useImpersonation();
  const { data: ownProfile } = useOwnTalentProfile();

  const isEffectiveAdmin = useIsEffectiveAdmin();

  const resetPageState = useCallback(() => {
    // activeTab re-resolves on render
  }, []);
  const { tenantReady } = useTenantGuard(resetPageState);

  // Employer tabs always visible for admins — regardless of worker profile
  const showEmployerTabs = isEffectiveAdmin;
  const inboxMode = isEffectiveAdmin ? "employer" : "worker";

  // Default tab: admins → "browse" (talent search), non-admins → "vacancies" (jobs)
  const resolveDefaultTab = useCallback(() => {
    if (tabParam === "my-profile") return "my-profile";
    if (tabParam === "inbox") return "inbox";
    if (tabParam === "applications") return "applications";
    if (tabParam === "billing" && isEffectiveAdmin) return "billing";
    if (tabParam === "browse" && isEffectiveAdmin) return "browse";
    if (tabParam === "requests" && isEffectiveAdmin) return "requests";
    if (tabParam === "vacancies") return "vacancies";
    return isEffectiveAdmin ? "browse" : "vacancies";
  }, [tabParam, isEffectiveAdmin]);

  const [activeTab, setActiveTab] = useState(resolveDefaultTab);

  useEffect(() => {
    const resolved = resolveDefaultTab();
    setActiveTab(resolved);
  }, [resolveDefaultTab]);

  // DEV diagnostics
  if (process.env.NODE_ENV === "development") {
    console.log("[TalentPool] Role resolution:", {
      userId: user?.id,
      tenantId,
      tenantRole,
      isPlatformAdmin,
      isTenantAdmin,
      impersonating,
      impersonatedRole,
      isEffectiveAdmin,
      defaultTab: resolveDefaultTab(),
      showEmployerTabs,
      activeTab,
    });
  }

  if (!tenantReady) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header — role-aware */}
        <div className="animate-slide-in-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              {isEffectiveAdmin ? <Search className="h-4.5 w-4.5 text-primary" /> : <Sparkles className="h-4.5 w-4.5 text-primary" />}
            </div>
            {isEffectiveAdmin ? "Candidate Search" : "Talent Pool"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEffectiveAdmin
              ? "Browse available talent profiles, manage hiring requests, and track billing"
              : "Discover opportunities and manage your profile"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 flex-wrap">
            {/* === Employer tabs first for admins === */}
            {showEmployerTabs && (
              <TabsTrigger value="browse" className="text-xs gap-1">
                <Search className="h-3.5 w-3.5" /> Talent
              </TabsTrigger>
            )}
            {showEmployerTabs && (
              <TabsTrigger value="requests" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" /> Requests
              </TabsTrigger>
            )}
            {showEmployerTabs && (
              <TabsTrigger value="billing" className="text-xs gap-1">
                <CreditCard className="h-3.5 w-3.5" /> Billing
              </TabsTrigger>
            )}

            {/* Divider visual cue for admins */}
            {showEmployerTabs && (
              <div className="w-px h-5 bg-border mx-1 self-center" />
            )}

            {/* === Candidate tabs (visible to all) === */}
            <TabsTrigger value="vacancies" className="text-xs gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-xs gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Applied
            </TabsTrigger>
            <TabsTrigger value="inbox" className="text-xs gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="my-profile" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
          </TabsList>

          {/* Employer content */}
          {showEmployerTabs && (
            <TabsContent value="browse" className="mt-4">
              <TalentSearch />
            </TabsContent>
          )}
          {showEmployerTabs && (
            <TabsContent value="requests" className="mt-4">
              <TalentRequestList />
            </TabsContent>
          )}
          {showEmployerTabs && (
            <TabsContent value="billing" className="mt-4">
              <TalentBillingHistory />
            </TabsContent>
          )}

          {/* Candidate content */}
          <TabsContent value="vacancies" className="mt-4">
            <VacancyBrowse />
          </TabsContent>
          <TabsContent value="applications" className="mt-4">
            <MyApplications />
          </TabsContent>
          <TabsContent value="inbox" className="mt-4">
            <TalentInbox mode={inboxMode} />
          </TabsContent>
          <TabsContent value="my-profile" className="mt-4">
            <TalentProfileManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TalentPool;
