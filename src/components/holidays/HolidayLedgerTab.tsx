import { useState } from "react";
import { BookOpen, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHolidayLedger, usePendingLedgerAccruals, type HolidayLedgerEntry } from "@/hooks/useHolidayLedger";
import { formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";


interface HolidayLedgerTabProps {
  employeeId: string;
  year?: number;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  accrual: "Accrual",
  carry_over_in: "Carry-over In",
  holiday_taken: "Holiday Taken",
  manual_adjustment: "Adjustment",
  correction: "Correction",
  payout_on_termination: "Termination Payout",
  carry_over_out: "Carry-over Out",
  expiry: "Expiry",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  accrual: "bg-success/10 text-success border-success/20",
  carry_over_in: "bg-accent/10 text-accent border-accent/20",
  holiday_taken: "bg-primary/10 text-primary border-primary/20",
  manual_adjustment: "bg-warning/10 text-warning border-warning/20",
  correction: "bg-muted text-muted-foreground border-border",
  payout_on_termination: "bg-destructive/10 text-destructive border-destructive/20",
  carry_over_out: "bg-muted text-muted-foreground border-border",
  expiry: "bg-destructive/10 text-destructive border-destructive/20",
};

export function HolidayLedgerTab({ employeeId, year = new Date().getFullYear() }: HolidayLedgerTabProps) {
  const [selectedYear, setSelectedYear] = useState(String(year));
  const leaveYearStart = `${selectedYear}-01-01`;
  const { data: entries, isLoading } = useHolidayLedger(employeeId, leaveYearStart);
  const { data: pending } = usePendingLedgerAccruals(employeeId, Number(selectedYear));

  const years = Array.from({ length: 6 }, (_, i) => String(2021 + i));

  // Calculate running balance
  let runningBalance = 0;
  const rows = (entries || []).map((entry) => {
    runningBalance += Number(entry.hours);
    return { ...entry, runningBalance };
  });

  const totalBalance = runningBalance;

  const pendingRows = pending || [];
  const pendingTotal = pendingRows.reduce((sum, p) => sum + p.hours, 0);


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Transaction Ledger</h4>
          {entries && (
            <Badge variant="outline" className="text-[10px]">{entries.length} entries</Badge>
          )}
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balance summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Posted to ledger (approved periods)</span>
          <span className={cn(
            "text-lg font-bold",
            totalBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatHours(totalBalance)} hrs
          </span>
        </div>
        {pendingTotal !== 0 && (
          <>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                In open payroll periods (not yet posted)
              </span>
              <span className="text-sm font-semibold text-warning">
                +{formatHours(pendingTotal)} hrs
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs font-semibold">Total including open periods</span>
              <span className="text-sm font-bold">{formatHours(totalBalance + pendingTotal)} hrs</span>
            </div>
          </>
        )}
      </div>

      {pendingTotal !== 0 && (
        <p className="text-[11px] text-muted-foreground">
          Accrual only posts to the ledger when a payroll period is approved. The rows marked
          “Pending” below come from payroll entries in draft / pending periods — they are shown for
          visibility and nothing has been written to the ledger.
        </p>
      )}

      {/* Ledger table */}
      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Loading ledger…</div>
      ) : rows.length === 0 && pendingRows.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          No ledger entries for {selectedYear}. Run backfill to populate.
        </div>
      ) : (

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Hours</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Balance</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(row.entry_date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "2-digit",
                    })}
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className={cn("text-[10px] font-normal", ENTRY_TYPE_COLORS[row.entry_type] || "")}>
                      {ENTRY_TYPE_LABELS[row.entry_type] || row.entry_type}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right font-medium whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-0.5",
                      Number(row.hours) > 0 ? "text-success" : "text-destructive"
                    )}>
                      {Number(row.hours) > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Number(row.hours) > 0 ? "+" : ""}{formatHours(Number(row.hours))}
                    </span>
                  </td>
                  <td className={cn(
                    "py-2 px-3 text-right font-semibold text-xs",
                    row.runningBalance >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatHours(row.runningBalance)}
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground max-w-[140px] truncate" title={row.notes || ""}>
                    {row.source_table ? (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="h-2.5 w-2.5" />
                        {row.source_table}
                      </span>
                    ) : (
                      row.notes || "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
