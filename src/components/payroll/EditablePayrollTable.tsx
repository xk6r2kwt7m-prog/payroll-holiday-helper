import { useState, useMemo } from "react";
import { Edit2, Save, X, Download, CopyCheck, ArrowDown, Loader2, UserMinus, UserPlus, FileText, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdjustmentHistoryDrawer } from "./AdjustmentHistoryDrawer";
import { useCreatePayrollAdjustment, usePayrollAdjustments, usePriorPeriodAdjustments } from "@/hooks/usePayrollAdjustments";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useBulkUpdatePayrollEntries, useMarkBankDetailsExported } from "@/hooks/usePayroll";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { useLeaveRules, calculateAccrual } from "@/hooks/useLeaveRules";
import { cn } from "@/lib/utils";
import { AddEmployeeToPeriodDialog } from "./AddEmployeeToPeriodDialog";
import { supabase } from "@/integrations/supabase/client";
import { LocationSplitPopover } from "./LocationSplitPopover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

interface PayrollEntry {
  id: string;
  employee_id: string;
  hourly_rate: number;
  service_charge: number | null;
  timesheet_hours: number;
  imported_hours: number | null;
  adjustment_note: string | null;
  performance_bonus: number | null;
  special_bonus: number | null;
  holiday_accrued_hours: number | null;
  total_pay: number;
  bank_details_exported: boolean | null;
  employees: {
    id: string;
    forename: string;
    surname: string;
    department: string;
    status: string;
    hourly_rate: number;
    service_charge: number | null;
    bank_account_no: string | null;
    sort_code: string | null;
    ni_number: string | null;
  } | null;
}

interface EditablePayrollTableProps {
  entries: PayrollEntry[];
  periodId: string;
  periodStatus: string;
  isAdmin: boolean;
  onExport: (includeBank: boolean) => void;
  showBonusColumn?: boolean;
  showServiceCharge?: boolean;
  /** Employee IDs that appeared in a prior payroll period (used to suppress "Starter" badge) */
  priorPeriodEmployeeIds?: Set<string>;
}

interface EditingEntry {
  timesheet_hours: string;
  performance_bonus: string;
  special_bonus: string;
  hourly_rate: string;
  service_charge: string;
}

