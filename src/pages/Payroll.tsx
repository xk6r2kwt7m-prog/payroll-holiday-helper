import { useState } from "react";
import { Download, DollarSign, Clock, CheckCircle, FileText, AlertCircle, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods, usePayrollEntries, useApprovePayrollPeriod } from "@/hooks/usePayroll";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { ImportPayrollDialog } from "@/components/payroll/ImportPayrollDialog";
import { CreatePayrollDialog } from "@/components/payroll/CreatePayrollDialog";
import { EditablePayrollTable } from "@/components/payroll/EditablePayrollTable";
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
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];
  const { data: entries = [], isLoading: loadingEntries } = usePayrollEntries(selectedPeriod?.id);
  const approvePeriod = useApprovePayrollPeriod();
  const { isAdmin } = useAuth();

  const totalPay = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalBonuses = entries.reduce((sum, e: any) => sum + Number(e.performance_bonus) + Number(e.special_bonus), 0);
  const avgRate = entries.length > 0 
    ? entries.reduce((sum, e: any) => sum + Number(e.hourly_rate), 0) / entries.length 
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

  const handleExport = (includeBankDetails: boolean) => {
    if (!selectedPeriod || entries.length === 0) return;

    // Generate CSV content
    const headers = [
      "Employee",
      "Department",
      "NI Number",
      ...(includeBankDetails ? ["Sort Code", "Account Number"] : []),
      "Hourly Rate",
      "Service Charge",
      "Hours",
      "Performance Bonus",
      "Special Bonus",
      "Holiday Accrued",
      "Total Pay",
    ];

    const rows = entries.map((entry: any) => {
      const emp = entry.employees;
      const row = [
        `${emp?.forename} ${emp?.surname}`,
        emp?.department,
        emp?.ni_number || "",
        ...(includeBankDetails ? [emp?.sort_code || "", emp?.bank_account_no || ""] : []),
        entry.hourly_rate,
        entry.service_charge || 0,
        entry.timesheet_hours,
        entry.performance_bonus || 0,
        entry.special_bonus || 0,
        entry.holiday_accrued_hours || 0,
        entry.total_pay,
      ];
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedPeriod.period_name.replace(/\s+/g, "-")}${includeBankDetails ? "-with-bank" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(includeBankDetails 
      ? "Exported with bank details (marked as exported)" 
      : "Payroll exported"
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Payroll
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedPeriod ? (
                <>
                  {selectedPeriod.period_name} • {new Date(selectedPeriod.start_date).toLocaleDateString()} - {new Date(selectedPeriod.end_date).toLocaleDateString()}
                </>
              ) : "No payroll periods yet"}
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && <CreatePayrollDialog />}
            {isAdmin && <ImportPayrollDialog />}
          </div>
        </div>

        {/* Period Selector */}
        {periods.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {periods.slice(0, 6).map((period) => (
              <Button
                key={period.id}
                variant={selectedPeriod?.id === period.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriodId(period.id)}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
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
                <p className="text-sm text-muted-foreground">This payroll is in draft status. Edit timesheet hours, then approve when ready.</p>
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
            <p className="text-muted-foreground mb-4">No payroll periods yet. Create a new period or import from a previous system.</p>
            {isAdmin && (
              <div className="flex justify-center gap-3">
                <CreatePayrollDialog />
                <ImportPayrollDialog />
              </div>
            )}
          </div>
        )}

        {/* Payroll Table */}
        {entries.length > 0 && selectedPeriod && (
          <EditablePayrollTable
            entries={entries as any}
            periodId={selectedPeriod.id}
            periodStatus={selectedPeriod.status}
            isAdmin={isAdmin}
            onExport={handleExport}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Payroll;
