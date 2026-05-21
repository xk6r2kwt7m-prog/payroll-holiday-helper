import { useState, useCallback, useMemo, useEffect } from "react";
import { usePayrollEntryLocations } from "@/hooks/usePayrollLocations";
import { buildLocationSplitRows } from "@/lib/payroll-report-transform";

import { DollarSign, Clock, FileText, FileDown } from "lucide-react";
import { SensitiveField, SensitiveSection } from "@/components/ui/sensitive-field";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods, usePayrollEntries, useApprovePayrollPeriod, useSubmitPayrollForReview, useReopenPayrollPeriod, useDeletePayrollPeriod, useCreatePayrollEntry } from "@/hooks/usePayroll";
import { formatCurrency, formatHours, useHolidayPayments } from "@/hooks/useHolidays";
import { AddHolidayPaymentDialog } from "@/components/holidays/AddHolidayPaymentDialog";
import { SettleLeaverDialog } from "@/components/holidays/SettleLeaverDialog";
import { useEmployees } from "@/hooks/useEmployees";
import { ImportPayrollDialog } from "@/components/payroll/ImportPayrollDialog";
import { CreatePayrollDialog } from "@/components/payroll/CreatePayrollDialog";
import { EditablePayrollTable } from "@/components/payroll/EditablePayrollTable";
import { PayrollApprovalWorkflow } from "@/components/payroll/PayrollApprovalWorkflow";
import { PayrollApprovalChecklist } from "@/components/payroll/PayrollApprovalChecklist";
import { PayrollApprovalEvidence } from "@/components/payroll/PayrollApprovalEvidence";
import { buildPayrollApprovalEvidence } from "@/lib/payroll-approval-evidence";


import { buildPayrollPeriodReport } from "@/lib/labour-reporting";
import { buildApprovalChecklist, canApprove as canApproveChecklist } from "@/lib/payroll-approval-checklist";
import { usePayrollAdjustments } from "@/hooks/usePayrollAdjustments";
import { PayrollHolidaySection } from "@/components/payroll/PayrollHolidaySection";
import { PayrollSalesInput } from "@/components/payroll/PayrollSalesInput";
import { PayrollReminders } from "@/components/payroll/PayrollReminders";
import { PayrollInlineAnalytics } from "@/components/payroll/PayrollInlineAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { PayrollPDF } from "@/components/payroll/PayrollPDF";
import { PayrollReportBuilder } from "@/components/payroll/PayrollReportBuilder";
import { PayrollMissingInfo } from "@/components/payroll/PayrollMissingInfo";
import { EmptyState } from "@/components/ui/EmptyState";
import { PayrollNavStrip } from "@/components/payroll/PayrollNavStrip";
import { PayrollSourceInfo } from "@/components/payroll/PayrollSourceInfo";
import { UnresolvedIssuesPanel } from "@/components/payroll/UnresolvedIssuesPanel";
import { PayrollPeriodNotesSection } from "@/components/payroll/PayrollPeriodNotes";
import { usePermission } from "@/hooks/useRolePermissions";
import { useTenantPreferences } from "@/hooks/useTenantPreferences";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePayrollImportStatus } from "@/hooks/usePayrollImportStatus";
import { SendPayrollEmailDialog } from "@/components/payroll/SendPayrollEmailDialog";
import { MinimumWageCompliancePanel } from "@/components/payroll/MinimumWageCompliancePanel";
import { usePayrollMinimumWageCheck, useRecordNmwAudit } from "@/hooks/usePayrollMinimumWageCheck";
import { EmploymentTermsComparisonPanel } from "@/components/payroll/EmploymentTermsComparisonPanel";
import { useEmploymentTermsComparison } from "@/hooks/useEmploymentTermsComparison";

const PAYROLL_DISPLAY_DEFAULTS = {
  showBonusColumn: true,
  showServiceCharge: true,
  defaultPdfLogo: true,
  reminderDaysBefore: "3",
};

