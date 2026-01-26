import { useState } from "react";
import { Plus, Calendar, Check, X, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HolidayRequest {
  id: string;
  employeeName: string;
  type: "annual" | "sick" | "personal" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  submittedAt: string;
}

const requests: HolidayRequest[] = [
  { id: "1", employeeName: "Sarah Johnson", type: "annual", startDate: "Feb 15, 2024", endDate: "Feb 22, 2024", days: 5, status: "pending", reason: "Family vacation", submittedAt: "Feb 1, 2024" },
  { id: "2", employeeName: "Michael Chen", type: "sick", startDate: "Feb 12, 2024", endDate: "Feb 13, 2024", days: 2, status: "pending", reason: "Medical appointment", submittedAt: "Feb 11, 2024" },
  { id: "3", employeeName: "Emily Davis", type: "personal", startDate: "Feb 20, 2024", endDate: "Feb 20, 2024", days: 1, status: "pending", reason: "Personal matters", submittedAt: "Feb 5, 2024" },
  { id: "4", employeeName: "James Wilson", type: "annual", startDate: "Mar 1, 2024", endDate: "Mar 8, 2024", days: 5, status: "approved", reason: "Spring break trip", submittedAt: "Jan 28, 2024" },
  { id: "5", employeeName: "Lisa Anderson", type: "unpaid", startDate: "Mar 15, 2024", endDate: "Mar 22, 2024", days: 5, status: "approved", reason: "Extended travel", submittedAt: "Feb 2, 2024" },
  { id: "6", employeeName: "David Brown", type: "sick", startDate: "Feb 5, 2024", endDate: "Feb 6, 2024", days: 2, status: "rejected", reason: "Feeling unwell", submittedAt: "Feb 4, 2024" },
];

const typeStyles = {
  annual: "bg-primary/10 text-primary",
  sick: "bg-destructive/10 text-destructive",
  personal: "bg-accent/10 text-accent",
  unpaid: "bg-muted text-muted-foreground",
};

const typeLabels = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  personal: "Personal Day",
  unpaid: "Unpaid Leave",
};

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  approved: <Check className="h-4 w-4 text-success" />,
  rejected: <X className="h-4 w-4 text-destructive" />,
};

const Holidays = () => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "all") return true;
    return req.status === activeTab;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Holidays & Leave</h1>
            <p className="text-muted-foreground">
              Manage time-off requests and holiday calendar
            </p>
          </div>
          <Button className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                <p className="text-sm text-warning/80">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-success/10 border border-success/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{approvedCount}</p>
                <p className="text-sm text-success/80">Approved This Month</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">12</p>
                <p className="text-sm text-primary/80">Public Holidays Left</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Requests</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="divide-y divide-border">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {request.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-card-foreground">{request.employeeName}</p>
                      {statusIcons[request.status]}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.startDate} - {request.endDate} · {request.days} {request.days === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${typeStyles[request.type]}`}>
                    {typeLabels[request.type]}
                  </span>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-success hover:bg-success hover:text-success-foreground"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Holidays;
