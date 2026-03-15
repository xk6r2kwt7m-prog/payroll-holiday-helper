import { useState, useEffect, useCallback } from "react";
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
import { useOwnTalentProfile } from "@/hooks/useTalentPool";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Skeleton } from "@/components/ui/skeleton";

const TalentPool = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { isAdmin } = useAuth();
  const { data: ownProfile } = useOwnTalentProfile();

  const resetPageState = useCallback(() => {
    // activeTab will re-resolve from resolveDefaultTab on next render
  }, []);
  const { tenantReady } = useTenantGuard(resetPageState);

  const hasWorkerProfile = !!ownProfile;
  // Employer mode: admin without a worker profile; Worker mode: everyone else
  const isEmployerView = isAdmin && !hasWorkerProfile;
  const inboxMode = isEmployerView ? "employer" : "worker";

  // Default tab: workers land on "vacancies", employers land on "browse" (talent search)
  const resolveDefaultTab = () => {
    if (tabParam === "my-profile") return "my-profile";
    if (tabParam === "inbox") return "inbox";
    if (tabParam === "applications") return "applications";
    if (tabParam === "billing" && isAdmin) return "billing";
    if (tabParam === "browse" && isAdmin) return "browse";
    if (tabParam === "requests" && isAdmin) return "requests";
    return isEmployerView ? "browse" : "vacancies";
  };

  const [activeTab, setActiveTab] = useState(resolveDefaultTab);

  useEffect(() => {
    if (tabParam) {
      const resolved = resolveDefaultTab();
      setActiveTab(resolved);
    }
  }, [tabParam]);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="animate-slide-in-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            Talent Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEmployerView
              ? "Search talent and manage hiring"
              : "Discover opportunities and manage your profile"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 flex-wrap">
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

            {/* === Employer-only tabs (admin only) === */}
            {isAdmin && (
              <TabsTrigger value="browse" className="text-xs gap-1">
                <Search className="h-3.5 w-3.5" /> Talent
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="requests" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" /> Requests
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="billing" className="text-xs gap-1">
                <CreditCard className="h-3.5 w-3.5" /> Billing
              </TabsTrigger>
            )}
          </TabsList>

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

          {/* Employer content */}
          {isAdmin && (
            <TabsContent value="browse" className="mt-4">
              <TalentSearch />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="requests" className="mt-4">
              <TalentRequestList />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="billing" className="mt-4">
              <TalentBillingHistory />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TalentPool;
