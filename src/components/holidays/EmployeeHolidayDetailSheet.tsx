import { useState } from "react";
import { Calendar, Clock, TrendingUp, TrendingDown, DollarSign, ArrowRight, Pencil, ChevronDown, ChevronUp, History } from "lucide-react";
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
import { formatHours, formatCurrency, hoursToDays } from "@/hooks/useHolidays";
import { useLeaveRules } from "@/hooks/useLeaveRules";
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

interface YearSummary {
  hoursAccrued: number;
  hoursTaken: number;
  totalPaid: number;
  balance: number;
  hoursCarriedOver: number;
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
  allYearSummaries?: Record<string, YearSummary>;
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
  allYearSummaries = {},
}: EmployeeHolidayDetailSheetProps) {
  const { data: leaveRules } = useLeaveRules();
  const [showYearHistory, setShowYearHistory] = useState(false);
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

  const sortedYears = Object.keys(allYearSummaries).sort();
  const hasMultipleYears = sortedYears.length > 1;

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
                <Badge variant="outline" className="text-xs">{year}</Badge>
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
              <p className="text-[10px] text-muted-foreground/70">{hoursToDays(hoursAccrued)} days</p>
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

          {/* Year-over-Year History */}
          {hasMultipleYears && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setShowYearHistory(!showYearHistory)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Year-over-Year History
                </h4>
                {showYearHistory ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showYearHistory && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Comparison table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Year</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Accrued</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Taken</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Paid</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedYears.map((yr) => {
                          const s = allYearSummaries[yr];
                          const isCurrentYear = yr === String(year);
                          return (
                            <tr
                              key={yr}
                              className={cn(
                                "border-b border-border last:border-0",
                                isCurrentYear && "bg-primary/5"
                              )}
                            >
                              <td className="py-2.5">
                                <span className={cn("font-medium", isCurrentYear && "text-primary")}>
                                  {yr}
                                </span>
                                {isCurrentYear && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] py-0 px-1">current</Badge>
                                )}
                              </td>
                              <td className="text-right py-2.5 text-success font-medium">{formatHours(s.hoursAccrued)}</td>
                              <td className="text-right py-2.5">{formatHours(s.hoursTaken)}</td>
                              <td className="text-right py-2.5 text-muted-foreground">{formatCurrency(s.totalPaid)}</td>
                              <td className={cn(
                                "text-right py-2.5 font-semibold",
                                s.balance >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {formatHours(s.balance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td className="py-2.5 font-semibold text-xs text-muted-foreground">TOTAL</td>
                          <td className="text-right py-2.5 font-semibold text-success text-xs">
                            {formatHours(sortedYears.reduce((sum, yr) => sum + allYearSummaries[yr].hoursAccrued, 0))}
                          </td>
                          <td className="text-right py-2.5 font-semibold text-xs">
                            {formatHours(sortedYears.reduce((sum, yr) => sum + allYearSummaries[yr].hoursTaken, 0))}
                          </td>
                          <td className="text-right py-2.5 font-semibold text-muted-foreground text-xs">
                            {formatCurrency(sortedYears.reduce((sum, yr) => sum + allYearSummaries[yr].totalPaid, 0))}
                          </td>
                          <td className="text-right py-2.5 font-semibold text-xs">
                            {(() => {
                              const totalBalance = sortedYears.reduce((sum, yr) => sum + allYearSummaries[yr].balance, 0);
                              return (
                                <span className={totalBalance >= 0 ? "text-success" : "text-destructive"}>
                                  {formatHours(totalBalance)}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Visual bar comparison */}
                  <div className="space-y-2 pt-2">
                    {sortedYears.map((yr) => {
                      const s = allYearSummaries[yr];
                      const maxHours = Math.max(...sortedYears.map(y => Math.max(allYearSummaries[y].hoursAccrued, allYearSummaries[y].hoursTaken)));
                      const accrualWidth = maxHours > 0 ? (s.hoursAccrued / maxHours) * 100 : 0;
                      const takenWidth = maxHours > 0 ? (s.hoursTaken / maxHours) * 100 : 0;
                      return (
                        <div key={yr} className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{yr}</span>
                            <span>{formatHours(s.hoursAccrued)} accrued / {formatHours(s.hoursTaken)} taken</span>
                          </div>
                          <div className="relative h-4 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-success/30"
                              style={{ width: `${accrualWidth}%` }}
                            />
                            <div
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-full",
                                s.hoursTaken > s.hoursAccrued ? "bg-destructive/60" : "bg-primary/60"
                              )}
                              style={{ width: `${takenWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 text-[10px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-success/30" /> Accrued</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary/60" /> Taken</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Leave Law Info */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{leaveRules?.countryName ?? "UK"} Holiday Law</p>
            <p>Accrual rate: {((leaveRules?.accrualRate ?? 0.1207) * 100).toFixed(2)}% of hours worked</p>
            <p>Statutory entitlement: {leaveRules?.statutoryWeeks ?? 5.6} weeks per year</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}