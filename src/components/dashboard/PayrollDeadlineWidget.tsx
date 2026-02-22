import { format, differenceInDays } from "date-fns";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PayrollDeadlineWidgetProps {
  periods: any[];
}

export function PayrollDeadlineWidget({ periods }: PayrollDeadlineWidgetProps) {
  const navigate = useNavigate();

  const upcomingPeriods = periods
    .filter((p) => p.pay_date && p.status !== "approved")
    .map((p) => {
      const payDate = new Date(p.pay_date);
      const daysUntil = differenceInDays(payDate, new Date());
      return { ...p, daysUntil };
    })
    .filter((p) => p.daysUntil >= -7)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  const approvedRecent = periods
    .filter((p) => p.status === "approved")
    .slice(0, 2);

  if (upcomingPeriods.length === 0 && approvedRecent.length === 0) return null;

  return (
    <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-card-foreground">Payroll Timeline</h3>
      </div>
      <div className="space-y-3">
        {upcomingPeriods.map((period) => (
          <div
            key={period.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
              period.daysUntil <= 3 ? "bg-destructive/5 border-destructive/20" :
              period.daysUntil <= 7 ? "bg-warning/5 border-warning/20" :
              "bg-muted/50 border-border"
            )}
            onClick={() => navigate("/payroll")}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              period.daysUntil <= 3 ? "bg-destructive/10 text-destructive" :
              period.daysUntil <= 7 ? "bg-warning/10 text-warning" :
              "bg-primary/10 text-primary"
            )}>
              {period.daysUntil <= 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">{period.period_name}</p>
              <p className="text-xs text-muted-foreground">
                Pay date: {format(new Date(period.pay_date), "d MMM yyyy")}
              </p>
            </div>
            <div className="text-right shrink-0">
              {period.daysUntil <= 0 ? (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              ) : (
                <Badge variant="secondary" className={cn(
                  "text-xs",
                  period.daysUntil <= 3 && "bg-destructive/10 text-destructive",
                  period.daysUntil > 3 && period.daysUntil <= 7 && "bg-warning/10 text-warning"
                )}>
                  {period.daysUntil}d left
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{period.status}</p>
            </div>
          </div>
        ))}
        {approvedRecent.map((period) => (
          <div
            key={period.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 shrink-0">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">{period.period_name}</p>
              <p className="text-xs text-muted-foreground">
                {period.approved_at ? `Approved ${format(new Date(period.approved_at), "d MMM")}` : "Approved"}
              </p>
            </div>
            <Badge className="bg-success/10 text-success text-xs">Done</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
