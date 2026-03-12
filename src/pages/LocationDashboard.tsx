import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { getBranchEmoji, useTenantBranches, BranchType } from "@/hooks/useBranches";
import { useLocationPulse, PulseStatus } from "@/hooks/useLocationPulse";
import { useEmployees } from "@/hooks/useEmployees";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import { useAbsenceRecords } from "@/hooks/useAbsences";
import { useTrainingRecords } from "@/hooks/useTrainingRecords";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useShifts } from "@/hooks/useSchedule";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  UserX,
  CalendarClock,
  Calendar,
  DollarSign,
  GraduationCap,
  FileText,
  UserPlus,
  ShieldAlert,
  ChevronRight,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors: Record<PulseStatus, { dot: string; bg: string; text: string; border: string }> = {
  green: { dot: "bg-success", bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  amber: { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  red: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

const statusLabel: Record<PulseStatus, string> = {
  green: "All Clear",
  amber: "Attention Needed",
  red: "Urgent Issues",
};

const LocationDashboard = () => {
  const { branch: branchParam } = useParams<{ branch: string }>();
  const branch = decodeURIComponent(branchParam || "") as BranchType;
  const navigate = useNavigate();

  const { data: pulses, isLoading: pulseLoading } = useLocationPulse();
  const { data: employees = [] } = useEmployees();
  const { data: allBranches = [] } = useAllEmployeeBranches();
  const { data: absences = [] } = useAbsenceRecords();
  const { data: training = [] } = useTrainingRecords();
  const { data: periods = [] } = usePayrollPeriods();

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todayShifts = [] } = useShifts(today, today, branch);

  const pulse = pulses?.find(p => p.branch === branch);

  const branchEmpIds = useMemo(() => {
    return new Set(allBranches.filter(b => b.branch === branch).map(b => b.employee_id));
  }, [allBranches, branch]);

  const branchStaff = useMemo(() => {
    return employees.filter(e => e.status === "active" && branchEmpIds.has(e.id));
  }, [employees, branchEmpIds]);

  const todayAbsences = useMemo(() => {
    return absences.filter(
      a => branchEmpIds.has(a.employee_id) && a.start_date <= today && a.end_date >= today
    );
  }, [absences, branchEmpIds, today]);

  const overdueTraining = useMemo(() => {
    return training.filter(
      t => branchEmpIds.has(t.employee_id) && t.expiry_date && t.expiry_date < today
    );
  }, [training, branchEmpIds, today]);

  const latestPeriod = periods[0];
  const latestPeriodId = latestPeriod?.id;
  const { data: entries = [] } = usePayrollEntries(latestPeriodId);

  const branchEntries = useMemo(() => {
    return entries.filter((e: any) => branchEmpIds.has(e.employee_id));
  }, [entries, branchEmpIds]);

  const branchPayroll = branchEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
  const branchHours = branchEntries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);

  if (pulseLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!pulse) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Location not found</p>
          <Button variant="outline" onClick={() => navigate("/locations")}>
            Back to Locations
          </Button>
        </div>
      </AppLayout>
    );
  }

  const colors = statusColors[pulse.overallStatus];

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6 pb-8">
        {/* Back + Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
            onClick={() => navigate("/locations")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            All Locations
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl shrink-0">
              {BRANCH_EMOJI[branch] || "📍"}
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{branch}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn("text-xs font-semibold", colors.text, colors.border)}>
                  <Circle className={cn("h-2 w-2 mr-1 fill-current", colors.text)} />
                  {statusLabel[pulse.overallStatus]}
                </Badge>
                <span className="text-xs text-muted-foreground">{pulse.staffCount} staff</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2 sm:gap-3"
        >
          {[
            { label: "Staff", value: String(pulse.staffCount), icon: Users, color: "text-foreground" },
            { label: "On Shift", value: String(todayShifts.length), icon: CalendarClock, color: "text-primary" },
            { label: "Absent", value: String(todayAbsences.length), icon: UserX, color: todayAbsences.length > 0 ? "text-destructive" : "text-success" },
            { label: "Hours", value: formatHours(branchHours), icon: Clock, color: "text-foreground" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl bg-card border border-border p-3 text-center"
            >
              <kpi.icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
              <p className={cn("text-lg font-bold tabular-nums leading-none", kpi.color)}>{kpi.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{kpi.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Pulse sections as action cards */}
        <div className="space-y-4">
          {pulse.sections.map((section, i) => {
            const sectionColors = statusColors[section.overallStatus];
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("rounded-xl bg-card border shadow-sm", sectionColors.border)}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className={cn("h-2.5 w-2.5 rounded-full", sectionColors.dot)} />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
                    {section.title}
                  </h2>
                  <span className={cn("text-xs font-semibold", sectionColors.text)}>
                    {statusLabel[section.overallStatus]}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {section.items.map((item) => {
                    const itemColors = statusColors[item.status];
                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        className={cn(
                          "flex items-center justify-between gap-3 px-4 py-3 transition-colors min-h-[48px]",
                          item.status !== "green"
                            ? "hover:bg-muted/30"
                            : "hover:bg-muted/20"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {item.status === "green" ? (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          ) : item.status === "red" ? (
                            <AlertTriangle className={cn("h-4 w-4 shrink-0", itemColors.text)} />
                          ) : (
                            <Circle className={cn("h-4 w-4 fill-current shrink-0", itemColors.text)} />
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            item.status !== "green" ? itemColors.text : "text-foreground"
                          )}>
                            {item.count > 0 ? `${item.count} ${item.label}` : item.label === "payroll ready" ? "Payroll ready" : `No ${item.label}`}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* People at this location */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card border border-border shadow-sm"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              People at {branch}
            </h2>
            <Link
              to={`/employees?branch=${branch}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {branchStaff.slice(0, 10).map((emp) => {
              const isAbsent = todayAbsences.some(a => a.employee_id === emp.id);
              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between px-4 py-2.5 min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isAbsent ? "bg-destructive" : "bg-success"
                    )} />
                    <span className="text-sm font-medium text-foreground">
                      {emp.forename} {emp.surname}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {emp.department}
                    </Badge>
                    {isAbsent && (
                      <Badge variant="destructive" className="text-[10px]">
                        Absent
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {branchStaff.length > 10 && (
              <Link
                to={`/employees?branch=${branch}`}
                className="block text-center py-3 text-sm text-primary font-medium hover:bg-muted/30"
              >
                +{branchStaff.length - 10} more
              </Link>
            )}
            {branchStaff.length === 0 && (
              <p className="text-center py-6 text-sm text-muted-foreground">No staff assigned to this location</p>
            )}
          </div>
        </motion.div>

        {/* Payroll summary */}
        {latestPeriod && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Link
              to="/payroll"
              className="rounded-xl bg-card border border-border shadow-sm p-4 sm:p-5 flex items-center justify-between hover:shadow-md transition-shadow min-h-[64px]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{latestPeriod.period_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {branchEntries.length} entries · {formatHours(branchHours)} hrs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(branchPayroll)}</p>
                <Badge variant="secondary" className="text-[10px]">
                  {latestPeriod.status}
                </Badge>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default LocationDashboard;
