import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, DollarSign, Clock, FileText, Calendar, BarChart3, FileDown, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods, usePayrollEntries, useApprovePayrollPeriod, useSubmitPayrollForReview, useReopenPayrollPeriod, useDeletePayrollPeriod } from "@/hooks/usePayroll";
import { formatCurrency, formatHours, useHolidayPayments } from "@/hooks/useHolidays";
import { useEmployees } from "@/hooks/useEmployees";
import { ImportPayrollDialog } from "@/components/payroll/ImportPayrollDialog";
import { CreatePayrollDialog } from "@/components/payroll/CreatePayrollDialog";
import { EditablePayrollTable } from "@/components/payroll/EditablePayrollTable";
import { PayrollApprovalWorkflow } from "@/components/payroll/PayrollApprovalWorkflow";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { PayrollPDF } from "@/components/payroll/PayrollPDF";

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
  const { data: holidayPayments = [] } = useHolidayPayments(selectedPeriod?.id);
  const { data: allEmployees = [] } = useEmployees();
  const approvePeriod = useApprovePayrollPeriod();
  const submitForReview = useSubmitPayrollForReview();
  const reopenPeriod = useReopenPayrollPeriod();
  const deletePeriod = useDeletePayrollPeriod();
  const { isAdmin } = useAuth();

  const totalPay = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalBonuses = entries.reduce((sum, e: any) => sum + Number(e.performance_bonus) + Number(e.special_bonus), 0);
  const avgRate = entries.length > 0 
    ? entries.reduce((sum, e: any) => sum + Number(e.hourly_rate), 0) / entries.length 
    : 0;
  const zeroHoursCount = entries.filter((e: any) => Number(e.timesheet_hours) === 0).length;

  // Rate discrepancy detection
  const rateDiscrepancies = entries.filter((e: any) => {
    const emp = e.employees;
    if (!emp) return false;
    return Number(e.hourly_rate) !== Number(emp.hourly_rate);
  });

  const handleSubmitForReview = async () => {
    if (!selectedPeriod) return;
    try {
      await submitForReview.mutateAsync(selectedPeriod.id);
      toast.success("Payroll submitted for review");
    } catch {
      toast.error("Failed to submit payroll");
    }
  };

  const handleApprove = async () => {
    if (!selectedPeriod) return;
    try {
      await approvePeriod.mutateAsync(selectedPeriod.id);
      toast.success("Payroll approved and locked");
    } catch {
      toast.error("Failed to approve payroll");
    }
  };

  const handleReopen = async () => {
    if (!selectedPeriod) return;
    try {
      await reopenPeriod.mutateAsync(selectedPeriod.id);
      // Mark as corrected so the system knows this is a corrected version
      const existingNotes = selectedPeriod.notes || "";
      const correctionMark = existingNotes.includes("[CORRECTED]")
        ? existingNotes
        : `[CORRECTED] Reopened for correction on ${new Date().toLocaleDateString("en-GB")}. ${existingNotes}`.trim();
      await supabase
        .from("payroll_periods")
        .update({ notes: correctionMark })
        .eq("id", selectedPeriod.id);
      toast.success("Payroll period reopened for correction — make your changes and re-approve");
    } catch {
      toast.error("Failed to reopen payroll");
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return;
    if (selectedPeriod.status !== "draft") {
      toast.error("Only draft periods can be deleted");
      return;
    }
    try {
      const deletedId = selectedPeriod.id;
      await deletePeriod.mutateAsync(deletedId);
      const remaining = periods.filter(p => p.id !== deletedId);
      setSelectedPeriodId(remaining.length > 0 ? remaining[0].id : null);
      toast.success(`"${selectedPeriod.period_name}" deleted`);
    } catch {
      toast.error("Failed to delete payroll period");
    }
  };

  const handleExport = async (includeBankDetails: boolean) => {
    if (!selectedPeriod || entries.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_entries",
        record_id: selectedPeriod.id,
        new_data: {
          operation: "export",
          period_name: selectedPeriod.period_name,
          included_bank_details: includeBankDetails,
          entry_count: entries.length,
          export_type: "csv"
        }
      });

      const headers = [
        "Employee", "Department", "NI Number",
        ...(includeBankDetails ? ["Sort Code", "Account Number"] : []),
        "Hourly Rate", "Service Charge", "Hours", "Performance Bonus",
        "Special Bonus", "Holiday Accrued", "Total Pay",
      ];

      const rows = entries.map((entry: any) => {
        const emp = entry.employees;
        return [
          `${emp?.forename} ${emp?.surname}`, emp?.department, emp?.ni_number || "",
          ...(includeBankDetails ? [emp?.sort_code || "", emp?.bank_account_no || ""] : []),
          entry.hourly_rate, entry.service_charge || 0, entry.timesheet_hours,
          entry.performance_bonus || 0, entry.special_bonus || 0,
          entry.holiday_accrued_hours || 0, entry.total_pay,
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${selectedPeriod.period_name.replace(/\s+/g, "-")}${includeBankDetails ? "-with-bank" : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(includeBankDetails ? "Exported with bank details" : "Payroll exported");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export payroll");
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedPeriod || entries.length === 0) return;
    try {
      toast.info("Generating PDF...");
      // Find starters in this period's entries
      const starterEmployees = allEmployees.filter(emp => 
        emp.status === 'starter' && entries.some((e: any) => e.employee_id === emp.id)
      );

      const blob = await pdf(
        <PayrollPDF
          period={selectedPeriod as any}
          entries={entries as any}
          holidayPayments={holidayPayments as any}
          starters={starterEmployees as any}
          isCorrection={!!selectedPeriod.notes?.includes("[CORRECTED]")}
          correctionNote={selectedPeriod.notes?.includes("[CORRECTED]") ? selectedPeriod.notes : undefined}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${selectedPeriod.period_name.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_periods",
        record_id: selectedPeriod.id,
        new_data: { operation: "pdf_export", period_name: selectedPeriod.period_name },
      });
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF");
    }
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
                  {(selectedPeriod as any).period_weeks && ` • ${(selectedPeriod as any).period_weeks} weeks`}
                </>
              ) : "No payroll periods yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPeriod && entries.length > 0 && (
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF Report
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/payroll/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </Button>
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

        {/* Approval Workflow */}
        {selectedPeriod && (
          <PayrollApprovalWorkflow
            period={selectedPeriod}
            isAdmin={isAdmin}
            onSubmitForReview={handleSubmitForReview}
            onApprove={handleApprove}
            onReopen={handleReopen}
            onDelete={selectedPeriod.status === "draft" ? handleDeletePeriod : undefined}
            isSubmitting={submitForReview.isPending}
            isApproving={approvePeriod.isPending}
            isReopening={reopenPeriod.isPending}
            isDeleting={deletePeriod.isPending}
            entryCount={entries.length}
            zeroHoursCount={zeroHoursCount}
          />
        )}

        {/* Rate Discrepancy Warning */}
        {rateDiscrepancies.length > 0 && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-warning text-warning-foreground text-xs">Rate Change</Badge>
              <p className="font-medium text-card-foreground text-sm">
                {rateDiscrepancies.length} employee{rateDiscrepancies.length > 1 ? "s have" : " has"} a different rate in this period vs their master record
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rateDiscrepancies.slice(0, 5).map((e: any) => (
                <Badge key={e.id} variant="outline" className="text-xs">
                  {e.employees?.forename} {e.employees?.surname}: {formatCurrency(Number(e.hourly_rate))} → {formatCurrency(Number(e.employees?.hourly_rate))}
                </Badge>
              ))}
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