export function EditablePayrollTable({ 
  entries, 
  periodId, 
  periodStatus, 
  isAdmin,
  onExport,
  showBonusColumn = true,
  showServiceCharge = true,
  priorPeriodEmployeeIds = new Set(),
}: EditablePayrollTableProps) {
  const { tenantId } = useTenant();
  const { data: leaveRules } = useLeaveRules();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingEntry>({
    timesheet_hours: "",
    performance_bonus: "",
    special_bonus: "",
    hourly_rate: "",
    service_charge: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [removeEntryId, setRemoveEntryId] = useState<string | null>(null);
  const [removeEmployeeName, setRemoveEmployeeName] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "alphabetical" | "department" | "status" | "hours_desc" | "hours_asc">("default");

  // Adjustment note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ entry: PayrollEntry; hours: number; hourlyRate: number; serviceCharge: number; perfBonus: number; specBonus: number } | null>(null);
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const queryClient = useQueryClient();
  const createAdjustment = useCreatePayrollAdjustment();
  const { data: periodAdjustments = [] } = usePayrollAdjustments(periodId);
  // Set of employee IDs that have adjustments in this period
  const adjustedEmployeeIds = new Set(periodAdjustments.map(a => a.employee_id));
  const bulkUpdate = useBulkUpdatePayrollEntries();
  const markExported = useMarkBankDetailsExported();
  
  const existingEmployeeIds = entries.map(e => e.employee_id);

  const DEPT_ORDER: Record<string, number> = { FOH: 0, BOH: 1, CPU: 2 };
  const STATUS_ORDER: Record<string, number> = { active: 0, starter: 1, leaver: 2 };

  const sortedEntries = useMemo(() => {
    const sorted = [...entries];
    switch (sortMode) {
      case "alphabetical":
        return sorted.sort((a, b) => {
          const sA = a.employees?.surname?.toLowerCase() ?? "";
          const sB = b.employees?.surname?.toLowerCase() ?? "";
          if (sA !== sB) return sA.localeCompare(sB);
          return (a.employees?.forename?.toLowerCase() ?? "").localeCompare(b.employees?.forename?.toLowerCase() ?? "");
        });
      case "department":
        return sorted.sort((a, b) => {
          const dA = a.employees?.department ?? "";
          const dB = b.employees?.department ?? "";
          const oA = DEPT_ORDER[dA] ?? 99;
          const oB = DEPT_ORDER[dB] ?? 99;
          if (oA !== oB) return oA - oB;
          return dA.localeCompare(dB);
        });
      case "status":
        return sorted.sort((a, b) => {
          const sA = STATUS_ORDER[a.employees?.status ?? "active"] ?? 99;
          const sB = STATUS_ORDER[b.employees?.status ?? "active"] ?? 99;
          return sA - sB;
        });
      case "hours_desc":
        return sorted.sort((a, b) => b.timesheet_hours - a.timesheet_hours);
      case "hours_asc":
        return sorted.sort((a, b) => a.timesheet_hours - b.timesheet_hours);
      default:
        return sorted;
    }
  }, [entries, sortMode]);
  const handleRemoveFromPeriod = async () => {
    if (!removeEntryId) return;
    try {
      const { error } = await supabase
        .from("payroll_entries")
        .delete()
        .eq("id", removeEntryId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      toast.success(`${removeEmployeeName} removed from this payroll period`);
    } catch {
      toast.error("Failed to remove employee");
    } finally {
      setRemoveEntryId(null);
      setRemoveEmployeeName("");
    }
  };

  const canEdit = (periodStatus === "draft") && isAdmin;
  const allSelected = entries.length > 0 && entries.every(e => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const startEditing = (entry: PayrollEntry) => {
    setEditingId(entry.id);
    setEditingData({
      timesheet_hours: entry.timesheet_hours.toString(),
      performance_bonus: (entry.performance_bonus || 0).toString(),
      special_bonus: (entry.special_bonus || 0).toString(),
      hourly_rate: entry.hourly_rate.toString(),
      service_charge: (entry.service_charge || 0).toString(),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const doSave = async (entry: PayrollEntry, hours: number, hourlyRate: number, serviceCharge: number, perfBonus: number, specBonus: number, note?: string) => {
    const basePay = hours * hourlyRate;
    const servicePay = hours * serviceCharge;
    const totalPay = basePay + servicePay + perfBonus + specBonus;
    // Holiday accrual uses imported_hours (original) when available
    // Uses tenant-resolved accrual rate (falls through to country default)
    const hoursForHoliday = entry.imported_hours ?? hours;
    const holidayAccrued = calculateAccrual(hoursForHoliday, leaveRules?.accrualRate ?? 0.1207, leaveRules?.roundingPrecision);

    try {
      const updates: Record<string, any> = {
        timesheet_hours: hours,
        hourly_rate: hourlyRate,
        service_charge: serviceCharge,
        performance_bonus: perfBonus,
        special_bonus: specBonus,
        holiday_accrued_hours: holidayAccrued,
        total_pay: totalPay,
      };

      // If hours differ from imported, store the note
      if (note !== undefined) {
        updates.adjustment_note = note;
      }

      await bulkUpdate.mutateAsync([{ id: entry.id, updates }]);

      // Sync rate/service charge changes back to employee master record
      const emp = entry.employees;
      if (emp) {
        const oldRate = Number(emp.hourly_rate);
        const oldService = Number(emp.service_charge || 0);
        const rateChanged = Math.abs(hourlyRate - oldRate) > 0.001;
        const serviceChanged = Math.abs(serviceCharge - oldService) > 0.001;

        if (rateChanged || serviceChanged) {
          // Update the employee master record
          const empUpdates: Record<string, any> = {};
          if (rateChanged) empUpdates.hourly_rate = hourlyRate;
          if (serviceChanged) empUpdates.service_charge = serviceCharge;

          await supabase
            .from("employees")
            .update(empUpdates)
            .eq("id", entry.employee_id);

          // Log each change in employee_changes for audit trail
          const changeLogs = [];
          if (rateChanged) {
            changeLogs.push({
              employee_id: entry.employee_id,
              change_type: "update",
              field_name: "hourly_rate",
              old_value: oldRate.toString(),
              new_value: hourlyRate.toString(),
              notes: `Updated via payroll (period: ${periodId})`,
            });
          }
          if (serviceChanged) {
            changeLogs.push({
              employee_id: entry.employee_id,
              change_type: "update",
              field_name: "service_charge",
              old_value: oldService.toString(),
              new_value: serviceCharge.toString(),
              notes: `Updated via payroll (period: ${periodId})`,
            });
          }
          if (changeLogs.length > 0) {
            await supabase.from("employee_changes").insert(changeLogs as any);
          }

          // Invalidate employee queries so UI reflects new rates
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      }
      
      setEditingId(null);
      toast.success("Entry updated");
    } catch {
      toast.error("Failed to update entry");
    }
  };

  const saveEditing = async (entry: PayrollEntry) => {
    const hours = parseFloat(editingData.timesheet_hours) || 0;
    const hourlyRate = parseFloat(editingData.hourly_rate) || 0;
    const serviceCharge = parseFloat(editingData.service_charge) || 0;
    const perfBonus = parseFloat(editingData.performance_bonus) || 0;
    const specBonus = parseFloat(editingData.special_bonus) || 0;

    const importedHours = entry.imported_hours;
    const hoursChanged = importedHours !== null && Math.abs(hours - importedHours) > 0.001;
    const emp = entry.employees;
    const rateChanged = emp && Math.abs(hourlyRate - Number(emp.hourly_rate)) > 0.001;
    const serviceChanged = emp && Math.abs(serviceCharge - Number(emp.service_charge || 0)) > 0.001;

    if (hoursChanged || rateChanged || serviceChanged) {
      // Build description of what changed
      const changes: string[] = [];
      if (hoursChanged) changes.push(`Hours: ${formatHours(importedHours!)} → ${formatHours(hours)}`);
      if (rateChanged) changes.push(`Rate: ${formatCurrency(Number(emp!.hourly_rate))} → ${formatCurrency(hourlyRate)}`);
      if (serviceChanged) changes.push(`Service: ${formatCurrency(Number(emp!.service_charge || 0))} → ${formatCurrency(serviceCharge)}`);
      
      setPendingSave({ entry, hours, hourlyRate, serviceCharge, perfBonus, specBonus });
      setAdjustmentNote(entry.adjustment_note || changes.join("; "));
      setNoteDialogOpen(true);
    } else {
      // No change from master — clear any previous note if everything matches
      await doSave(entry, hours, hourlyRate, serviceCharge, perfBonus, specBonus, 
        importedHours !== null && Math.abs(hours - importedHours) < 0.001 ? null as any : undefined);
    }
  };

  const confirmAdjustmentNote = async () => {
    if (!pendingSave) return;
    const { entry, hours, hourlyRate, serviceCharge, perfBonus, specBonus } = pendingSave;
    setNoteDialogOpen(false);

    // Record structured adjustment audit entries
    const adjustmentRows: {
      payroll_period_id: string;
      payroll_entry_id: string;
      employee_id: string;
      field_name: string;
      old_value: number | null;
      new_value: number | null;
      note?: string;
    }[] = [];

    const emp = entry.employees;
    const importedHours = entry.imported_hours;

    if (importedHours !== null && Math.abs(hours - importedHours) > 0.001) {
      adjustmentRows.push({
        payroll_period_id: periodId,
        payroll_entry_id: entry.id,
        employee_id: entry.employee_id,
        field_name: "timesheet_hours",
        old_value: importedHours,
        new_value: hours,
        note: adjustmentNote || "Manual adjustment",
      });
    }
    if (emp && Math.abs(hourlyRate - Number(emp.hourly_rate)) > 0.001) {
      adjustmentRows.push({
        payroll_period_id: periodId,
        payroll_entry_id: entry.id,
        employee_id: entry.employee_id,
        field_name: "hourly_rate",
        old_value: Number(emp.hourly_rate),
        new_value: hourlyRate,
        note: adjustmentNote || "Manual adjustment",
      });
    }
    if (emp && Math.abs(serviceCharge - Number(emp.service_charge || 0)) > 0.001) {
      adjustmentRows.push({
        payroll_period_id: periodId,
        payroll_entry_id: entry.id,
        employee_id: entry.employee_id,
        field_name: "service_charge",
        old_value: Number(emp.service_charge || 0),
        new_value: serviceCharge,
        note: adjustmentNote || "Manual adjustment",
      });
    }
    if (Math.abs(perfBonus - Number(entry.performance_bonus || 0)) > 0.001) {
      adjustmentRows.push({
        payroll_period_id: periodId,
        payroll_entry_id: entry.id,
        employee_id: entry.employee_id,
        field_name: "performance_bonus",
        old_value: Number(entry.performance_bonus || 0),
        new_value: perfBonus,
        note: adjustmentNote || "Manual adjustment",
      });
    }
    if (Math.abs(specBonus - Number(entry.special_bonus || 0)) > 0.001) {
      adjustmentRows.push({
        payroll_period_id: periodId,
        payroll_entry_id: entry.id,
        employee_id: entry.employee_id,
        field_name: "special_bonus",
        old_value: Number(entry.special_bonus || 0),
        new_value: specBonus,
        note: adjustmentNote || "Manual adjustment",
      });
    }

    if (adjustmentRows.length > 0) {
      try {
        await createAdjustment.mutateAsync(adjustmentRows);
      } catch {
        // Non-fatal: adjustment audit is supplementary
        console.error("Failed to record adjustment audit");
      }
    }

    await doSave(entry, hours, hourlyRate, serviceCharge, perfBonus, specBonus, adjustmentNote || "Manual adjustment");
    setPendingSave(null);
    setAdjustmentNote("");
  };

  const handleBulkZeroHours = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const updates = entries
        .filter(e => selectedIds.has(e.id))
        .map(entry => {
          const perfBonus = entry.performance_bonus || 0;
          const specBonus = entry.special_bonus || 0;
          const totalPay = perfBonus + specBonus;
          
          return {
            id: entry.id,
            updates: {
              timesheet_hours: 0,
              holiday_accrued_hours: calculateAccrual(entry.imported_hours ?? 0, leaveRules?.accrualRate ?? 0.1207, leaveRules?.roundingPrecision),
              total_pay: totalPay,
            },
          };
        });
      
      await bulkUpdate.mutateAsync(updates);
      toast.success(`Set ${selectedIds.size} entries to 0 hours`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to update entries");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkCopyRates = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const updates = entries
        .filter(e => selectedIds.has(e.id))
        .map(entry => {
          const emp = entry.employees;
          const hourlyRate = emp?.hourly_rate || entry.hourly_rate;
          const serviceCharge = emp?.service_charge || entry.service_charge || 0;
          const hours = entry.timesheet_hours;
          const perfBonus = entry.performance_bonus || 0;
          const specBonus = entry.special_bonus || 0;
          const basePay = hours * hourlyRate;
          const servicePay = hours * serviceCharge;
          const totalPay = basePay + servicePay + perfBonus + specBonus;
          
          return {
            id: entry.id,
            updates: {
              hourly_rate: hourlyRate,
              service_charge: serviceCharge,
              total_pay: totalPay,
            },
          };
        });
      
      await bulkUpdate.mutateAsync(updates);
      toast.success(`Copied employee rates to ${selectedIds.size} entries`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to update entries");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportWithBank = async () => {
    const unexportedIds = entries
      .filter(e => !e.bank_details_exported && e.employees?.bank_account_no)
      .map(e => e.id);
    
    if (unexportedIds.length > 0) {
      await markExported.mutateAsync(unexportedIds);
    }
    
    onExport(true);
  };

  const totals = entries.reduce((acc, e) => ({
    hours: acc.hours + Number(e.timesheet_hours),
    bonuses: acc.bonuses + Number(e.performance_bonus || 0) + Number(e.special_bonus || 0),
    holiday: acc.holiday + Number(e.holiday_accrued_hours || 0),
    total: acc.total + Number(e.total_pay),
  }), { hours: 0, bonuses: 0, holiday: 0, total: 0 });

  const hasUnexportedBankDetails = entries.some(e => !e.bank_details_exported && e.employees?.bank_account_no);

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-card-foreground">Payroll Details</h3>
            <p className="text-xs text-muted-foreground">
              {canEdit ? "Tap edit to modify" : "View hours and payments"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {canEdit && (
            <AddEmployeeToPeriodDialog periodId={periodId} existingEmployeeIds={existingEmployeeIds} />
          )}
          {canEdit && someSelected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" disabled={isBulkUpdating} className="h-8 text-xs">
                  {isBulkUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CopyCheck className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Bulk ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleBulkZeroHours}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Set Hours to 0
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkCopyRates}>
                  <CopyCheck className="h-4 w-4 mr-2" />
                  Copy Rates from Employee
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button variant="outline" size="sm" onClick={() => onExport(false)} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          {hasUnexportedBankDetails && (
            <Button variant="default" size="sm" onClick={handleExportWithBank} className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              + Bank
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {canEdit && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[200px]">Employee</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Service</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Perf Bonus</TableHead>
              <TableHead className="text-right">Spec Bonus</TableHead>
              <TableHead className="text-right">Holiday Accrued</TableHead>
              <TableHead className="text-right">Total Pay</TableHead>
              {canEdit && <TableHead className="w-[100px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isEditing = editingId === entry.id;
              const emp = entry.employees;
              const isSelected = selectedIds.has(entry.id);
              const hasAdjustment = entry.imported_hours !== null && Math.abs(entry.timesheet_hours - entry.imported_hours) > 0.001;
              
              return (
                <TableRow 
                  key={entry.id} 
                  className={cn(
                    isEditing && "bg-primary/5",
                    isSelected && "bg-primary/10",
                    "cursor-pointer hover:bg-muted/50 transition-colors"
                  )}
                  onClick={canEdit && !isEditing ? () => toggleSelect(entry.id) : undefined}
                >
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(entry.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {emp?.forename?.[0]}{emp?.surname?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-card-foreground">
                          {emp?.forename} {emp?.surname}
                        </span>
                        {emp?.status === "starter" && !priorPeriodEmployeeIds?.has(entry.employee_id) && (
                          <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary/20">
                            Starter
                          </Badge>
                        )}
                        <AdjustmentHistoryDrawer
                          periodId={periodId}
                          employeeId={entry.employee_id}
                          employeeName={`${emp?.forename} ${emp?.surname}`}
                          hasAdjustments={adjustedEmployeeIds.has(entry.employee_id) || (entry.imported_hours !== null && Math.abs(entry.timesheet_hours - entry.imported_hours) > 0.001)}
                        />
                        <PriorAdjustmentReminder periodId={periodId} employeeId={entry.employee_id} />
                        <LocationSplitPopover
                          periodId={periodId}
                          employeeId={entry.employee_id}
                          employeeName={`${emp?.forename} ${emp?.surname}`}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {emp?.department}
                    </Badge>
                  </TableCell>
                  
                  {isEditing ? (
                    <>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.hourly_rate}
                          onChange={(e) => setEditingData({ ...editingData, hourly_rate: e.target.value })}
                          className="w-20 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.service_charge}
                          onChange={(e) => setEditingData({ ...editingData, service_charge: e.target.value })}
                          className="w-20 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.timesheet_hours}
                          onChange={(e) => setEditingData({ ...editingData, timesheet_hours: e.target.value })}
                          className="w-24 h-8 text-right"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.performance_bonus}
                          onChange={(e) => setEditingData({ ...editingData, performance_bonus: e.target.value })}
                          className="w-20 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData.special_bonus}
                          onChange={(e) => setEditingData({ ...editingData, special_bonus: e.target.value })}
                          className="w-20 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatHours(calculateAccrual(entry.imported_hours ?? (parseFloat(editingData.timesheet_hours) || 0), leaveRules?.accrualRate ?? 0.1207, leaveRules?.roundingPrecision))} hrs
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          ((parseFloat(editingData.timesheet_hours) || 0) * (parseFloat(editingData.hourly_rate) || 0)) +
                          ((parseFloat(editingData.timesheet_hours) || 0) * (parseFloat(editingData.service_charge) || 0)) +
                          (parseFloat(editingData.performance_bonus) || 0) +
                          (parseFloat(editingData.special_bonus) || 0)
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-success"
                            onClick={() => saveEditing(entry)}
                            disabled={bulkUpdate.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            {formatCurrency(Number(entry.hourly_rate))}
                            {emp && Number(entry.hourly_rate) !== Number(emp.hourly_rate) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="h-3.5 w-3.5 text-warning shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="text-xs font-medium">Rate changed from {formatCurrency(Number(emp.hourly_rate))}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Employee master rate: {formatCurrency(Number(emp.hourly_rate))}</p>
                                  {entry.adjustment_note && (
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.adjustment_note}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            {formatCurrency(Number(entry.service_charge || 0))}
                            {emp && Number(entry.service_charge || 0) !== Number(emp.service_charge || 0) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="h-3.5 w-3.5 text-warning shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="text-xs font-medium">Service charge changed from {formatCurrency(Number(emp.service_charge || 0))}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Employee master rate: {formatCurrency(Number(emp.service_charge || 0))}</p>
                                  {entry.adjustment_note && (
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.adjustment_note}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            {formatHours(Number(entry.timesheet_hours))}
                            {hasAdjustment && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="h-3.5 w-3.5 text-warning shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="text-xs font-medium">Adjusted from {formatHours(entry.imported_hours!)} hrs</p>
                                  {entry.adjustment_note && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{entry.adjustment_note}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {Number(entry.performance_bonus) > 0 ? formatCurrency(Number(entry.performance_bonus)) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-accent">
                        {Number(entry.special_bonus) > 0 ? formatCurrency(Number(entry.special_bonus)) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatHours(Number(entry.holiday_accrued_hours || 0))} hrs
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(entry.total_pay))}
                      </TableCell>
                      {canEdit && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEditing(entry)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setRemoveEntryId(entry.id);
                                setRemoveEmployeeName(`${emp?.forename} ${emp?.surname}`);
                              }}
                              title="Remove from period"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
          <tfoot>
            <TableRow className="border-t-2 border-border bg-muted/50">
              {canEdit && <TableCell />}
              <TableCell colSpan={4} className="font-semibold">TOTAL</TableCell>
              <TableCell className="text-right font-semibold">{formatHours(totals.hours)}</TableCell>
              <TableCell colSpan={2} className="text-right font-semibold text-success">
                {formatCurrency(totals.bonuses)}
              </TableCell>
              <TableCell className="text-right font-semibold text-accent">
                {formatHours(totals.holiday)} hrs
              </TableCell>
              <TableCell className="text-right font-bold text-primary">
                {formatCurrency(totals.total)}
              </TableCell>
              {canEdit && <TableCell />}
            </TableRow>
          </tfoot>
        </Table>
      </div>

      {/* Adjustment Note Dialog — internal only, never exported */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setNoteDialogOpen(false);
          setPendingSave(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">Payroll Adjustment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Values have been changed from the original/master record.
              Add an internal note — this will <strong>not</strong> appear in exports or PDFs.
            </p>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Special arrangement — agreed extra hours"
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNoteDialogOpen(false); setPendingSave(null); }}>
              Cancel
            </Button>
            <Button onClick={confirmAdjustmentNote}>
              Save with Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeEntryId} onOpenChange={(open) => !open && setRemoveEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeEmployeeName} from this period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the employee's payroll entry from this period. If they are a leaver, they will not appear in subsequent periods when copying. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromPeriod}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Inline prior-period adjustment reminder — manager-only, never exported */
function PriorAdjustmentReminder({ periodId, employeeId }: { periodId: string; employeeId: string }) {
  const { data: priorAdj = [] } = usePriorPeriodAdjustments(employeeId, periodId);
  const [showPrior, setShowPrior] = useState(false);

  if (priorAdj.length === 0) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowPrior(!showPrior); }}
        className="inline-flex items-center gap-1 ml-1"
        title="Prior period had manual adjustments"
      >
        <Badge variant="outline" className="text-[10px] h-5 bg-muted text-muted-foreground border-border hover:bg-muted/80 cursor-pointer">
          <AlertTriangle className="h-3 w-3 mr-0.5" />
          Prior adj.
        </Badge>
      </button>
      {showPrior && (
        <div className="mt-1 ml-1 rounded border border-border bg-muted/30 p-2 text-[10px] space-y-0.5 max-w-[260px]">
          <p className="font-medium text-muted-foreground">Last payroll included manual adjustments:</p>
          {priorAdj.slice(0, 5).map(a => (
            <p key={a.id} className="text-muted-foreground">
              {a.field_name}: {a.old_value ?? "—"} → {a.new_value ?? "—"}
              {a.note && <span className="italic ml-1">({a.note})</span>}
            </p>
          ))}
          {priorAdj.length > 5 && <p className="text-muted-foreground">...and {priorAdj.length - 5} more</p>}
        </div>
      )}
    </>
  );
}