const Payroll = () => {
  const { t } = useI18n();
  const { tenantId } = useTenant();
  
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [reviewedIssueNames, setReviewedIssueNames] = useState<Set<string>>(new Set());

  // Reset page-local state on tenant switch
  const resetPageState = useCallback(() => {
    setSelectedPeriodId(null);
    setReportBuilderOpen(false);
    setReviewedIssueNames(new Set());
  }, []);
  const { tenantReady, assertTenantMatch } = useTenantGuard(resetPageState);

  const { data: periods = [], isLoading: loadingPeriods } = usePayrollPeriods();
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];
  const { data: entries = [], isLoading: loadingEntries } = usePayrollEntries(selectedPeriod?.id);
  // Get ALL prior period entries to determine first-time payroll employees
  const priorPeriodIds = useMemo(() => {
    if (!selectedPeriod || !periods.length) return [];
    const selectedDate = new Date(selectedPeriod.start_date);
    return periods
      .filter(p => p.id !== selectedPeriod.id && new Date(p.start_date) < selectedDate)
      .map(p => p.id);
  }, [periods, selectedPeriod]);

  // Fetch entries from the immediate prior period for rate comparison
  const immediatePriorPeriod = useMemo(() => {
    if (!selectedPeriod || !periods.length) return undefined;
    const selectedDate = new Date(selectedPeriod.start_date);
    const prior = periods
      .filter(p => p.id !== selectedPeriod.id && new Date(p.start_date) < selectedDate)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    return prior[0];
  }, [periods, selectedPeriod]);
  const { data: priorEntries = [] } = usePayrollEntries(immediatePriorPeriod?.id);

  // Build set of ALL employee IDs that appeared in ANY prior period
  const { data: allPriorEntries = [] } = useQuery({
    queryKey: ["all_prior_payroll_employee_ids", tenantId, priorPeriodIds],
    queryFn: async () => {
      if (!tenantId || priorPeriodIds.length === 0) return [];
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("employee_id")
        .eq("tenant_id", tenantId)
        .in("payroll_period_id", priorPeriodIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && priorPeriodIds.length > 0,
  });
  const priorPeriodEmployeeIds = useMemo(
    () => new Set(allPriorEntries.map((e: any) => e.employee_id).filter(Boolean)),
    [allPriorEntries]
  );

  // Build prior period rate map for change indicators
  const priorEntryRates = useMemo(() => {
    const map = new Map<string, { hourly_rate: number; service_charge: number }>();
    for (const entry of priorEntries) {
      map.set((entry as any).employee_id, {
        hourly_rate: Number((entry as any).hourly_rate) || 0,
        service_charge: Number((entry as any).service_charge || 0),
      });
    }
    return map;
  }, [priorEntries]);
  const { data: holidayPayments = [] } = useHolidayPayments(selectedPeriod?.id);
  const { data: allEmployees = [] } = useEmployees();
  const currentEmployeeIds = entries.map((entry: any) => entry.employee_id);
  const { unresolvedIssues, excludedNames } = usePayrollImportStatus(selectedPeriod?.id, currentEmployeeIds);
  const blockingIssues = unresolvedIssues.filter(i => !reviewedIssueNames.has(i.csvName));

  // Authoritative UK Minimum Wage compliance check for this period
  const nmw = usePayrollMinimumWageCheck({
    periodId: selectedPeriod?.id,
    periodStartDate: selectedPeriod?.start_date,
    entries,
  });
  const recordNmwAudit = useRecordNmwAudit();

  // Phase 2B — read-only comparison of payroll vs employee_contract_terms.
  // Does NOT change calculations, totals, or approval logic.
  const termsComparison = useEmploymentTermsComparison({
    periodStartDate: selectedPeriod?.start_date,
    entries,
  });

  // Phase 5A — Approval readiness checklist assembly. Read-only; never
  // mutates payroll data. Service charge stays excluded from NMW.
  const { data: payrollAdjustments = [] } = usePayrollAdjustments(selectedPeriod?.id);
  const [checklistAcks, setChecklistAcks] = useState<Set<string>>(new Set());
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  // Reset acks/confirmation when the selected period changes.
  // Phase 5B — proper side-effect; previously incorrectly used useMemo.
  useEffect(() => {
    setChecklistAcks(new Set());
    setChecklistConfirmed(false);
  }, [selectedPeriod?.id]);

  const phase5Report = useMemo(() => {
    if (!selectedPeriod || entries.length === 0) return null;
    const termsMap = new Map<string, any[]>();
    for (const r of termsComparison.rows) {
      if (r.terms) termsMap.set(r.employee_id, [r.terms]);
    }
    const entriesLike = (entries as any[]).map((e) => ({
      id: e.id,
      employee_id: e.employee_id,
      employee_name: e.employees
        ? `${e.employees.forename ?? ""} ${e.employees.surname ?? ""}`.trim() || "Unknown"
        : "Unknown",
      date_of_birth: e.employees?.date_of_birth ?? null,
      is_apprentice: false,
      timesheet_hours: Number(e.timesheet_hours) || 0,
      hourly_rate: Number(e.hourly_rate) || 0,
      service_charge: Number(e.service_charge ?? 0),
      performance_bonus: Number(e.performance_bonus ?? 0),
      special_bonus: Number(e.special_bonus ?? 0),
      total_pay: Number(e.total_pay ?? 0),
    }));
    return buildPayrollPeriodReport(
      {
        id: selectedPeriod.id,
        period_name: selectedPeriod.period_name,
        start_date: selectedPeriod.start_date,
        end_date: selectedPeriod.end_date,
        status: selectedPeriod.status,
      },
      entriesLike,
      termsMap,
    );
  }, [selectedPeriod, entries, termsComparison.rows]);

  const manualAdjustmentsByEntryId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of payrollAdjustments) {
      m.set(a.payroll_entry_id, (m.get(a.payroll_entry_id) ?? 0) + 1);
    }
    return m;
  }, [payrollAdjustments]);

  const phase5Checklist = useMemo(() => {
    if (!phase5Report || !selectedPeriod) return null;
    return buildApprovalChecklist({
      period_status: selectedPeriod.status,
      entries: phase5Report.entries,
      manualAdjustmentsByEntryId,
    });
  }, [phase5Report, selectedPeriod, manualAdjustmentsByEntryId]);

  const phase5ApprovalBlock = useMemo<string | null>(() => {
    if (!phase5Checklist) return null;
    if (selectedPeriod?.status === "approved" || phase5Checklist.period_already_approved) {
      return null;
    }
    if (selectedPeriod?.status !== "pending") {
      return "Final approval is only available once the period is moved to pending review.";
    }
    if (phase5Checklist.blocking_count > 0) {
      const n = phase5Checklist.blocking_count;
      return `Resolve ${n} blocking checklist item${n === 1 ? "" : "s"} before approval can proceed.`;
    }
    if (!canApproveChecklist(phase5Checklist, checklistAcks)) {
      return "Warnings on the approval checklist must be reviewed and acknowledged before approval.";
    }
    if (!checklistConfirmed) {
      return "The approval confirmation must be ticked on the checklist before approval.";
    }
    return null;
  }, [phase5Checklist, selectedPeriod?.status, checklistAcks, checklistConfirmed]);



  const handleMarkReviewed = (csvName: string) => {
    setReviewedIssueNames(prev => new Set([...prev, csvName]));
  };

  const createEntry = useCreatePayrollEntry();
  const handleAddToPeriod = async (employeeId: string) => {
    if (!selectedPeriod) return;
    const emp = allEmployees.find((e: any) => e.id === employeeId);
    if (!emp) { toast.error("Employee not found"); return; }
    try {
      // Phase 2C — prefer active employment terms as of period start date,
      // fall back to employee profile if no active terms exist.
      const { getEntryDefaultsFromTerms } = await import("@/lib/payroll-rate-source");
      const defaults = await getEntryDefaultsFromTerms(
        (emp as any).tenant_id,
        emp.id,
        selectedPeriod.start_date,
        {
          id: emp.id,
          hourly_rate: emp.hourly_rate,
          service_charge: (emp as any).service_charge,
          department: (emp as any).department,
        },
      );
      await createEntry.mutateAsync({
        payroll_period_id: selectedPeriod.id,
        employee_id: emp.id,
        hourly_rate: defaults.hourly_rate,
        service_charge: defaults.service_charge,
        timesheet_hours: 0,
        performance_bonus: 0,
        special_bonus: 0,
        total_pay: 0,
      } as any);
      toast.success(
        defaults.source === "terms"
          ? `${emp.forename} ${emp.surname} added (rate £${defaults.hourly_rate.toFixed(2)} from active contract terms).`
          : `${emp.forename} ${emp.surname} added (rate £${defaults.hourly_rate.toFixed(2)} from profile — no active contract terms found).`,
      );
    } catch {
      toast.error("Failed to add employee to period");
    }
  };

  const [localExcludedNames, setLocalExcludedNames] = useState<string[]>([]);
  const handleExcludeFromPeriod = (csvName: string) => {
    setLocalExcludedNames(prev => [...prev, csvName]);
    setReviewedIssueNames(prev => new Set([...prev, csvName]));
    toast.success(`${csvName} excluded from this payroll`);
  };

  const allExcludedNames = [...excludedNames, ...localExcludedNames];
  const { data: periodLocationData = [] } = usePayrollEntryLocations(selectedPeriod?.id);
  const approvePeriod = useApprovePayrollPeriod();
  const submitForReview = useSubmitPayrollForReview();
  const reopenPeriod = useReopenPayrollPeriod();
  const deletePeriod = useDeletePayrollPeriod();
  const { isAdmin } = useAuth();
  const canViewPayData = usePermission("view_pay_data");
  const canRevealSensitive = usePermission("reveal_sensitive");
  const { data: payrollPrefs } = useTenantPreferences("payroll_display", PAYROLL_DISPLAY_DEFAULTS);
  const { sendNotification } = useNotifications();
  const { data: companySettings } = useCompanySettings();

  const statusStyles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };

  const statusLabels: Record<string, string> = {
    draft: t("payroll.status_draft"),
    pending: t("payroll.status_pending"),
    approved: t("payroll.status_approved"),
    rejected: t("payroll.status_rejected"),
  };

  const totalPay = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalBonuses = entries.reduce((sum, e: any) => sum + Number(e.performance_bonus) + Number(e.special_bonus), 0);
  const avgRate = entries.length > 0 
    ? entries.reduce((sum, e: any) => sum + Number(e.hourly_rate), 0) / entries.length 
    : 0;
  const zeroHoursCount = entries.filter((e: any) => Number(e.timesheet_hours) === 0).length;

  const rateDiscrepancies = entries.filter((e: any) => {
    const emp = e.employees;
    if (!emp) return false;
    return Number(e.hourly_rate) !== Number(emp.hourly_rate);
  });

  const managementPayroll = entries
    .filter((e: any) => e.employees?.department === "CPU")
    .reduce((sum: number, e: any) => sum + Number(e.total_pay), 0);
  const holidayTotal = holidayPayments.reduce((s: number, p: any) => s + Number(p.total), 0);

  const handleSubmitForReview = async () => {
    if (!selectedPeriod) return;
    if (blockingIssues.length > 0) {
      toast.error("Cannot submit: unresolved blocking issues must be resolved first");
      return;
    }
    if (nmw.summary.hasBlockers) {
      toast.error(
        `Cannot submit: ${nmw.summary.non_compliant} employee(s) below UK minimum wage. Correct with a top-up payment before submitting.`,
      );
      return;
    }
    try {
      await submitForReview.mutateAsync(selectedPeriod.id);
      toast.success(t("payroll.submitted_review"));
      const adminEmail = companySettings?.company_email;
      if (adminEmail) {
        sendNotification({
          to: adminEmail,
          subject: `Payroll Submitted: ${selectedPeriod.period_name}`,
          type: "payroll_reminder",
          data: {
            message: `Payroll "${selectedPeriod.period_name}" has been submitted for review.`,
            period_name: selectedPeriod.period_name,
            pay_date: selectedPeriod.pay_date || "Not set",
          },
        });
      }
    } catch {
      toast.error(t("payroll.failed_submit"));
    }
  };

  const handleApprove = async () => {
    if (!selectedPeriod) return;
    if (blockingIssues.length > 0) {
      toast.error("Cannot approve: unresolved blocking issues must be resolved first");
      return;
    }
    if (nmw.summary.hasBlockers) {
      toast.error(
        `Cannot approve: ${nmw.summary.non_compliant} employee(s) below UK minimum wage. Correct with a top-up payment before approval.`,
      );
      return;
    }
    try {
      await approvePeriod.mutateAsync(selectedPeriod.id);
      // Snapshot the compliance results to the audit table on approval (non-blocking).
      if (nmw.canCheck) {
        recordNmwAudit
          .mutateAsync({ payrollPeriodId: selectedPeriod.id, results: nmw.results })
          .catch((err) => console.error("Failed to record NMW audit", err));
      }
      toast.success(t("payroll.approved_locked"));
      const adminEmail = companySettings?.company_email;
      if (adminEmail) {
        sendNotification({
          to: adminEmail,
          subject: `Payroll Approved: ${selectedPeriod.period_name}`,
          type: "payroll_reminder",
          data: {
            message: `Payroll "${selectedPeriod.period_name}" has been approved and locked.`,
            period_name: selectedPeriod.period_name,
            pay_date: selectedPeriod.pay_date || "Not set",
          },
        });
      }
    } catch {
      toast.error(t("payroll.failed_approve"));
    }
  };


  const handleReopen = async () => {
    if (!selectedPeriod) return;
    try {
      await reopenPeriod.mutateAsync(selectedPeriod.id);
      const existingNotes = selectedPeriod.notes || "";
      const correctionMark = existingNotes.includes("[CORRECTED]")
        ? existingNotes
        : `[CORRECTED] Reopened for correction on ${new Date().toLocaleDateString("en-GB")}. ${existingNotes}`.trim();
      await supabase
        .from("payroll_periods")
        .update({ notes: correctionMark })
        .eq("id", selectedPeriod.id);
      toast.success(t("payroll.reopened_correction"));
    } catch {
      toast.error(t("payroll.failed_reopen"));
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return;
    if (selectedPeriod.status !== "draft") {
      toast.error(t("payroll.only_draft_delete"));
      return;
    }
    try {
      const deletedId = selectedPeriod.id;
      await deletePeriod.mutateAsync(deletedId);
      const remaining = periods.filter(p => p.id !== deletedId);
      setSelectedPeriodId(remaining.length > 0 ? remaining[0].id : null);
      toast.success(t("payroll.deleted_period", { name: selectedPeriod.period_name }));
    } catch {
      toast.error(t("payroll.failed_delete"));
    }
  };

  const handleExport = async (includeBankDetails: boolean) => {
    if (!selectedPeriod || entries.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const hasLocations = periodLocationData.length > 0;

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
          export_type: hasLocations ? "csv_location" : "csv",
        }
      });

      let csv: string;

      if (hasLocations) {
        // Location-split export: one row per employee-location combination
        const splitRows = buildLocationSplitRows(entries as any, periodLocationData);
        const headers = [
          "Employee", "Department", "Employee Status", "Payroll Marker",
          "Location", "Location Hours", "Location Department", "Employee Total Hours",
          "NI Number",
          ...(includeBankDetails ? ["Sort Code", "Account Number"] : []),
          "Hourly Rate", "Service Charge", "Performance Bonus",
          "Special Bonus", "Holiday Accrued", "Total Pay",
        ];
        const rows = splitRows.map((sr) => {
          const emp = sr.entry.employees;
          return [
            `"${emp?.forename} ${emp?.surname}"`, `"${emp?.department || ""}"`,
            `"${emp?.status || ""}"`, emp?.status === "starter" ? '"Starter / First payroll"' : '""',
            `"${sr.locationName}"`, sr.locationHours, `"${sr.locationDepartment || ""}"`, sr.employeeTotalHours,
            `"${emp?.ni_number || ""}"`,
            ...(includeBankDetails ? [`"${(emp as any)?.sort_code || ""}"`, `"${(emp as any)?.bank_account_no || ""}"`] : []),
            sr.entry.hourly_rate, sr.entry.service_charge || 0,
            sr.entry.performance_bonus || 0, sr.entry.special_bonus || 0,
            sr.entry.holiday_accrued_hours || 0, sr.entry.total_pay,
          ].join(",");
        });
        csv = [headers.join(","), ...rows].join("\n");
      } else {
        // Flat employee-level export (existing behaviour)
        const headers = [
          "Employee", "Department", "Employee Status", "Payroll Marker", "NI Number",
          ...(includeBankDetails ? ["Sort Code", "Account Number"] : []),
          "Hourly Rate", "Service Charge", "Hours", "Performance Bonus",
          "Special Bonus", "Holiday Accrued", "Total Pay",
        ];
        const rows = entries.map((entry: any) => {
          const emp = entry.employees;
          return [
            `"${emp?.forename} ${emp?.surname}"`, `"${emp?.department}"`, `"${emp?.status || ""}"`,
            emp?.status === "starter" ? '"Starter / First payroll"' : '""',
            `"${emp?.ni_number || ""}"`,
            ...(includeBankDetails ? [`"${emp?.sort_code || ""}"`, `"${emp?.bank_account_no || ""}"`] : []),
            entry.hourly_rate, entry.service_charge || 0, entry.timesheet_hours,
            entry.performance_bonus || 0, entry.special_bonus || 0,
            entry.holiday_accrued_hours || 0, entry.total_pay,
          ].join(",");
        });
        csv = [headers.join(","), ...rows].join("\n");
      }

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${selectedPeriod.period_name.replace(/\s+/g, "-")}${hasLocations ? "-by-location" : ""}${includeBankDetails ? "-with-bank" : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(includeBankDetails ? t("payroll.exported_with_bank") : t("payroll.exported"));
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("payroll.failed_export"));
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedPeriod || entries.length === 0) return;
    try {
      toast.info(t("payroll.generating_pdf"));
      const holidayPaymentEmployeeIds = new Set(holidayPayments.map((hp: any) => hp.employee_id).filter(Boolean));
      const starterEmployees = allEmployees.filter(emp => {
        const inEntries = entries.some((e: any) => e.employee_id === emp.id);
        const hasHolidayPayment = holidayPaymentEmployeeIds.has(emp.id);
        if (!inEntries && !hasHolidayPayment) return false;
        // Genuine starter: status is starter AND not in a prior payroll period
        const isGenuineStarter = emp.status === 'starter' && !priorPeriodEmployeeIds.has(emp.id);
        // Leaver: status is leaver OR has holiday settlement payment in this period
        const isLeaver = emp.status === 'leaver' || hasHolidayPayment;
        return isGenuineStarter || isLeaver;
      });

      const logoUrl = `${window.location.origin}/logo.jpeg`;
      const blob = await pdf(
        <PayrollPDF
          period={selectedPeriod as any}
          entries={entries as any}
          holidayPayments={holidayPayments as any}
          starters={starterEmployees as any}
          priorPeriodEmployeeIds={priorPeriodEmployeeIds}
          priorEntryRates={priorEntryRates}
          isCorrection={!!selectedPeriod.notes?.includes("[CORRECTED]")}
          correctionNote={selectedPeriod.notes?.includes("[CORRECTED]") ? selectedPeriod.notes : undefined}
          logoUrl={logoUrl}
        />
      ).toBlob();

      const fileName = `payroll-${selectedPeriod.period_name.replace(/\s+/g, "-")}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else if (isMobile) {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "import" as const,
        table_name: "payroll_periods",
        record_id: selectedPeriod.id,
        new_data: { operation: "pdf_export", period_name: selectedPeriod.period_name },
      });
      toast.success(t("payroll.pdf_downloaded"));
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error(t("payroll.failed_pdf"));
    }
  };

  // DEV: assert tenant match on payroll data
  if (entries.length > 0) assertTenantMatch(entries, "payroll_entries");

  if (!tenantReady) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-7xl mx-auto w-full">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 shrink-0">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              {t("payroll.title")}
            </h1>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {selectedPeriod && entries.length > 0 && (
              <>
                <SendPayrollEmailDialog
                  period={selectedPeriod as any}
                  entries={entries as any}
                  holidayPayments={holidayPayments as any}
                  allEmployees={allEmployees as any}
                  priorPeriodEmployeeIds={priorPeriodEmployeeIds}
                  priorEntryRates={priorEntryRates}
                  disabled={!isAdmin}
                />
                <Button variant="outline" size="sm" onClick={() => setReportBuilderOpen(true)} className="h-8 px-2.5 sm:px-3 text-xs">
                  <FileDown className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <PayrollNavStrip />

        {/* Main Payroll Content */}
        <div className="space-y-4 sm:space-y-6">
            {/* Admin actions — gated by permission */}
            {canViewPayData && isAdmin && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <SettleLeaverDialog />
                <AddHolidayPaymentDialog />
                <CreatePayrollDialog />
                <ImportPayrollDialog selectedPeriod={selectedPeriod} />
              </div>
            )}

            {/* Period subtitle */}
            {selectedPeriod && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {selectedPeriod.period_name} • {new Date(selectedPeriod.start_date).toLocaleDateString()} – {new Date(selectedPeriod.end_date).toLocaleDateString()}
              </p>
            )}

            {/* Source / original timesheet download */}
            {selectedPeriod && <PayrollSourceInfo periodId={selectedPeriod.id} />}

        {/* Period Selector */}
        {periods.length > 0 && (
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible">
              {periods.slice(0, 6).map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                  className={cn(
                    "flex items-center gap-1.5 shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[36px]",
                    selectedPeriod?.id === period.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-card-foreground border-border/60 hover:bg-muted/50"
                  )}
                >
                  <span className="truncate max-w-[120px]">{period.period_name}</span>
                  <span className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                    statusStyles[period.status]
                  )}>
                    {statusLabels[period.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <SensitiveSection
          sectionKey="payroll-stats-overview"
          category="payroll_summary"
          title={t("payroll.payroll_summary")}
        >
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            <StatCard
              title={t("payroll.total_payroll")}
              value={formatCurrency(totalPay)}
              subtitle={t("payroll.employees_count", { count: entries.length })}
              icon={<DollarSign className="h-5 w-5" />}
              variant="primary"
            />
            <StatCard
              title={t("payroll.total_hours")}
              value={formatHours(totalHours)}
              subtitle={t("payroll.timesheet_hours_label")}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title={t("payroll.avg_rate")}
              value={formatCurrency(avgRate)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              title={t("payroll.bonuses")}
              value={formatCurrency(totalBonuses)}
              subtitle={t("payroll.perf_special")}
              icon={<DollarSign className="h-5 w-5" />}
              variant="success"
            />
          </div>
        </SensitiveSection>

        {/* Payroll Reminders */}
        {selectedPeriod && <PayrollReminders periodId={selectedPeriod.id} />}

        {/* Missing Employee Info for Payroll */}
        {selectedPeriod && entries.length > 0 && (
          <PayrollMissingInfo
            entries={entries}
            periodName={selectedPeriod.period_name}
          />
        )}

        {/* Unresolved Import Issues Panel */}
        {selectedPeriod && (unresolvedIssues.length > 0 || allExcludedNames.length > 0) && (
          <UnresolvedIssuesPanel
            issues={unresolvedIssues}
            excludedNames={allExcludedNames}
            reviewedNames={reviewedIssueNames}
            onMarkReviewed={handleMarkReviewed}
            onAddToPeriod={handleAddToPeriod}
            onExclude={handleExcludeFromPeriod}
          />
        )}

        {/* Period-Specific Internal Notes */}
        {selectedPeriod && entries.length > 0 && (
          <PayrollPeriodNotesSection
            periodId={selectedPeriod.id}
            periodName={selectedPeriod.period_name}
            employees={entries.map((e: any) => ({
              id: e.employee_id,
              name: `${e.employees?.forename} ${e.employees?.surname}`,
            }))}
            isAdmin={isAdmin}
          />
        )}

        {/* UK Minimum Wage compliance — authoritative, period-based */}
        {selectedPeriod && entries.length > 0 && (
          <MinimumWageCompliancePanel
            results={nmw.results}
            summary={nmw.summary}
            canCheck={nmw.canCheck}
            termsByEmployee={Object.fromEntries(
              termsComparison.rows.map((r) => [r.employee_id, r.terms])
            )}
          />
        )}

        {/* Phase 2B — Employment Terms comparison (read-only, advisory) */}
        {selectedPeriod && entries.length > 0 && (
          <EmploymentTermsComparisonPanel
            rows={termsComparison.rows}
            summary={termsComparison.summary}
            canCheck={termsComparison.canCheck}
            periodStartDate={selectedPeriod.start_date}
            payrollPeriodId={selectedPeriod.id}
            periodStatus={selectedPeriod.status}
          />
        )}

        {/* Phase 5A — Approval readiness checklist (read-only gate) */}
        {selectedPeriod && phase5Report && (
          <PayrollApprovalChecklist
            period_status={selectedPeriod.status}
            entries={phase5Report.entries}
            manualAdjustmentsByEntryId={manualAdjustmentsByEntryId}
            // TODO: replace isAdmin with payroll-authorised permission when role model supports it.
            canApproveRole={isAdmin}
            isApproving={approvePeriod.isPending}
            onApproveRequested={handleApprove}
            acknowledged={checklistAcks}
            onAcknowledgedChange={setChecklistAcks}
            confirmed={checklistConfirmed}
            onConfirmedChange={setChecklistConfirmed}
          />
        )}

        {/* Phase 5C — Read-only approval evidence snapshot */}
        {selectedPeriod && phase5Checklist && (
          <PayrollApprovalEvidence
            period={selectedPeriod}
            entryCount={entries.length}
            checklist={phase5Checklist}
            acknowledgedIds={checklistAcks}
            confirmed={checklistConfirmed}
            approvalBlock={phase5ApprovalBlock}
          />
        )}


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
            unresolvedImportIssues={blockingIssues}
            excludedNames={allExcludedNames}
            externalApprovalBlock={phase5ApprovalBlock}
          />
        )}

        {/* Holiday Pay Section */}
        {selectedPeriod && (
          <PayrollHolidaySection
            periodId={selectedPeriod.id}
            periodStatus={selectedPeriod.status}
            holidayPayments={holidayPayments as any}
            isAdmin={isAdmin}
          />
        )}

        {/* Sales & Labour Analytics */}
        {selectedPeriod && entries.length > 0 && (
          <PayrollSalesInput
            periodId={selectedPeriod.id}
            periodStatus={selectedPeriod.status}
            currentSalesTotal={selectedPeriod.sales_total}
            totalPayroll={totalPay}
            managementPayroll={managementPayroll}
            isAdmin={isAdmin}
          />
        )}

        {/* Inline Period Analytics */}
        {selectedPeriod && entries.length > 0 && (
          <PayrollInlineAnalytics
            currentPeriodId={selectedPeriod.id}
            entries={entries}
            holidayPayments={holidayPayments as any}
          />
        )}

        {/* Rate Discrepancy Warning */}
        {rateDiscrepancies.length > 0 && (
          <SensitiveSection
            sectionKey="payroll-rate-discrepancies"
            category="compensation"
            title={t("payroll.rate_change")}
          >
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 sm:p-4 animate-fade-in">
              <div className="flex items-start gap-2.5 mb-2">
                <Badge className="bg-warning text-warning-foreground text-[10px] shrink-0">{t("payroll.rate_change")}</Badge>
                <p className="font-medium text-card-foreground text-xs sm:text-sm">
                  {t("payroll.rate_differences", { count: rateDiscrepancies.length })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rateDiscrepancies.slice(0, 5).map((e: any) => (
                  <Badge key={e.id} variant="outline" className="text-[10px] sm:text-xs">
                    {e.employees?.forename}: {formatCurrency(Number(e.hourly_rate))} → {formatCurrency(Number(e.employees?.hourly_rate))}
                  </Badge>
                ))}
              </div>
            </div>
          </SensitiveSection>
        )}

        {/* Loading State */}
        {(loadingPeriods || loadingEntries) && (
          <div className="rounded-xl bg-card shadow-card p-8 text-center">
            <p className="text-muted-foreground">{t("payroll.loading")}</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingPeriods && periods.length === 0 && (
          <div>
            <EmptyState
              icon={FileText}
              title="No payroll periods yet"
              description={isAdmin
                ? "Create your first payroll period to start tracking staff pay, hours, and deductions. Each period represents one pay cycle."
                : "No payroll periods have been created yet. Your admin will set these up."}
              hint={isAdmin ? "Payroll periods lock automatically after approval to protect data integrity." : undefined}
              secondaryLabel={isAdmin ? "Configure Pay Settings" : undefined}
              secondaryHref={isAdmin ? "/settings?group=payroll&section=pay-settings" : undefined}
            />
            {isAdmin && (
              <div className="flex justify-center -mt-2 mb-4">
                <CreatePayrollDialog />
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
            showBonusColumn={payrollPrefs?.showBonusColumn !== false}
            showServiceCharge={payrollPrefs?.showServiceCharge !== false}
            priorPeriodEmployeeIds={priorPeriodEmployeeIds}
          />
        )}

        {/* Report Builder Modal */}
        {selectedPeriod && (
          <PayrollReportBuilder
            open={reportBuilderOpen}
            onOpenChange={setReportBuilderOpen}
            period={selectedPeriod}
            entries={entries as any}
            holidayPayments={holidayPayments as any}
            allEmployees={allEmployees}
            priorPeriodEmployeeIds={priorPeriodEmployeeIds}
            priorEntryRates={priorEntryRates}
            companyName={companySettings?.company_name}
          />
        )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Payroll;
