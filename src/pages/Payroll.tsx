import { useState } from "react";
import { Download, DollarSign, Clock, CheckCircle, FileText, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods, usePayrollEntries, useApprovePayrollPeriod } from "@/hooks/usePayroll";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { ImportPayrollDialog } from "@/components/payroll/ImportPayrollDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const statusStyles = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

const Payroll = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  
  const { data: periods = [], isLoading: loadingPeriods } = usePayrollPeriods();
  const { data: entries = [], isLoading: loadingEntries } = usePayrollEntries(selectedPeriodId || undefined);
  const approvePeriod = useApprovePayrollPeriod();
  const { isAdmin } = useAuth();

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];

  const totalPay = entries.reduce((sum, e) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e) => sum + Number(e.timesheet_hours), 0);
  const totalBonuses = entries.reduce((sum, e) => sum + Number(e.performance_bonus) + Number(e.special_bonus), 0);
  const avgRate = entries.length > 0 
    ? entries.reduce((sum, e) => sum + Number(e.hourly_rate), 0) / entries.length 
    : 0;

  const handleApprove = async () => {
    if (!selectedPeriod) return;
    
    try {
      await approvePeriod.mutateAsync(selectedPeriod.id);
      toast.success("Payroll approved successfully!");
    } catch {
      toast.error("Failed to approve payroll");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">
              {selectedPeriod ? `Period: ${selectedPeriod.period_name}` : "No payroll periods yet"}
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && <ImportPayrollDialog />}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        {periods.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {periods.slice(0, 5).map((period) => (
              <Button
                key={period.id}
                variant={selectedPeriodId === period.id || (!selectedPeriodId && period.id === periods[0]?.id) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriodId(period.id)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {period.period_name}
                <Badge variant="secondary" className={statusStyles[period.status]}>
                  {statusLabels[period.status]}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Payroll"
            value={formatCurrency(totalPay)}
            subtitle={`${entries.length} employees`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Total Hours"
            value={formatHours(totalHours)}
            subtitle="Timesheet hours"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Avg. Hourly Rate"
            value={formatCurrency(avgRate)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Bonuses"
            value={formatCurrency(totalBonuses)}
            subtitle="Performance + Special"
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Approval Banner */}
        {selectedPeriod && selectedPeriod.status === "draft" && isAdmin && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-card-foreground">Review Required</p>
                <p className="text-sm text-muted-foreground">This payroll is in draft status. Review and approve when ready.</p>
              </div>
            </div>
            <Button onClick={handleApprove} disabled={approvePeriod.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {approvePeriod.isPending ? "Approving..." : "Approve Payroll"}
            </Button>
          </div>
        )}

        {selectedPeriod && selectedPeriod.status === "approved" && (
          <div className="rounded-xl bg-success/10 border border-success/20 p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-success">Approved</p>
              <p className="text-sm text-muted-foreground">
                This payroll was approved on {selectedPeriod.approved_at ? new Date(selectedPeriod.approved_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(loadingPeriods || loadingEntries) && (
          <div className="rounded-xl bg-card shadow-card p-8 text-center">
            <p className="text-muted-foreground">Loading payroll data...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingPeriods && periods.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No payroll periods yet. Import your first payroll to get started.</p>
            {isAdmin && <ImportPayrollDialog />}
          </div>
        )}

        {/* Payroll Table */}
        {entries.length > 0 && (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-card-foreground">Payroll Details</h3>
              <p className="text-sm text-muted-foreground">Timesheet hours and payments for this period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Dept
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      H. Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Bonuses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Holiday Accrued
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry: any) => (
                    <tr key={entry.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-medium text-card-foreground">
                          {entry.employees?.forename} {entry.employees?.surname}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {entry.employees?.department}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {formatCurrency(Number(entry.hourly_rate))}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {formatHours(Number(entry.timesheet_hours))}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-success">
                        {Number(entry.performance_bonus) + Number(entry.special_bonus) > 0
                          ? formatCurrency(Number(entry.performance_bonus) + Number(entry.special_bonus))
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-accent">
                        {formatHours(Number(entry.holiday_accrued_hours))} hrs
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                        {formatCurrency(Number(entry.total_pay))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td colSpan={3} className="px-6 py-4 font-semibold text-card-foreground">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">
                      {formatHours(totalHours)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-success">
                      {formatCurrency(totalBonuses)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-accent">
                      {formatHours(entries.reduce((sum, e) => sum + Number(e.holiday_accrued_hours), 0))} hrs
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">
                      {formatCurrency(totalPay)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Payroll;
