import { Calendar, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Calculator, Lock } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatHours, hoursToDays } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface PeriodBreakdown {
  periodId: string;
  periodName: string;
  accrued: number;
  taken: number;
  paid: number;
}

interface EmployeeHolidayCardProps {
  employeeName: string;
  department: string;
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  balance: number;
  entitlement: number;
  carryOver?: number;
  periodBreakdown: PeriodBreakdown[];
  index: number;
  onViewBreakdown?: () => void;
}

const departmentStyles = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

export function EmployeeHolidayCard({
  employeeName,
  department,
  totalAccrued,
  totalTaken,
  totalPaid,
  balance,
  entitlement,
  carryOver = 0,
  periodBreakdown,
  index,
  onViewBreakdown,
}: EmployeeHolidayCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const usedPercentage = entitlement > 0 ? Math.min((totalTaken / entitlement) * 100, 100) : 0;
  const isOverUsed = totalTaken > totalAccrued;
  const isUnderUsed = totalAccrued > 0 && totalTaken < totalAccrued * 0.5;
  
  const initials = employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-xl bg-card shadow-card border border-transparent overflow-hidden",
        "transition-all duration-300 animate-fade-in",
        "hover:shadow-elevated hover:border-primary/20"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-card-foreground truncate">{employeeName}</h3>
              <Badge variant="secondary" className={cn("text-xs", departmentStyles[department as keyof typeof departmentStyles])}>
                {department}
              </Badge>
            </div>
            
            {/* Balance indicator */}
            <div className="flex items-center gap-2">
              {isOverUsed ? (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Overdrawn
                </Badge>
              ) : isUnderUsed ? (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                  <Minus className="h-3 w-3 mr-1" />
                  Underused
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  On track
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center p-2 rounded-lg bg-success/5 border border-success/10">
            <p className="text-lg font-bold text-success">{formatHours(totalAccrued)}</p>
            <p className="text-[10px] text-muted-foreground/70">{hoursToDays(totalAccrued)} days</p>
            <p className="text-xs text-muted-foreground">Accrued</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p className="text-lg font-bold text-blue-600">{formatHours(carryOver)}</p>
            <p className="text-[10px] text-muted-foreground/70">{hoursToDays(carryOver)} days</p>
            <p className="text-xs text-muted-foreground">Carried Over</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-lg font-bold text-primary">{formatHours(totalTaken)}</p>
            <p className="text-xs text-muted-foreground">Taken</p>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg border",
            balance >= 0 
              ? "bg-accent/5 border-accent/10" 
              : "bg-destructive/5 border-destructive/10"
          )}>
            <p className={cn("text-lg font-bold", balance >= 0 ? "text-accent" : "text-destructive")}>
              {formatHours(balance)}
            </p>
            <p className="text-xs text-muted-foreground">Balance</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Holiday Usage</span>
            <span>{usedPercentage.toFixed(0)}% of entitlement</span>
          </div>
          <Progress 
            value={usedPercentage} 
            className={cn(
              "h-2",
              isOverUsed && "[&>div]:bg-destructive"
            )} 
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formatHours(totalTaken)} of {formatHours(entitlement)} hours used
          </p>
        </div>

        {/* Total Paid */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Total Paid</span>
          <span className="font-semibold text-card-foreground">{formatCurrency(totalPaid)}</span>
        </div>
      </div>

      {/* Period Breakdown Toggle */}
      {periodBreakdown.length > 0 && (
        <>
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="w-full rounded-none border-t border-border h-10 text-sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {periodBreakdown.length} Payroll Period{periodBreakdown.length > 1 ? "s" : ""}
            {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </Button>

          {expanded && (
            <div className="border-t border-border bg-muted/30">
              {periodBreakdown.map((period, i) => (
                <div
                  key={period.periodId}
                  className={cn(
                    "px-5 py-3 text-sm",
                    i !== periodBreakdown.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="font-medium text-card-foreground mb-2">{period.periodName}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Accrued: </span>
                      <span className="text-success font-medium">{formatHours(period.accrued)} hrs</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Taken: </span>
                      <span className="text-primary font-medium">{formatHours(period.taken)} hrs</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid: </span>
                      <span className="font-medium">{formatCurrency(period.paid)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
