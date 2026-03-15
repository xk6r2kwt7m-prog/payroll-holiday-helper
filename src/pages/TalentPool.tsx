import { useState, useEffect } from "react";
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

const TalentPool = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam === "my-profile" ? "my-profile"
    : tabParam === "inbox" ? "inbox"
    : tabParam === "applications" ? "applications"
    : "vacancies"
  );
  const { isAdmin } = useAuth();
  const { data: ownProfile } = useOwnTalentProfile();

  const hasWorkerProfile = !!ownProfile;
  const inboxMode = hasWorkerProfile ? "worker" : (isAdmin ? "employer" : "worker");

  useEffect(() => {
    if (tabParam === "my-profile") setActiveTab("my-profile");
    if (tabParam === "inbox") setActiveTab("inbox");
    if (tabParam === "applications") setActiveTab("applications");
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
            Discover opportunities and verified talent
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="vacancies" className="text-xs gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-xs gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Applied
            </TabsTrigger>
            <TabsTrigger value="browse" className="text-xs gap-1">
              <Search className="h-3.5 w-3.5" /> Talent
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="requests" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" /> Requests
              </TabsTrigger>
            )}
            <TabsTrigger value="inbox" className="text-xs gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="my-profile" className="text-xs gap-1">
              <Users className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="billing" className="text-xs gap-1">
                <CreditCard className="h-3.5 w-3.5" /> Billing
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="vacancies" className="mt-4">
            <VacancyBrowse />
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            <MyApplications />
          </TabsContent>

          <TabsContent value="browse" className="mt-4">
            <TalentSearch />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="requests" className="mt-4">
              <TalentRequestList />
            </TabsContent>
          )}

          <TabsContent value="inbox" className="mt-4">
            <TalentInbox mode={inboxMode} />
          </TabsContent>

          <TabsContent value="my-profile" className="mt-4">
            <TalentProfileManager />
          </TabsContent>

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
