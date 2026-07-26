import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldAlert, Users, DollarSign, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/hooks/useHolidays";

/**
 * Phase B — compact payroll status bar.
 * Read-only presentational summary. Never mutates data.
 */
export interface PayrollStatusBarProps {
  periodName: string;
  statusLabel: string;
  statusTone: "draft" | "pending" | "approved" | "rejected";
  employeeCount: number;
  totalPay: number;
  holidayTotal: number;
  blockerCount: number;
  warningCount: number;
  ready: boolean;
  readyDetail?: string | null;
}

const statusToneClass: Record<PayrollStatusBarProps["statusTone"], string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function PayrollStatusBar({
  periodName,
  statusLabel,
  statusTone,
  employeeCount,
  totalPay,
  holidayTotal,
  blockerCount,
  warningCount,
  ready,
  readyDetail,
}: PayrollStatusBarProps) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card shadow-card p-3 sm:p-4"
      data-testid="payroll-status-bar"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            className="text-sm font-semibold text-foreground truncate"
            data-testid="status-bar-period"
          >
            {periodName}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", statusToneClass[statusTone])}
            data-testid="status-bar-status"
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-bar-employees">
          <Users className="h-3.5 w-3.5" />
          <span>{employeeCount} employees</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-bar-total">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Total {formatCurrency(totalPay)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-bar-holiday">
          <span>Holiday {formatCurrency(holidayTotal)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs" data-testid="status-bar-blockers">
          <ShieldAlert
            className={cn(
              "h-3.5 w-3.5",
              blockerCount > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          />
          <span className={cn(blockerCount > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
            {blockerCount} blocker{blockerCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs" data-testid="status-bar-warnings">
          <AlertTriangle
            className={cn(
              "h-3.5 w-3.5",
              warningCount > 0 ? "text-warning" : "text-muted-foreground",
            )}
          />
          <span className={cn(warningCount > 0 ? "text-warning font-medium" : "text-muted-foreground")}>
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5" data-testid="status-bar-ready">
          {ready ? (
            <Badge className="bg-success/10 text-success border-success/20 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
            </Badge>
          ) : (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Not ready
            </Badge>
          )}
        </div>
      </div>
      {readyDetail && !ready && (
        <p className="mt-2 text-xs text-muted-foreground">{readyDetail}</p>
      )}
    </div>
  );
}
