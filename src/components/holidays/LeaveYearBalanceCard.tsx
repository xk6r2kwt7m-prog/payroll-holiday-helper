import { Calendar, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface LeaveYearBalanceCardProps {
  employeeName: string;
  department: string;
  hoursAccrued: number;
  hoursTaken: number;
  hoursCarriedOver: number;
  index: number;
}

const departmentStyles = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

export function LeaveYearBalanceCard({
  employeeName,
  department,
  hoursAccrued,
  hoursTaken,
  hoursCarriedOver,
  index,
}: LeaveYearBalanceCardProps) {
  const totalEntitlement = hoursAccrued + hoursCarriedOver;
  const remaining = totalEntitlement - hoursTaken;
  const usedPercentage = totalEntitlement > 0 ? Math.min((hoursTaken / totalEntitlement) * 100, 100) : 0;
  
  const isOverdrawn = hoursTaken > totalEntitlement;
  const isUnderused = totalEntitlement > 0 && hoursTaken < totalEntitlement * 0.3;
  
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
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-11 w-11 ring-2 ring-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
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
            
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isOverdrawn ? (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Overdrawn
                </Badge>
              ) : isUnderused ? (
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

        {/* Hours breakdown */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Accrued</span>
            <span className="font-medium text-success">{formatHours(hoursAccrued)} hrs</span>
          </div>
          {hoursCarriedOver > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Carried Over</span>
              <span className="font-medium text-accent">{formatHours(hoursCarriedOver)} hrs</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taken</span>
            <span className="font-medium text-primary">{formatHours(hoursTaken)} hrs</span>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between">
            <span className="font-medium">Remaining</span>
            <span className={cn(
              "text-lg font-bold",
              remaining >= 0 ? "text-accent" : "text-destructive"
            )}>
              {formatHours(remaining)} hrs
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Usage</span>
            <span>{usedPercentage.toFixed(0)}%</span>
          </div>
          <Progress 
            value={usedPercentage} 
            className={cn(
              "h-2",
              isOverdrawn && "[&>div]:bg-destructive"
            )} 
          />
        </div>
      </div>
    </div>
  );
}
