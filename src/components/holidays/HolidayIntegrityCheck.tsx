import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface IntegrityRow {
  employeeName: string;
  department: string;
  year: number;
  storedAccrued: number;
  calculatedAccrued: number;
  variance: number;
  explanation: string;
  severity: "ok" | "info" | "warning" | "error";
}

interface HolidayIntegrityCheckProps {
  rows: IntegrityRow[];
  isLoading?: boolean;
}

export function HolidayIntegrityCheck({ rows, isLoading }: HolidayIntegrityCheckProps) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2, ok: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [rows]);

  const counts = useMemo(() => ({
    total: rows.length,
    ok: rows.filter(r => r.severity === "ok").length,
    info: rows.filter(r => r.severity === "info").length,
    warning: rows.filter(r => r.severity === "warning").length,
    error: rows.filter(r => r.severity === "error").length,
  }), [rows]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-8 text-center">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded mx-auto" />
          <div className="h-4 w-64 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          {counts.error > 0 ? (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-success" />
          )}
          <h3 className="font-semibold text-foreground">Holiday Data Integrity</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {counts.ok} Verified
          </Badge>
          {counts.info > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Info className="h-3 w-3 mr-1" /> {counts.info} Notes
            </Badge>
          )}
          {counts.warning > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <AlertTriangle className="h-3 w-3 mr-1" /> {counts.warning} Warnings
            </Badge>
          )}
          {counts.error > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              <XCircle className="h-3 w-3 mr-1" /> {counts.error} Errors
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Cross-references holiday_balances against actual payroll entry accruals. 
          Variances may be expected for backfill periods, corrected periods, or manually-seeded historical data.
        </p>
      </div>

      {/* Detail table */}
      {sorted.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr,auto,auto,auto,auto,1fr] gap-0 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-2 border-b border-border">
            <span>Employee</span>
            <span className="text-right w-14">Year</span>
            <span className="text-right w-20">Stored</span>
            <span className="text-right w-20">Calculated</span>
            <span className="text-right w-20">Variance</span>
            <span className="pl-3">Explanation</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {sorted.map((row, i) => (
              <div
                key={`${row.employeeName}-${row.year}-${i}`}
                className={cn(
                  "grid grid-cols-[1fr,auto,auto,auto,auto,1fr] gap-0 text-xs px-3 py-2",
                  i !== sorted.length - 1 && "border-b border-border/50",
                  row.severity === "error" && "bg-destructive/5",
                  row.severity === "warning" && "bg-warning/5"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {row.severity === "ok" && <CheckCircle2 className="h-3 w-3 text-success shrink-0" />}
                  {row.severity === "info" && <Info className="h-3 w-3 text-blue-500 shrink-0" />}
                  {row.severity === "warning" && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                  {row.severity === "error" && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                  <span className="text-foreground truncate">{row.employeeName}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">{row.department}</Badge>
                </div>
                <span className="text-right w-14 text-muted-foreground">{row.year}</span>
                <span className="text-right w-20 font-mono text-muted-foreground">{formatHours(row.storedAccrued)}</span>
                <span className="text-right w-20 font-mono text-muted-foreground">{formatHours(row.calculatedAccrued)}</span>
                <span className={cn(
                  "text-right w-20 font-mono font-medium",
                  Math.abs(row.variance) < 1 ? "text-success" : 
                  Math.abs(row.variance) < 10 ? "text-warning" : "text-destructive"
                )}>
                  {row.variance >= 0 ? "+" : ""}{formatHours(row.variance)}
                </span>
                <span className="pl-3 text-muted-foreground truncate">{row.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
