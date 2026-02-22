import { useMemo } from "react";
import { AlertTriangle, Clock, DollarSign, UserX, CreditCard, TrendingUp, Shield, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: string;
  href?: string;
}

interface SmartAlertsProps {
  employees: any[];
  periods: any[];
  entries: any[];
}

const severityStyles = {
  critical: "bg-destructive/10 border-destructive/30 text-destructive",
  warning: "bg-warning/10 border-warning/30 text-warning",
  info: "bg-primary/10 border-primary/30 text-primary",
};

const severityBadge = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-primary text-primary-foreground",
};

export function SmartAlerts({ employees, periods, entries }: SmartAlertsProps) {
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const result: Alert[] = [];

    // 1. Employees missing bank details
    const missingBank = employees.filter(
      (e) => e.status === "active" && (!e.bank_account_no || !e.sort_code)
    );
    if (missingBank.length > 0) {
      result.push({
        id: "missing-bank",
        severity: "critical",
        icon: <CreditCard className="h-4 w-4" />,
        title: `${missingBank.length} employee${missingBank.length > 1 ? "s" : ""} missing bank details`,
        description: missingBank.slice(0, 3).map(e => `${e.forename} ${e.surname}`).join(", ") + (missingBank.length > 3 ? ` +${missingBank.length - 3} more` : ""),
        action: "View employees",
        href: "/employees",
      });
    }

    // 2. Employees missing NI number
    const missingNI = employees.filter(
      (e) => e.status === "active" && !e.ni_number
    );
    if (missingNI.length > 0) {
      result.push({
        id: "missing-ni",
        severity: "warning",
        icon: <Shield className="h-4 w-4" />,
        title: `${missingNI.length} employee${missingNI.length > 1 ? "s" : ""} missing NI number`,
        description: "Required for HMRC RTI submissions",
        action: "Update records",
        href: "/employees",
      });
    }

    // 3. Draft payroll periods needing attention
    const draftPeriods = periods.filter((p) => p.status === "draft");
    if (draftPeriods.length > 0) {
      result.push({
        id: "draft-payroll",
        severity: "warning",
        icon: <DollarSign className="h-4 w-4" />,
        title: `${draftPeriods.length} payroll period${draftPeriods.length > 1 ? "s" : ""} in draft`,
        description: draftPeriods.map(p => p.period_name).join(", "),
        action: "Review payroll",
        href: "/payroll",
      });
    }

    // 4. Upcoming pay dates
    const upcomingPayDates = periods.filter((p) => {
      if (!p.pay_date || p.status === "approved") return false;
      const payDate = new Date(p.pay_date);
      const now = new Date();
      const daysUntil = Math.ceil((payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    });
    if (upcomingPayDates.length > 0) {
      result.push({
        id: "upcoming-pay",
        severity: "critical",
        icon: <Clock className="h-4 w-4" />,
        title: "Payroll due within 7 days",
        description: upcomingPayDates.map(p => `${p.period_name}: ${new Date(p.pay_date).toLocaleDateString()}`).join(", "),
        action: "Go to payroll",
        href: "/payroll",
      });
    }

    // 5. Rate discrepancies – entry rate != employee master rate
    const rateDiscrepancies = entries.filter((e: any) => {
      const emp = e.employees;
      if (!emp) return false;
      return Number(e.hourly_rate) !== Number(emp.hourly_rate);
    });
    if (rateDiscrepancies.length > 0) {
      result.push({
        id: "rate-change",
        severity: "info",
        icon: <TrendingUp className="h-4 w-4" />,
        title: `${rateDiscrepancies.length} rate discrepanc${rateDiscrepancies.length > 1 ? "ies" : "y"} detected`,
        description: "Payroll entry rates differ from employee master rates",
        action: "Review payroll",
        href: "/payroll",
      });
    }

    // 6. Employees with no hours in latest period
    const zeroHours = entries.filter((e: any) => Number(e.timesheet_hours) === 0);
    if (zeroHours.length > 0 && entries.length > 0) {
      result.push({
        id: "zero-hours",
        severity: "info",
        icon: <UserX className="h-4 w-4" />,
        title: `${zeroHours.length} employee${zeroHours.length > 1 ? "s" : ""} with 0 hours this period`,
        description: "Check if timesheets need updating before approval",
        action: "Check payroll",
        href: "/payroll",
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [employees, periods, entries]);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-card-foreground">Action Required</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 6).map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
              severityStyles[alert.severity]
            )}
            onClick={() => alert.href && navigate(alert.href)}
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", severityBadge[alert.severity])}>
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
            </div>
            {alert.action && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
