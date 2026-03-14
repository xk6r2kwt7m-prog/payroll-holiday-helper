import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, DollarSign, Calendar, CalendarClock, ChevronRight,
  Clock, Settings, MapPin, FileText, AlertTriangle, UserPlus,
  ShieldAlert, BarChart3, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useShifts } from "@/hooks/useSchedule";
import { useAllHolidayRequests } from "@/hooks/useHolidayRequests";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { useI18n } from "@/hooks/useI18n";
import { useTenant } from "@/hooks/useTenant";
import { OperationalAlertsPanel } from "@/components/dashboard/OperationalAlertsPanel";
import { DocumentRequestsWidget } from "@/components/dashboard/DocumentRequestsWidget";
import { TeamReadinessWidget } from "@/components/dashboard/TeamReadinessWidget";
import { SetupHealthWidget } from "@/components/dashboard/SetupHealthWidget";
import { useSetupHealth } from "@/hooks/useSetupHealth";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export function AdminHome() {
  const { t } = useI18n();
  const { tenantName } = useTenant();
  const setupHealth = useSetupHealth();
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriod = periods[0];
  const { data: entries = [] } = usePayrollEntries(latestPeriod?.id);
  const { data: holidayRequests = [] } = useAllHolidayRequests();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: shifts = [] } = useShifts(weekStart, weekEnd);

  const { data: todayEntries = [] } = useQuery({
    queryKey: ["today_clock_ins_admin", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, employees!inner(forename, surname, department)")
        .gte("clock_in_time", `${todayStr}T00:00:00`)
        .lte("clock_in_time", `${todayStr}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
  });

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalPayroll = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const todayShifts = shifts.filter((s: any) => s.shift_date === todayStr);
  const clockedInNow = todayEntries.filter((e: any) => !e.clock_out_time);
  const pendingRequests = holidayRequests.filter((r: any) => r.status === "pending");

  const missingClockOut = todayEntries.filter((e: any) => {
    if (e.clock_out_time) return false;
    return (Date.now() - new Date(e.clock_in_time).getTime()) / 3600000 > 10;
  });

  // New tenant = setup incomplete and no active employees
  const isNewTenant = !setupHealth.isFullySetup && activeEmployees === 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // KPIs — only meaningful when tenant has data
  const kpis = [
    { label: "Staff", value: String(activeEmployees), color: "text-foreground", icon: Users, bg: "bg-secondary", path: "/employees" },
    { label: "Working", value: String(clockedInNow.length), color: "text-success", icon: Clock, bg: "bg-success/10", path: "/timesheets" },
    { label: "Payroll", value: formatCurrency(totalPayroll), color: "text-primary", icon: DollarSign, bg: "bg-primary/10", path: "/payroll" },
    { label: "Scheduled", value: String(todayShifts.length), color: "text-accent", icon: CalendarClock, bg: "bg-accent/10", path: "/schedule" },
  ];

  // Alerts
  const alerts: { icon: any; label: string; color: string; bg: string; path: string }[] = [];
  if (missingClockOut.length > 0) {
    alerts.push({ icon: AlertTriangle, label: `${missingClockOut.length} missing clock-out`, color: "text-destructive", bg: "bg-destructive/10", path: "/timesheets" });
  }
  if (pendingRequests.length > 0) {
    alerts.push({ icon: Calendar, label: `${pendingRequests.length} pending leave request${pendingRequests.length > 1 ? "s" : ""}`, color: "text-warning", bg: "bg-warning/10", path: "/holidays" });
  }

  // Quick links for admin
  const quickLinks = [
    { icon: Users, label: "People", path: "/employees", color: "text-primary", bg: "bg-primary/10" },
    { icon: DollarSign, label: "Payroll", path: "/payroll", color: "text-accent", bg: "bg-accent/10" },
    { icon: CalendarClock, label: "Schedule", path: "/schedule", color: "text-warning", bg: "bg-warning/10" },
    { icon: Settings, label: "Settings", path: "/settings", color: "text-foreground", bg: "bg-secondary" },
  ];

  const moduleLinks = [
    { icon: Calendar, label: "Holidays", path: "/holidays", desc: `${pendingRequests.length} pending` },
    { icon: UserPlus, label: "Onboarding", path: "/onboarding", desc: "Manage new starters" },
    { icon: MapPin, label: "Locations", path: "/locations", desc: "Branches & geofences" },
    { icon: FileText, label: "Contracts", path: "/contracts", desc: "Templates & signing" },
    { icon: BarChart3, label: "Analytics", path: "/payroll/analytics", desc: "Labour & payroll" },
    { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary", desc: "Records & actions" },
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24">
      {/* Greeting */}
      <motion.div {...anim} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold text-foreground">
          {isNewTenant ? `Welcome to ${tenantName || "your workspace"} 🎉` : `${greeting()} 👋`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isNewTenant
            ? "Let's get your workspace ready. Complete the steps below to start managing your team."
            : `${tenantName || "Dashboard"} · ${format(new Date(), "EEEE, d MMMM")}`}
        </p>
      </motion.div>

      {/* Setup Health — shows only when setup is incomplete */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.02 }}>
        <SetupHealthWidget />
      </motion.div>

      {/* KPI Strip — hide when all zeros for new tenants */}
      {!isNewTenant && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((kpi) => (
              <Link key={kpi.label} to={kpi.path} className="rounded-xl bg-card border border-border p-3 text-center shadow-sm active:bg-muted transition-all">
                <p className={cn("text-lg font-bold tabular-nums leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-1.5 uppercase tracking-wider">{kpi.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Alerts</h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <Link key={i} to={alert.path} className={cn("flex items-center gap-3 p-3.5 rounded-xl border border-border shadow-sm", alert.bg)}>
                <alert.icon className={cn("h-5 w-5 shrink-0", alert.color)} />
                <span className="text-sm font-medium text-foreground flex-1">{alert.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.12 }}>
        <div className="grid grid-cols-4 gap-2">
          {quickLinks.map((a) => (
            <Link key={a.label} to={a.path} className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-muted transition-colors">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.bg)}>
                <a.icon className={cn("h-5 w-5", a.color)} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Operational Alerts */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.14 }}>
        <OperationalAlertsPanel />
      </motion.div>

      {/* Document Requests */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.15 }}>
        <DocumentRequestsWidget />
      </motion.div>

      {/* Team Readiness */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.155 }}>
        <TeamReadinessWidget />
      </motion.div>

      {latestPeriod && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.16 }}>
          <SectionHeader title="Payroll" linkTo="/payroll" />
          <Link to="/payroll" className="block rounded-xl bg-card border border-border p-4 shadow-sm active:bg-muted transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{latestPeriod.period_name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {entries.length} employees · {formatCurrency(totalPayroll)}
                </p>
              </div>
              <Badge variant={(latestPeriod as any).status === "closed" ? "secondary" : "outline"} className="text-[10px]">
                {(latestPeriod as any).status || "Open"}
              </Badge>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Module Access */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.2 }}>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Modules</h2>
        <div className="grid grid-cols-2 gap-2">
          {moduleLinks.map((mod) => (
            <Link key={mod.label} to={mod.path} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm active:bg-muted transition-all">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <mod.icon className="h-4.5 w-4.5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Who's Working */}
      {clockedInNow.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.24 }}>
          <SectionHeader title="Working Now" linkTo="/timesheets" />
          <div className="space-y-1.5">
            {clockedInNow.slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.employees?.forename} {entry.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Since {format(new Date(entry.clock_in_time), "HH:mm")} · {entry.branch || entry.employees?.department}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SectionHeader({ title, linkTo }: { title: string; linkTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-primary font-medium flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
