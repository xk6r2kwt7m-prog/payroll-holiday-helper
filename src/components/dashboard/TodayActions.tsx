import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  UserX,
  Calendar,
  DollarSign,
  CreditCard,
  Shield,
  Clock,
  TrendingUp,
  UserPlus,
  GraduationCap,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAbsenceRecords } from "@/hooks/useAbsences";
import { format } from "date-fns";

interface TodayActionsProps {
  employees: any[];
  periods: any[];
  entries: any[];
}

interface ActionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  count?: number;
  href: string;
}

const severityConfig = {
  critical: {
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/8 border-destructive/20 active:bg-destructive/15",
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/8 border-warning/20 active:bg-warning/15",
  },
  info: {
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/8 border-primary/20 active:bg-primary/15",
  },
};

export function TodayActions({ employees, periods, entries }: TodayActionsProps) {
  const navigate = useNavigate();
  const { data: absences = [] } = useAbsenceRecords();

  const actions = useMemo(() => {
    const result: ActionItem[] = [];
    const today = format(new Date(), "yyyy-MM-dd");

    // 1. Absences today
    const todayAbsences = absences.filter(
      (a) => a.start_date <= today && a.end_date >= today
    );
    if (todayAbsences.length > 0) {
      result.push({
        id: "absences-today",
        severity: "critical",
        icon: <UserX className="h-4 w-4" />,
        title: `${todayAbsences.length} absent today`,
        count: todayAbsences.length,
        href: "/absences",
      });
    }

    // 2. Draft payroll needing approval
    const draftPeriods = periods.filter((p) => p.status === "draft");
    if (draftPeriods.length > 0) {
      result.push({
        id: "draft-payroll",
        severity: "critical",
        icon: <DollarSign className="h-4 w-4" />,
        title: `${draftPeriods.length} payroll awaiting approval`,
        count: draftPeriods.length,
        href: "/payroll",
      });
    }

    // 3. Payroll due within 7 days
    const upcomingPay = periods.filter((p) => {
      if (!p.pay_date || p.status === "approved") return false;
      const payDate = new Date(p.pay_date);
      const now = new Date();
      const days = Math.ceil((payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    });
    if (upcomingPay.length > 0) {
      result.push({
        id: "pay-due",
        severity: "critical",
        icon: <Clock className="h-4 w-4" />,
        title: "Payroll due this week",
        href: "/payroll",
      });
    }

    // 4. Missing bank details
    const missingBank = employees.filter(
      (e) => e.status === "active" && (!e.bank_account_no || !e.sort_code)
    );
    if (missingBank.length > 0) {
      result.push({
        id: "missing-bank",
        severity: "critical",
        icon: <CreditCard className="h-4 w-4" />,
        title: `${missingBank.length} missing bank details`,
        count: missingBank.length,
        href: "/employees",
      });
    }

    // 5. Missing NI
    const missingNI = employees.filter(
      (e) => e.status === "active" && !e.ni_number
    );
    if (missingNI.length > 0) {
      result.push({
        id: "missing-ni",
        severity: "warning",
        icon: <Shield className="h-4 w-4" />,
        title: `${missingNI.length} missing NI numbers`,
        count: missingNI.length,
        href: "/employees",
      });
    }

    // 6. Rate discrepancies
    const rateIssues = entries.filter((e: any) => {
      const emp = e.employees;
      return emp && Number(e.hourly_rate) !== Number(emp.hourly_rate);
    });
    if (rateIssues.length > 0) {
      result.push({
        id: "rate-issues",
        severity: "info",
        icon: <TrendingUp className="h-4 w-4" />,
        title: `${rateIssues.length} rate discrepancies`,
        count: rateIssues.length,
        href: "/payroll",
      });
    }

    // 7. Zero-hour entries
    const zeroHours = entries.filter((e: any) => Number(e.timesheet_hours) === 0);
    if (zeroHours.length > 0 && entries.length > 0) {
      result.push({
        id: "zero-hours",
        severity: "info",
        icon: <UserX className="h-4 w-4" />,
        title: `${zeroHours.length} with 0 hours`,
        count: zeroHours.length,
        href: "/payroll",
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [employees, periods, entries, absences]);

  if (actions.length === 0) {
    return (
      <div className="rounded-xl bg-success/8 border border-success/20 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-success">✓ All clear — nothing needs attention right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const cfg = severityConfig[action.severity];
        return (
          <button
            key={action.id}
            onClick={() => navigate(action.href)}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all min-h-[52px]",
              cfg.bg
            )}
          >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.text, "bg-current/10")}>
              <span className={cfg.text}>{action.icon}</span>
            </div>
            <span className="flex-1 text-sm font-semibold text-foreground leading-tight">
              {action.title}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
