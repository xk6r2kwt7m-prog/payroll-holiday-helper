import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Search, FileText, Sparkles } from "lucide-react";
import { TalentSearch } from "@/components/talent/TalentSearch";
import { TalentRequestList } from "@/components/talent/TalentRequestList";
import { TalentProfileManager } from "@/components/talent/TalentProfileManager";
import { useAuth } from "@/hooks/useAuth";

const TalentPool = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam === "my-profile" ? "my-profile" : "browse");
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (tabParam === "my-profile") setActiveTab("my-profile");
  }, [tabParam]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Talent Pool
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover verified, privacy-safe talent from your network
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10">
            <TabsTrigger value="browse" className="text-xs sm:text-sm gap-1.5">
              <Search className="h-4 w-4" />
              Browse Talent
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="requests" className="text-xs sm:text-sm gap-1.5">
                <FileText className="h-4 w-4" />
                Requests
              </TabsTrigger>
            )}
            <TabsTrigger value="my-profile" className="text-xs sm:text-sm gap-1.5">
              <Users className="h-4 w-4" />
              My Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            <TalentSearch />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="requests" className="mt-4">
              <TalentRequestList />
            </TabsContent>
          )}

          <TabsContent value="my-profile" className="mt-4">
            <TalentProfileManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TalentPool;
