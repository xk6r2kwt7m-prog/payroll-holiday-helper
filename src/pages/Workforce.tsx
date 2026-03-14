import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveLabourDashboard } from "@/components/workforce/LiveLabourDashboard";
import { CrossLocationBalancing } from "@/components/workforce/CrossLocationBalancing";
import { StaffTransferDialog } from "@/components/workforce/StaffTransferDialog";
import { FindCoverSheet } from "@/components/workforce/FindCoverSheet";
import { EmergencyCoverTool } from "@/components/workforce/EmergencyCoverTool";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useStaffTransfers } from "@/hooks/useTransfers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowRightLeft, Search, AlertTriangle, BarChart3,
  MapPin, ArrowRight, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Workforce() {
  const isMobile = useIsMobile();
  const { data: locations = [] } = useBranchLocations();
  const { data: transfers = [] } = useStaffTransfers();
  const [activeTab, setActiveTab] = useState("overview");

  const recentTransfers = transfers.slice(0, 10);

  return (
    <AppLayout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Workforce</h1>
            <p className="text-sm text-muted-foreground">Multi-location staffing & coverage</p>
          </div>
          <div className="flex gap-2">
            <EmergencyCoverTool />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FindCoverSheet
            trigger={
              <Button variant="outline" size="sm" className="flex-shrink-0 rounded-xl h-10">
                <Search className="h-4 w-4 mr-1.5" /> Find Cover
              </Button>
            }
          />
          <StaffTransferDialog
            trigger={
              <Button variant="outline" size="sm" className="flex-shrink-0 rounded-xl h-10">
                <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
              </Button>
            }
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="overview" className="rounded-lg text-xs">Overview</TabsTrigger>
            <TabsTrigger value="labour" className="rounded-lg text-xs">Labour</TabsTrigger>
            <TabsTrigger value="transfers" className="rounded-lg text-xs">Transfers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <CrossLocationBalancing />

            {/* Per-location labour cards */}
            {locations.length > 0 && (
              <div className="space-y-3">
                {locations.slice(0, 3).map((loc) => (
                  <LiveLabourDashboard key={loc.id} branch={loc.branch} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="labour" className="space-y-4 mt-4">
            <LiveLabourDashboard />
            {locations.map((loc) => (
              <LiveLabourDashboard key={loc.id} branch={loc.branch} />
            ))}
          </TabsContent>

          <TabsContent value="transfers" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Recent Transfers</h3>
              <StaffTransferDialog
                trigger={
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> New
                  </Button>
                }
              />
            </div>

            {recentTransfers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <ArrowRightLeft className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No transfers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-card-foreground flex items-center gap-1">
                        {t.from_branch} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {t.to_branch}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(t.transfer_date), "dd MMM yyyy")}
                        {t.is_temporary && (
                          <Badge variant="secondary" className="text-[9px] ml-1">Temp</Badge>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${t.status === "active" ? "bg-success/10 text-success" : ""}`}
                    >
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
