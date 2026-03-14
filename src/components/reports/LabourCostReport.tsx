import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useHolidayPayments } from "@/hooks/useHolidays";
import { exportToCsv } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp } from "lucide-react";

export function LabourCostReport() {
  const { data: periods = [], isLoading: periodsLoading } = usePayrollPeriods();
  const { data: allEntries = [] } = usePayrollEntries();
  const { data: allHolidayPayments = [] } = useHolidayPayments();

  const rows = useMemo(() => {
    return periods.map((period) => {
      const entries = (allEntries as any[]).filter((e) => e.payroll_period_id === period.id);
      const holidays = (allHolidayPayments as any[]).filter((h) => h.payroll_period_id === period.id);

      // Read stored values only — no formula derivation
      const holidaysTotal = holidays.reduce((s, h) => s + (h.total || 0), 0);
      const grandTotal = entries.reduce((s, e) => s + (e.total_pay || 0), 0);
      const totalBonuses = entries.reduce((s, e) => s + (e.performance_bonus || 0) + (e.special_bonus || 0), 0);
      // Timesheet cost = stored grand total minus stored bonuses (all from DB, no rate multiplication)
      const timesheetTotal = grandTotal - totalBonuses;
      const salesTotal = period.sales_total || 0;
      const labourPct = salesTotal > 0 ? (grandTotal / salesTotal) * 100 : null;

      return {
        id: period.id,
        periodName: period.period_name,
        startDate: period.start_date,
        endDate: period.end_date,
        salesTotal: Math.round(salesTotal * 100) / 100,
        timesheetTotal: Math.round(timesheetTotal * 100) / 100,
        holidaysTotal: Math.round(holidaysTotal * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        labourPct,
      };
    });
  }, [periods, allEntries, allHolidayPayments]);

  const handleExport = () => {
    exportToCsv("labour_cost_summary", [
      { header: "Period", accessor: (r) => r.periodName },
      { header: "Start", accessor: (r) => r.startDate },
      { header: "End", accessor: (r) => r.endDate },
      { header: "Sales Total (£)", accessor: (r) => r.salesTotal },
      { header: "Timesheet Cost (£)", accessor: (r) => r.timesheetTotal },
      { header: "Holidays Cost (£)", accessor: (r) => r.holidaysTotal },
      { header: "Grand Total (£)", accessor: (r) => r.grandTotal },
      { header: "Labour %", accessor: (r) => r.labourPct != null ? r.labourPct.toFixed(1) : "N/A" },
    ], rows);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Labour Cost Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            {rows.length > 0 && <span className="ml-1 text-xs opacity-70">({rows.length})</span>}
          </Button>
        </div>

        <ReportSummaryBar rowCount={rows.length} extra={`${rows.length} period${rows.length !== 1 ? "s" : ""}`} />

        {periodsLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading payroll periods…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No payroll periods yet" description="Create a payroll period first, then labour costs will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Sales (£)</TableHead>
                  <TableHead className="text-right">Timesheet (£)</TableHead>
                  <TableHead className="text-right">Holidays (£)</TableHead>
                  <TableHead className="text-right">Total (£)</TableHead>
                  <TableHead className="text-right">Labour %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs font-medium">{row.periodName}</TableCell>
                    <TableCell className="text-right text-xs">
                      {row.salesTotal > 0 ? `£${row.salesTotal.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">£{row.timesheetTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">£{row.holidaysTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">£{row.grandTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {row.labourPct != null ? (
                        <span className={row.labourPct > 35 ? "text-destructive font-medium" : "text-foreground"}>
                          {row.labourPct.toFixed(1)}%
                        </span>
                      ) : "—"}
                    </TableCell>
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
