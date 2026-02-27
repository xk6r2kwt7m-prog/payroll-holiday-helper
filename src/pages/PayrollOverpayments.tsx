import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useOverpayments, useUpdateOverpaymentStatus } from "@/hooks/useOverpayments";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  identified: { label: "Identified", icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "bg-warning/10 text-warning border-warning/20" },
  acknowledged: { label: "Acknowledged", icon: <FileText className="h-3.5 w-3.5" />, className: "bg-primary/10 text-primary border-primary/20" },
  recovering: { label: "Recovering", icon: <Clock className="h-3.5 w-3.5" />, className: "bg-accent/10 text-accent-foreground border-accent/20" },
  recovered: { label: "Recovered", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-success/10 text-success border-success/20" },
  written_off: { label: "Written Off", icon: <XCircle className="h-3.5 w-3.5" />, className: "bg-muted text-muted-foreground border-muted" },
};

const formatCurrency = (val: number) => `£${val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayrollOverpayments = () => {
  const { data: overpayments = [], isLoading } = useOverpayments();
  const updateStatus = useUpdateOverpaymentStatus();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? overpayments : overpayments.filter(o => o.recovery_status === filter);

  const totals = overpayments.reduce(
    (acc, o) => ({
      estimated: acc.estimated + Number(o.estimated_overpayment),
      recovered: acc.recovered + Number(o.recovered_amount || 0),
      hours: acc.hours + Number(o.estimated_overlap_hours),
    }),
    { estimated: 0, recovered: 0, hours: 0 }
  );

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus.mutate(
      { id, recovery_status: newStatus },
      { onSuccess: () => toast.success("Status updated") }
    );
  };

  const handleExportCSV = () => {
    const headers = ["Employee", "Department", "Period", "Overlap Dates", "Est. Hours", "Rate", "SC", "Est. Overpayment", "Status", "Recovered", "Notes"];
    const rows = overpayments.map(o => [
      `${o.employees?.forename} ${o.employees?.surname}`,
      o.employees?.department,
      o.payroll_periods?.period_name,
      `${o.overlap_start_date} to ${o.overlap_end_date}`,
      o.estimated_overlap_hours,
      o.hourly_rate,
      o.service_charge,
      o.estimated_overpayment,
      o.recovery_status,
      o.recovered_amount || 0,
      (o.notes || "").replace(/,/g, ";"),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overpayment_evidence_feb_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payroll Overpayment Evidence</h1>
            <p className="text-muted-foreground text-sm mt-1">
              February 2026 — 1 week overlap (19–25 Jan) with January period
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Estimated Overpayment</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.estimated)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Recovered So Far</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totals.recovered)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.estimated - totals.recovered)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Overlap Hours (Est.)</p>
              <p className="text-2xl font-bold">{totals.hours.toFixed(1)}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Explanation card */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">How this was calculated</p>
                <p className="text-muted-foreground mt-1">
                  The February 2026 payroll period was set to start on 19 Jan instead of 26 Jan, creating a 7-day overlap 
                  with the January period (15 Dec – 25 Jan). Since the February period spans 5 weeks (35 days), the estimated 
                  overpayment is calculated as <strong>1/5 of each employee's February hours × their effective rate</strong>. 
                  These are pro-rata estimates — actual overlap may vary by individual work patterns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter + Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Employee Breakdown</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({overpayments.length})</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Dept</TableHead>
                      <TableHead className="text-right">Est. Hours</TableHead>
                      <TableHead className="text-right">Rate + SC</TableHead>
                      <TableHead className="text-right">Est. Overpayment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => {
                      const sc = statusConfig[o.recovery_status] || statusConfig.identified;
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">
                            {o.employees?.forename} {o.employees?.surname}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{o.employees?.department}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{Number(o.estimated_overlap_hours).toFixed(2)}h</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(Number(o.hourly_rate) + Number(o.service_charge))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-destructive">
                            {formatCurrency(Number(o.estimated_overpayment))}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={o.recovery_status}
                              onValueChange={(val) => handleStatusChange(o.id, val)}
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <div className="flex items-center gap-1.5">
                                  {sc.icon}
                                  <span>{sc.label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, val]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-1.5">
                                      {val.icon}
                                      <span>{val.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(Number(o.recovered_amount || 0))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {filtered.reduce((s, o) => s + Number(o.estimated_overlap_hours), 0).toFixed(2)}h
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums text-destructive">
                        {formatCurrency(filtered.reduce((s, o) => s + Number(o.estimated_overpayment), 0))}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(filtered.reduce((s, o) => s + Number(o.recovered_amount || 0), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit note */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              <strong>Audit trail:</strong> This record was generated on {new Date().toLocaleDateString("en-GB")} as evidence of 
              payroll overlap between January 2026 (15 Dec – 25 Jan) and February 2026 (19 Jan – 22 Feb). 
              All figures are pro-rata estimates. Records are immutable once created — status changes are tracked via updated_at timestamps.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PayrollOverpayments;
