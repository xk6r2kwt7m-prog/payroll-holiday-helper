/**
 * Phase 4 — Labour Cost Report.
 *
 * Read-only reporting surface for managers. Surfaces base labour cost,
 * service charge components, NMW risk and profile-fallback usage — each
 * clearly labelled and separated.
 *
 * Strict rules (Phase 3 + Phase 4):
 *   - Service charge is NEVER counted toward NMW eligible pay.
 *   - Labour percentage uses BASE labour cost by default. A separate
 *     "with SC" percentage is shown beside it and clearly labelled.
 *   - No mutation of payroll periods, payroll entries or contract terms.
 *   - Approved periods render with a "Locked — read-only" badge.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useLabourCostReport } from "@/hooks/useLabourCostReport";
import { exportToCsv } from "@/lib/csv-export";
import {
  Download,
  TrendingUp,
  AlertTriangle,
  Info,
  Lock,
  ShieldAlert,
  Users,
  MapPin,
} from "lucide-react";

function fmt£(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return `£${(Math.round(n * 100) / 100).toFixed(2)}`;
}
function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function LabourCostReport() {
  const { data, isLoading } = useLabourCostReport();
  const periods = data?.periods ?? [];
  const [selectedId, setSelectedId] = useState<string>("all");

  // "all" = aggregate view across the most-recent N periods.
  const visible = useMemo(() => {
    if (selectedId === "all") return periods;
    return periods.filter((p) => p.period_id === selectedId);
  }, [periods, selectedId]);

  const selectedSingle = visible.length === 1 ? visible[0] : null;

  // Aggregate totals for the visible periods.
  const agg = useMemo(() => {
    const a = {
      base_pay_total: 0,
      performance_bonus_total: 0,
      special_bonus_total: 0,
      actual_service_charge_paid_total: 0,
      guaranteed_sc_committed_total: 0,
      estimated_sc_committed_total: 0,
      hours: 0,
      sales_total: 0,
      eligible_nmw_pay: 0,
      nmw_risk_count: 0,
      relies_on_sc_count: 0,
      profile_fallback_count: 0,
      entry_count: 0,
      total_labour_value: 0,
    };
    for (const p of visible) {
      a.base_pay_total += p.totals.base_pay_total;
      a.performance_bonus_total += p.totals.performance_bonus_total;
      a.special_bonus_total += p.totals.special_bonus_total;
      a.actual_service_charge_paid_total += p.totals.actual_service_charge_paid_total;
      a.guaranteed_sc_committed_total += p.totals.guaranteed_sc_committed_total;
      a.estimated_sc_committed_total += p.totals.estimated_sc_committed_total;
      a.hours += p.totals.hours;
      a.sales_total += p.sales_total;
      a.eligible_nmw_pay += p.totals.eligible_nmw_pay;
      a.nmw_risk_count += p.totals.nmw_risk_count;
      a.relies_on_sc_count += p.totals.relies_on_service_charge_count;
      a.profile_fallback_count += p.totals.profile_fallback_count;
      a.entry_count += p.totals.entry_count;
      a.total_labour_value += p.totals.total_labour_value;
    }
    const baseLabourPct = a.sales_total > 0 ? (a.base_pay_total / a.sales_total) * 100 : null;
    const withScPct =
      a.sales_total > 0
        ? ((a.base_pay_total + a.actual_service_charge_paid_total) / a.sales_total) * 100
        : null;
    return { ...a, baseLabourPct, withScPct };
  }, [visible]);

  // Employee breakdown — when a single period is selected, list its entries.
  const employeeRows = useMemo(() => {
    if (!selectedSingle) return [];
    return [...selectedSingle.entries].sort((a, b) => b.total_labour_value - a.total_labour_value);
  }, [selectedSingle]);

  const siteRows = selectedSingle?.site_breakdown ?? [];

  const handleExportPeriods = () => {
    exportToCsv(
      "labour_cost_periods",
      [
        { header: "Period", accessor: (r) => r.period_name },
        { header: "Start", accessor: (r) => r.start_date },
        { header: "End", accessor: (r) => r.end_date },
        { header: "Status", accessor: (r) => r.status },
        { header: "Worked Hours", accessor: (r) => r.totals.hours },
        { header: "Base Labour Cost (£)", accessor: (r) => r.totals.base_pay_total },
        { header: "Performance Bonus (£)", accessor: (r) => r.totals.performance_bonus_total },
        { header: "Special Pay (£)", accessor: (r) => r.totals.special_bonus_total },
        { header: "Eligible NMW Pay (£)", accessor: (r) => r.totals.eligible_nmw_pay },
        { header: "Actual Service Charge Paid (£)", accessor: (r) => r.totals.actual_service_charge_paid_total },
        { header: "Guaranteed SC (committed) (£)", accessor: (r) => r.totals.guaranteed_sc_committed_total },
        { header: "Estimated SC (committed) (£)", accessor: (r) => r.totals.estimated_sc_committed_total },
        { header: "Total Labour Value (£)", accessor: (r) => r.totals.total_labour_value },
        { header: "Stored Grand Total (£)", accessor: (r) => r.totals.stored_grand_total },
        { header: "Sales Total (£)", accessor: (r) => r.sales_total },
        { header: "Base Labour %", accessor: (r) => r.base_labour_pct?.toFixed(1) ?? "" },
        { header: "Total Package % (with SC, informational)", accessor: (r) => r.with_sc_labour_pct?.toFixed(1) ?? "" },
        { header: "NMW Risk Count", accessor: (r) => r.totals.nmw_risk_count },
        { header: "Relies on SC Count (diagnostic)", accessor: (r) => r.totals.relies_on_service_charge_count },
        { header: "Profile Fallback Count", accessor: (r) => r.totals.profile_fallback_count },
      ],
      visible,
    );
  };

  const handleExportEmployees = () => {
    if (!selectedSingle) return;
    exportToCsv(
      `labour_cost_employees_${selectedSingle.period_name.replace(/\s+/g, "_")}`,
      [
        { header: "Employee", accessor: (r) => r.employee_name },
        { header: "Hours", accessor: (r) => r.hours },
        { header: "Base Hourly Rate (£)", accessor: (r) => r.hours > 0 ? (r.base_pay / r.hours).toFixed(2) : "" },
        { header: "Base Labour Cost (£)", accessor: (r) => r.base_pay },
        { header: "Performance Bonus (£)", accessor: (r) => r.performance_bonus },
        { header: "Special Pay (£)", accessor: (r) => r.special_bonus },
        { header: "Actual Service Charge Paid (£)", accessor: (r) => r.actual_service_charge_paid },
        { header: "Guaranteed SC (committed) (£)", accessor: (r) => r.guaranteed_sc_committed },
        { header: "Estimated SC (committed) (£)", accessor: (r) => r.estimated_sc_committed },
        { header: "Total Labour Value (£)", accessor: (r) => r.total_labour_value },
        { header: "Eligible NMW Pay (£)", accessor: (r) => r.nmw.eligible_pay },
        { header: "Required NMW Rate (£/hr)", accessor: (r) => r.nmw.required_rate },
        { header: "Effective NMW Rate (£/hr)", accessor: (r) => r.nmw.effective_rate ?? "" },
        { header: "NMW Status", accessor: (r) => r.nmw.status },
        { header: "Relies on SC (diagnostic)", accessor: (r) => r.nmw.relies_on_service_charge ? "yes" : "no" },
        { header: "Terms Source", accessor: (r) => r.terms_source },
        { header: "Profile Fallback", accessor: (r) => r.terms_source === "profile_fallback" ? "yes" : "no" },
      ],
      employeeRows,
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Labour Cost Report
            </span>
            <div className="flex items-center gap-2">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-8 w-[220px] text-xs">
                  <SelectValue placeholder="All periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payroll periods</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.period_id} value={p.period_id}>
                      {p.period_name} {p.is_locked ? "🔒" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleExportPeriods} disabled={visible.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export periods
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Locked notice */}
          {selectedSingle?.is_locked && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <Lock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Approved period — read-only</p>
                <p className="text-muted-foreground">
                  Stored values are displayed verbatim. This report never modifies approved payroll data.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Base labour cost" value={fmt£(agg.base_pay_total)} hint="NMW eligible base pay" />
            <SummaryCard label="Guaranteed service charge" value={fmt£(agg.guaranteed_sc_committed_total)} hint="From active contract terms — NOT NMW eligible" />
            <SummaryCard label="Estimated service charge" value={fmt£(agg.estimated_sc_committed_total)} hint="Indicative only — NOT NMW eligible" />
            <SummaryCard label="Actual service charge paid" value={fmt£(agg.actual_service_charge_paid_total)} hint="From payroll entries — NOT NMW eligible" />
            <SummaryCard label="Eligible NMW pay" value={fmt£(agg.eligible_nmw_pay)} hint="Base + performance + special. Excludes service charge." />
            <SummaryCard label="Total labour value" value={fmt£(agg.total_labour_value)} hint="Base pay + bonuses + actual SC paid" />
            <SummaryCard
              label="Base labour %"
              value={fmtPct(agg.baseLabourPct)}
              hint={`Total package %: ${fmtPct(agg.withScPct)} (with SC)`}
              tone={agg.baseLabourPct != null && agg.baseLabourPct > 35 ? "warn" : undefined}
            />
            <SummaryCard
              label="NMW risk"
              value={`${agg.nmw_risk_count}`}
              hint={`Relies on SC (diagnostic): ${agg.relies_on_sc_count}`}
              tone={agg.nmw_risk_count > 0 ? "danger" : undefined}
              icon={agg.nmw_risk_count > 0 ? <ShieldAlert className="h-3.5 w-3.5" /> : undefined}
            />
            <SummaryCard
              label="Profile fallback used"
              value={`${agg.profile_fallback_count}`}
              hint="Entries with no active contract terms"
              tone={agg.profile_fallback_count > 0 ? "warn" : undefined}
              icon={agg.profile_fallback_count > 0 ? <Info className="h-3.5 w-3.5" /> : undefined}
            />
          </div>

          {/* Period table */}
          <ReportSummaryBar rowCount={visible.length} extra={`${visible.length} period${visible.length !== 1 ? "s" : ""}`} />

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading payroll periods…</p>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No payroll periods yet"
              description="Create a payroll period first, then labour costs will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Base (£)</TableHead>
                    <TableHead className="text-right">Bonuses (£)</TableHead>
                    <TableHead className="text-right">SC Paid (£)</TableHead>
                    <TableHead className="text-right">Total (£)</TableHead>
                    <TableHead className="text-right">Sales (£)</TableHead>
                    <TableHead className="text-right">Base %</TableHead>
                    <TableHead className="text-right">NMW Risk</TableHead>
                    <TableHead className="text-right">Fallback</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.period_id} className="cursor-pointer" onClick={() => setSelectedId(r.period_id)}>
                      <TableCell className="text-xs font-medium">{r.period_name}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{r.totals.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(r.totals.base_pay_total)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {fmt£(r.totals.performance_bonus_total + r.totals.special_bonus_total)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(r.totals.actual_service_charge_paid_total)}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">{fmt£(r.totals.total_labour_value)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{r.sales_total > 0 ? fmt£(r.sales_total) : "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.base_labour_pct != null ? (
                          <span className={r.base_labour_pct > 35 ? "text-destructive font-medium" : ""}>
                            {fmtPct(r.base_labour_pct)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.totals.nmw_risk_count > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{r.totals.nmw_risk_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.totals.profile_fallback_count > 0 ? (
                          <Badge variant="secondary" className="text-[10px]">{r.totals.profile_fallback_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.is_locked ? (
                          <Badge variant="outline" className="text-[10px] gap-1"><Lock className="h-2.5 w-2.5" />Approved</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee-level breakdown — only when a single period is selected */}
      {selectedSingle && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Employee breakdown — {selectedSingle.period_name}
              </span>
              <Button size="sm" variant="outline" onClick={handleExportEmployees} disabled={employeeRows.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export employees
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No entries in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Hrs</TableHead>
                      <TableHead className="text-right">Base £/hr</TableHead>
                      <TableHead className="text-right">Base (£)</TableHead>
                      <TableHead className="text-right">Bonuses (£)</TableHead>
                      <TableHead className="text-right">SC Paid (£)</TableHead>
                      <TableHead className="text-right">Guaranteed SC (£)</TableHead>
                      <TableHead className="text-right">Estimated SC (£)</TableHead>
                      <TableHead className="text-right">Total (£)</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>NMW</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeRows.map((r) => (
                      <TableRow key={r.entry_id}>
                        <TableCell className="text-xs font-medium">{r.employee_name}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{r.hours.toFixed(1)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {r.hours > 0 ? `£${(r.base_pay / r.hours).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt£(r.base_pay)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt£(r.performance_bonus + r.special_bonus)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt£(r.actual_service_charge_paid)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt£(r.guaranteed_sc_committed)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt£(r.estimated_sc_committed)}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">{fmt£(r.total_labour_value)}</TableCell>
                        <TableCell className="text-xs">
                          {r.terms_source === "employment_terms" ? (
                            <span className="text-muted-foreground">Contract terms</span>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Info className="h-2.5 w-2.5" /> Profile fallback
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.nmw.status === "non_compliant" ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <ShieldAlert className="h-2.5 w-2.5" /> NMW risk
                            </Badge>
                          ) : r.nmw.status === "at_risk" ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-400">At risk</Badge>
                          ) : r.nmw.status === "insufficient_data" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-muted-foreground">OK</span>
                          )}
                          {r.nmw.relies_on_service_charge && (
                            <span className="ml-1 text-[10px] text-amber-600" title="Diagnostic — service charge is never counted toward NMW">
                              relies on SC
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Site / location breakdown */}
      {selectedSingle && siteRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Site / location breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Base (£)</TableHead>
                    <TableHead className="text-right">Guaranteed SC (£)</TableHead>
                    <TableHead className="text-right">Est. SC (£)</TableHead>
                    <TableHead className="text-right">Actual SC Paid (£)</TableHead>
                    <TableHead className="text-right">Total (£)</TableHead>
                    <TableHead className="text-right">Fallback</TableHead>
                    <TableHead className="text-right">NMW Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteRows.map((s) => (
                    <TableRow key={s.location_name}>
                      <TableCell className="text-xs font-medium">{s.location_name}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{s.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(s.base_cost)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(s.guaranteed_sc_cost)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(s.estimated_sc_cost)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt£(s.actual_service_charge_paid)}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">{fmt£(s.total_labour_value)}</TableCell>
                      <TableCell className="text-right text-xs">{s.fallback_count > 0 ? <Badge variant="secondary" className="text-[10px]">{s.fallback_count}</Badge> : "—"}</TableCell>
                      <TableCell className="text-right text-xs">{s.nmw_risk_count > 0 ? <Badge variant="destructive" className="text-[10px]">{s.nmw_risk_count}</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5" />
                Site costs allocated pro-rata by hours worked at each location. Revenue not shown here — site-level revenue is not modelled in the current schema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback footer */}
      {data && data.fallback_employees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Employees relying on profile fallback ({data.fallback_employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {data.fallback_employees.map((e) => (
                <Badge key={e.id} variant="secondary" className="text-[11px]">{e.name}</Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              These employees have payroll entries but no active <em>employee_contract_terms</em> row.
              Rate is read from the employee profile. Issue or amend a contract to switch them to terms-driven rates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn" | "danger";
  icon?: React.ReactNode;
}
function SummaryCard({ label, value, hint, tone, icon }: SummaryCardProps) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "warn"
        ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/20"
        : "border-border bg-card";
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground leading-snug">{hint}</div>}
    </div>
  );
}
