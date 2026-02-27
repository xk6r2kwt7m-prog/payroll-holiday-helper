import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download, FileText, CheckCircle2, Clock, XCircle, Printer } from "lucide-react";
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

const handlePrint = (mode: "admin" | "staff", overpayments: any[]) => {
  const isStaff = mode === "staff";
  const today = new Date().toLocaleDateString("en-GB");
  
  const activeOverpayments = overpayments.filter(o => Number(o.estimated_overlap_hours) > 0);
  const totalHours = activeOverpayments.reduce((s, o) => s + Number(o.estimated_overlap_hours), 0);
  const totalOverpayment = activeOverpayments.reduce((s, o) => s + Number(o.estimated_overpayment), 0);

  const rows = activeOverpayments
    .sort((a, b) => (a.employees?.surname || "").localeCompare(b.employees?.surname || ""))
    .map((o, i) => {
      const name = `${o.employees?.forename} ${o.employees?.surname}`;
      const dept = o.employees?.department || "";
      const hours = Number(o.estimated_overlap_hours).toFixed(2);
      const overpayment = formatCurrency(Number(o.estimated_overpayment));
      
      if (isStaff) {
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${i + 1}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:500;">${name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:center;">${dept}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${hours}h</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#dc2626;">${overpayment}</td>
        </tr>`;
      }
      
      const rate = formatCurrency(Number(o.hourly_rate));
      const sc = formatCurrency(Number(o.service_charge));
      const status = o.recovery_status.charAt(0).toUpperCase() + o.recovery_status.slice(1).replace("_", " ");
      const notes = o.notes || "—";
      
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;font-weight:500;">${name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:center;">${dept}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${hours}h</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${rate}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${sc}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#dc2626;">${overpayment}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;">${status}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;font-size:11px;max-width:200px;word-wrap:break-word;">${notes}</td>
      </tr>`;
    })
    .join("");

  const staffHeaders = `
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">#</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Employee</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Dept</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Overlap Hours</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Est. Overpayment</th>`;

  const adminHeaders = `
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">#</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Employee</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Dept</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Overlap Hours</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Rate</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">SC</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Est. Overpayment</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
    <th style="padding:8px 10px;border-bottom:2px solid #333;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Notes</th>`;

  const staffTotalCols = `
    <td style="padding:8px 10px;font-weight:700;" colspan="3">TOTAL</td>
    <td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${totalHours.toFixed(2)}h</td>
    <td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:#dc2626;">${formatCurrency(totalOverpayment)}</td>`;

  const adminTotalCols = `
    <td style="padding:8px 10px;font-weight:700;" colspan="3">TOTAL</td>
    <td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${totalHours.toFixed(2)}h</td>
    <td colspan="2"></td>
    <td style="padding:8px 10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:#dc2626;">${formatCurrency(totalOverpayment)}</td>
    <td colspan="2"></td>`;

  const confidentialBanner = !isStaff
    ? `<div style="background:#dc2626;color:white;text-align:center;padding:6px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:16px;">PRIVATE &amp; CONFIDENTIAL — ADMIN ONLY</div>`
    : "";

  const title = isStaff ? "Payroll Adjustment Notice" : "Payroll Overpayment Evidence — Admin Report";
  const subtitle = "February 2026 — 1 week overlap (19–25 Jan) with January period";

  const explanation = isStaff
    ? `<div style="background:#fef9c3;border:1px solid #facc15;border-radius:6px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
        <strong>What happened:</strong> The February 2026 payroll period accidentally included one extra week (19–25 January) 
        that was already paid in the January payroll. The table below shows the hours worked during that overlap week 
        and the estimated amount that was overpaid. This will be adjusted in upcoming pay periods.
      </div>`
    : `<div style="background:#fef9c3;border:1px solid #facc15;border-radius:6px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
        <strong>Calculation basis:</strong> Exact timesheet hours from Deputy export for 19–25 Jan 2026, 
        aggregated across all locations per employee. Overpayment = hours × (hourly rate + service charge).
      </div>`;

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          @page { size: landscape; margin: 15mm; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #111; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      ${confidentialBanner}
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
        <img src="${window.location.origin}/logo.jpeg" style="height:48px;border-radius:6px;" />
        <div>
          <h1 style="margin:0;font-size:20px;">${title}</h1>
          <p style="margin:4px 0 0;color:#666;font-size:13px;">${subtitle}</p>
        </div>
      </div>
      <p style="color:#888;font-size:11px;margin-bottom:16px;">Printed: ${today} | Employees: ${activeOverpayments.length} | Total overlap: ${totalHours.toFixed(1)}h</p>
      ${explanation}
      <table>
        <thead><tr>${isStaff ? staffHeaders : adminHeaders}</tr></thead>
        <tbody>
          ${rows}
          <tr style="background:#f5f5f5;border-top:2px solid #333;">
            ${isStaff ? staffTotalCols : adminTotalCols}
          </tr>
        </tbody>
      </table>
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#888;">
        <strong>Source:</strong> Deputy timesheet export 19–25 Jan 2026 • Generated by Uglo Payroll System • ${today}
      </div>
    </body>
    </html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
    // Remove any injected Lovable badge elements before printing
    printWindow.onload = () => {
      const badges = printWindow.document.querySelectorAll('[id*="lovable"], [class*="lovable"], a[href*="lovable"]');
      badges.forEach(el => el.remove());
      printWindow.print();
    };
  }
};

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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handlePrint("admin", overpayments)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePrint("staff", overpayments)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Staff
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
                  Exact timesheet hours from Deputy export for 19–25 Jan 2026, aggregated across all locations per employee.
                  Overpayment = hours × (hourly rate + service charge).
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
              Hours sourced from Deputy timesheet export. Records are immutable once created — status changes are tracked via updated_at timestamps.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PayrollOverpayments;
