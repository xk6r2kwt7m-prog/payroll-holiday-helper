import { AlertTriangle, TrendingDown, Clock, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface AlertEmployee {
  employeeId: string;
  employeeName: string;
  department: string;
  hoursAccrued: number;
  hoursTaken: number;
  balance: number;
  usagePercent: number;
  expectedUsagePercent: number;
  alertType: "overdrawn" | "at_risk" | "low_usage";
}

interface HolidayAlertsProps {
  alerts: AlertEmployee[];
  onEmployeeClick?: (employeeId: string) => void;
}

const alertConfig = {
  overdrawn: {
    icon: AlertTriangle,
    label: "Overdrawn",
    description: "has taken more holiday than accrued",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    borderClass: "border-l-destructive",
  },
  at_risk: {
    icon: TrendingDown,
    label: "At Risk",
    description: "approaching accrued limit",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    borderClass: "border-l-warning",
  },
  low_usage: {
    icon: Clock,
    label: "Low Usage",
    description: "significantly behind expected usage",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    borderClass: "border-l-primary",
  },
};

export function HolidayAlerts({ alerts, onEmployeeClick }: HolidayAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl bg-success/5 border border-success/20 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 mx-auto mb-3">
          <Clock className="h-6 w-6 text-success" />
        </div>
        <h3 className="font-semibold text-card-foreground">All Clear</h3>
        <p className="text-sm text-muted-foreground mt-1">No holiday alerts at this time</p>
      </div>
    );
  }

  const overdrawnCount = alerts.filter(a => a.alertType === "overdrawn").length;
  const atRiskCount = alerts.filter(a => a.alertType === "at_risk").length;
  const lowUsageCount = alerts.filter(a => a.alertType === "low_usage").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {overdrawnCount > 0 && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {overdrawnCount} Overdrawn
          </Badge>
        )}
        {atRiskCount > 0 && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <TrendingDown className="h-3 w-3 mr-1" />
            {atRiskCount} At Risk
          </Badge>
        )}
        {lowUsageCount > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Clock className="h-3 w-3 mr-1" />
            {lowUsageCount} Low Usage
          </Badge>
        )}
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config = alertConfig[alert.alertType];
          const Icon = config.icon;
          const initials = alert.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);

          return (
            <button
              key={alert.employeeId}
              onClick={() => onEmployeeClick?.(alert.employeeId)}
              className={cn(
                "w-full text-left rounded-lg bg-card border border-border p-3",
                "border-l-4 transition-all hover:shadow-md",
                config.borderClass
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{alert.employeeName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{alert.department}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatHours(alert.hoursTaken)} taken / {formatHours(alert.hoursAccrued)} accrued
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", config.badgeClass)}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
