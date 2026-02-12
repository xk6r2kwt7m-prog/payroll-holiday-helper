import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatHours, formatCurrency } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface DepartmentData {
  department: string;
  employeeCount: number;
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  avgUsagePercent: number;
  overdrawnCount: number;
}

interface DepartmentHolidaySummaryProps {
  departments: DepartmentData[];
}

const deptConfig: Record<string, { emoji: string; color: string; bgColor: string }> = {
  FOH: { emoji: "🍽️", color: "text-accent", bgColor: "bg-accent/10" },
  BOH: { emoji: "👨‍🍳", color: "text-primary", bgColor: "bg-primary/10" },
  CPU: { emoji: "🏭", color: "text-warning", bgColor: "bg-warning/10" },
};

export function DepartmentHolidaySummary({ departments }: DepartmentHolidaySummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {departments.map((dept) => {
        const config = deptConfig[dept.department] || { emoji: "📋", color: "text-primary", bgColor: "bg-primary/10" };
        const usageColor = dept.avgUsagePercent > 90 ? "text-destructive" : dept.avgUsagePercent > 60 ? "text-warning" : "text-success";

        return (
          <div
            key={dept.department}
            className="rounded-xl bg-card shadow-card border border-transparent p-5 transition-all hover:shadow-elevated hover:border-primary/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{config.emoji}</span>
                <h3 className="font-semibold">{dept.department}</h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {dept.employeeCount}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accrued</span>
                <span className="font-medium text-success">{formatHours(dept.totalAccrued)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taken</span>
                <span className="font-medium text-primary">{formatHours(dept.totalTaken)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-semibold">{formatCurrency(dept.totalPaid)}</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Avg Usage</span>
                  <span className={cn("font-medium", usageColor)}>{dept.avgUsagePercent.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(dept.avgUsagePercent, 100)} className="h-1.5" />
              </div>

              {dept.overdrawnCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs w-full justify-center">
                  {dept.overdrawnCount} overdrawn
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
