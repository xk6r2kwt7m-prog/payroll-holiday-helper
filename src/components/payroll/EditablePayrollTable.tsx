import { useState } from "react";
import { Edit2, Save, X, Download, CopyCheck, ArrowDown, Loader2, UserMinus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useBulkUpdatePayrollEntries, useMarkBankDetailsExported } from "@/hooks/usePayroll";
import { formatCurrency, formatHours, calculateHolidayAccrual } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";
import { AddEmployeeToPeriodDialog } from "./AddEmployeeToPeriodDialog";
import { supabase } from "@/integrations/supabase/client";
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
  onExport 
}: EditablePayrollTableProps) {
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

  const queryClient = useQueryClient();
  const bulkUpdate = useBulkUpdatePayrollEntries();
  const markExported = useMarkBankDetailsExported();
  
  const existingEmployeeIds = entries.map(e => e.employee_id);

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

  const saveEditing = async (entry: PayrollEntry) => {
    const hours = parseFloat(editingData.timesheet_hours) || 0;
    const hourlyRate = parseFloat(editingData.hourly_rate) || 0;
    const serviceCharge = parseFloat(editingData.service_charge) || 0;
    const perfBonus = parseFloat(editingData.performance_bonus) || 0;
    const specBonus = parseFloat(editingData.special_bonus) || 0;
    
    const basePay = hours * hourlyRate;
    const servicePay = hours * serviceCharge;
    const totalPay = basePay + servicePay + perfBonus + specBonus;
    const holidayAccrued = calculateHolidayAccrual(hours);

    try {
      await bulkUpdate.mutateAsync([{
        id: entry.id,
        updates: {
          timesheet_hours: hours,
          hourly_rate: hourlyRate,
          service_charge: serviceCharge,
          performance_bonus: perfBonus,
          special_bonus: specBonus,
          holiday_accrued_hours: holidayAccrued,
          total_pay: totalPay,
        },
      }]);
      
      setEditingId(null);
      toast.success("Entry updated");
    } catch {
      toast.error("Failed to update entry");
    }
  };

  const handleBulkZeroHours = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const updates = entries
        .filter(e => selectedIds.has(e.id))
        .map(entry => {
          const hourlyRate = entry.hourly_rate;
          const serviceCharge = entry.service_charge || 0;
          const perfBonus = entry.performance_bonus || 0;
          const specBonus = entry.special_bonus || 0;
          const totalPay = perfBonus + specBonus;
          
          return {
            id: entry.id,
            updates: {
              timesheet_hours: 0,
              holiday_accrued_hours: 0,
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
      <div className="border-b border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Payroll Details</h3>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Click edit to modify hours and bonuses" : "View timesheet hours and payments"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <AddEmployeeToPeriodDialog periodId={periodId} existingEmployeeIds={existingEmployeeIds} />
          )}
          {/* Bulk Actions */}
          {canEdit && someSelected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" disabled={isBulkUpdating}>
                  {isBulkUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CopyCheck className="h-4 w-4 mr-2" />
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
          
          <Button variant="outline" size="sm" onClick={() => onExport(false)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {hasUnexportedBankDetails && (
            <Button variant="default" size="sm" onClick={handleExportWithBank}>
              <Download className="h-4 w-4 mr-2" />
              Export with Bank Details
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
                        {!entry.bank_details_exported && emp?.bank_account_no && (
                          <Badge variant="outline" className="ml-2 text-xs bg-warning/10 text-warning border-warning/20">
                            New
                          </Badge>
                        )}
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
                        {formatHours(calculateHolidayAccrual(parseFloat(editingData.timesheet_hours) || 0))} hrs
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
                        <span className="flex items-center justify-end gap-1">
                          {formatCurrency(Number(entry.hourly_rate))}
                          {emp && Number(entry.hourly_rate) !== Number(emp.hourly_rate) && (
                            <span title={`Master rate: ${formatCurrency(Number(emp.hourly_rate))}`} className="inline-block h-2 w-2 rounded-full bg-warning shrink-0" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(Number(entry.service_charge || 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatHours(Number(entry.timesheet_hours))}
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
