import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Sun, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { HolidayRequestForm } from "@/components/holidays/HolidayRequestForm";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useMyHolidayRequests } from "@/hooks/useHolidayRequests";
import { useHolidayLedgerBalance } from "@/hooks/useHolidayLedger";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function StaffLeave() {
  const { t } = useI18n();
  const { employee, employeeId, employeeName, isLoading: empLoading } = useCurrentEmployee();
  const { data: myRequests = [] } = useMyHolidayRequests(employeeId);
  const { data: balances = [] } = useHolidayBalances(employeeId || undefined);
  const [activeTab, setActiveTab] = useState<"request" | "history">("request");

  if (empLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!employeeId || !employee) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-sm text-muted-foreground">
              Your account hasn't been linked to an employee record yet. Contact your manager.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentBalance = balances.find(
    (b: any) => b.leave_year_start === `${currentYear}-01-01`
  );
  const accrued = Number(currentBalance?.hours_accrued) || 0;
  const taken = Number(currentBalance?.hours_taken) || 0;
  const carried = Number(currentBalance?.hours_carried_over) || 0;
  const remaining = accrued + carried - taken;

  const pendingRequests = myRequests.filter(r => r.status === "pending");
  const approvedRequests = myRequests.filter(r => r.status === "approved");
  const rejectedRequests = myRequests.filter(r => r.status === "rejected");

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "approved": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      approved: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return (
      <Badge variant="outline" className={cn("text-[10px] capitalize", styles[status])}>
        {status}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-24 space-y-5">
        {/* Header */}
        <motion.div {...anim} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Time Off</h1>
              <p className="text-sm text-muted-foreground">Manage your leave requests</p>
            </div>
          </div>
        </motion.div>

        {/* Balance Summary */}
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
              <p className="text-lg font-bold text-foreground tabular-nums">{accrued.toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Accrued</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
              <p className="text-lg font-bold text-foreground tabular-nums">{taken.toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Taken</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
              <p className={cn("text-lg font-bold tabular-nums", remaining < 0 ? "text-destructive" : "text-success")}>{remaining.toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Remaining</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">Hours · {currentYear} leave year</p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
          <div className="flex gap-1.5">
            {[
              { id: "request" as const, label: "Request Leave", icon: Calendar },
              { id: "history" as const, label: "My Requests", icon: Clock, badge: pendingRequests.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px] flex-1 justify-center",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground active:bg-muted"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-1 h-5 min-w-[20px] rounded-full bg-warning/20 text-warning text-[10px] font-bold flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Request Form */}
        {activeTab === "request" && (
          <motion.div {...anim} transition={{ duration: 0.25 }}>
            <HolidayRequestForm employeeId={employeeId} employeeName={employeeName || ""} />
          </motion.div>
        )}

        {/* Request History */}
        {activeTab === "history" && (
          <motion.div {...anim} transition={{ duration: 0.25 }} className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No leave requests yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Submit your first leave request using the "Request Leave" tab above.
                </p>
              </div>
            ) : (
              <>
                {pendingRequests.length > 0 && (
                  <div className="rounded-xl bg-warning/5 border border-warning/20 px-4 py-2.5 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-xs font-medium text-warning">
                      {pendingRequests.length} request{pendingRequests.length > 1 ? "s" : ""} awaiting approval
                    </span>
                  </div>
                )}
                {myRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      {statusIcon(req.status)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(parseISO(req.start_date), "d MMM")}
                          {req.start_date !== req.end_date && ` – ${format(parseISO(req.end_date), "d MMM yyyy")}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {req.hours_requested}h requested
                          {req.reason && ` · ${req.reason}`}
                        </p>
                        {req.review_notes && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5 italic">
                            "{req.review_notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
