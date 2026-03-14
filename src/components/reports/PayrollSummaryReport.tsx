import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useHolidayPayments } from "@/hooks/useHolidays";
import { exportToCsv } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, DollarSign } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function PayrollSummaryReport() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: periods = [], isLoading: periodsLoading } = usePayrollPeriods();
  const { data: allEntries = [] } = usePayrollEntries();
  const { data: allHolidayPayments = [] } = useHolidayPayments();

  const filtered = useMemo(() => {
    let list = periods;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    return list;
  }, [periods, statusFilter]);

  const rows = useMemo(() => {
    return filtered.map((period) => {
      const entries = allEntries.filter((e: any) => e.payroll_period_id === period.id);
      const holidays = allHolidayPayments.filter((h: any) => h.payroll_period_id === period.id);
      const totalTimesheetHours = entries.reduce((s: number, e: any) => s + (e.timesheet_hours || 0), 0);
      const holidayTotal = holidays.reduce((s: number, h: any) => s + (h.total || 0), 0);
      const grandTotal = entries.reduce((s: number, e: any) => s + (e.total_pay || 0), 0);

      return {
        id: period.id,
        periodName: period.period_name,
        startDate: period.start_date,
        endDate: period.end_date,
        payDate: period.pay_date,
        status: period.status,
        employeeCount: entries.length,
        totalTimesheetHours: Math.round(totalTimesheetHours * 100) / 100,
        holidayTotal: Math.round(holidayTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    });
  }, [filtered, allEntries, allHolidayPayments]);

  const handleExport = () => {
    exportToCsv("payroll_summary", [
      { header: "Period", accessor: (r) => r.periodName },
      { header: "Start Date", accessor: (r) => r.startDate },
      { header: "End Date", accessor: (r) => r.endDate },
      { header: "Pay Date", accessor: (r) => r.payDate || "" },
      { header: "Status", accessor: (r) => r.status },
      { header: "Employees", accessor: (r) => r.employeeCount },
      { header: "Timesheet Hours", accessor: (r) => r.totalTimesheetHours },
      { header: "Holiday Total (£)", accessor: (r) => r.holidayTotal },
      { header: "Grand Total (£)", accessor: (r) => r.grandTotal },
    ], rows);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Payroll Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            {rows.length > 0 && <span className="ml-1 text-xs opacity-70">({rows.length})</span>}
          </Button>
        </div>

        <ReportSummaryBar
          rowCount={rows.length}
          extra={statusFilter !== "all" ? statusFilter : undefined}
        />

        {periodsLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading payroll periods…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={DollarSign} title="No payroll periods yet" description="No payroll periods match your filters. Try changing the status filter." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Holiday (£)</TableHead>
                  <TableHead className="text-right">Total (£)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-xs">{row.periodName}</TableCell>
                    <TableCell className="text-xs">{row.startDate ? format(new Date(row.startDate), "d MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs">{row.endDate ? format(new Date(row.endDate), "d MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs">{row.payDate ? format(new Date(row.payDate), "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[row.status] || ""}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{row.employeeCount}</TableCell>
                    <TableCell className="text-right text-xs">{row.totalTimesheetHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">£{row.holidayTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">£{row.grandTotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
