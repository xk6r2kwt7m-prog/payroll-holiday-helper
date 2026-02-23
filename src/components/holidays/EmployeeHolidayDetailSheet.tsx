import { Calendar, Clock, TrendingUp, TrendingDown, DollarSign, ArrowRight, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatHours, formatCurrency, UK_HOLIDAY_LAW } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";
import { AdjustHolidayBalanceDialog } from "./AdjustHolidayBalanceDialog";

interface HolidayPaymentRecord {
  id: string;
  hours: number;
  rate: number;
  total: number;
  holidayDate: string | null;
  periodName: string;
  notes: string | null;
}

interface EmployeeHolidayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  department: string;
  hoursAccrued: number;
  hoursTaken: number;
  totalPaid: number;
  balance: number;
  carryOver?: number;
  year?: number;
  payments: HolidayPaymentRecord[];
  periodBreakdown?: { periodName: string; accrued: number; taken: number; paid: number }[];
}

export function EmployeeHolidayDetailSheet({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  department,
  hoursAccrued,
  hoursTaken,
  totalPaid,
  balance,
  carryOver = 0,
  year = new Date().getFullYear(),
  payments,
  periodBreakdown = [],
}: EmployeeHolidayDetailSheetProps) {
  const totalEntitlement = hoursAccrued + carryOver;
  const usagePercent = totalEntitlement > 0 ? (hoursTaken / totalEntitlement) * 100 : 0;
  const isOverdrawn = hoursTaken > totalEntitlement;
  const initials = employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);

  // Expected usage based on time of year (simple linear model)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100;
  const expectedHours = totalEntitlement * (yearProgress / 100);
  const usageVsExpected = expectedHours > 0 ? ((hoursTaken - expectedHours) / expectedHours) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{employeeName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{department}</Badge>
                <AdjustHolidayBalanceDialog
                  employeeId={employeeId}
                  employeeName={employeeName}
                  currentAccrued={hoursAccrued}
                  currentTaken={hoursTaken}
                  currentBalance={balance}
                  year={year}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Pencil className="h-3 w-3 mr-1" />
                      Adjust
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success/5 border border-success/10 p-4 text-center">
              <Clock className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{formatHours(hoursAccrued)}</p>
              <p className="text-xs text-muted-foreground">Hours Accrued</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{formatHours(hoursTaken)}</p>
              <p className="text-xs text-muted-foreground">Hours Taken</p>
            </div>
            <div className={cn(
              "rounded-xl border p-4 text-center",
              balance >= 0 ? "bg-accent/5 border-accent/10" : "bg-destructive/5 border-destructive/10"
            )}>
              {balance >= 0 ? (
                <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
              )}
              <p className={cn("text-2xl font-bold", balance >= 0 ? "text-accent" : "text-destructive")}>
                {formatHours(balance)}
              </p>
              <p className="text-xs text-muted-foreground">Balance</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
              <DollarSign className="h-5 w-5 text-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
          </div>

          {/* Usage Progress */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <h4 className="font-semibold text-sm">Holiday Usage</h4>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{formatHours(hoursTaken)} of {formatHours(totalEntitlement)} hours</span>
                <span className={cn(
                  "font-medium",
                  usagePercent > 100 ? "text-destructive" : usagePercent > 80 ? "text-warning" : "text-success"
                )}>
                  {usagePercent.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(usagePercent, 100)}
                className={cn("h-3", isOverdrawn && "[&>div]:bg-destructive")}
              />
            </div>

            {/* Expected vs actual */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">
                Expected by now: <span className="font-medium text-foreground">{formatHours(expectedHours)} hrs</span>
              </span>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                usageVsExpected > 20 ? "bg-warning/10 text-warning" :
                usageVsExpected < -30 ? "bg-primary/10 text-primary" :
                "bg-success/10 text-success"
              )}>
                {usageVsExpected > 0 ? "+" : ""}{usageVsExpected.toFixed(0)}% vs expected
              </Badge>
            </div>

            {carryOver > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted-foreground">Carried over from previous year</span>
                <span className="font-medium text-accent">{formatHours(carryOver)} hrs</span>
              </div>
            )}
          </div>

          {/* Accrual by Period */}
          {periodBreakdown.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Accrual by Payroll Period</h4>
              <div className="space-y-2">
                {periodBreakdown.map((period, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{period.periodName}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success font-medium">+{formatHours(period.accrued)} hrs</span>
                      {period.taken > 0 && (
                        <span className="text-primary font-medium">-{formatHours(period.taken)} hrs</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Holiday Payment History */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Holiday Payments ({payments.length})
            </h4>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No holiday payments recorded</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                    <div>
                      <div className="font-medium">{payment.periodName}</div>
                      {payment.holidayDate && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.holidayDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-xs text-muted-foreground italic mt-0.5">{payment.notes}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatHours(payment.hours)} hrs</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(payment.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UK Law Info */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">UK Holiday Law</p>
            <p>Accrual rate: {(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% of hours worked</p>
            <p>Statutory entitlement: {UK_HOLIDAY_LAW.STATUTORY_WEEKS} weeks per year</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
