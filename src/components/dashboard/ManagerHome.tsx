import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Clock, AlertTriangle, Calendar, CalendarClock,
  ChevronRight, Megaphone, ClipboardCheck, UserCheck,
  UserX, Timer, ShieldAlert, TrendingDown, Search, ArrowRightLeft, Building2,
  CheckCircle2, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useShifts } from "@/hooks/useSchedule";
import { useAllHolidayRequests } from "@/hooks/useHolidayRequests";
import { useI18n } from "@/hooks/useI18n";
import { OperationalAlertsPanel } from "@/components/dashboard/OperationalAlertsPanel";
import { FindCoverSheet } from "@/components/workforce/FindCoverSheet";
import { EmergencyCoverTool } from "@/components/workforce/EmergencyCoverTool";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export function ManagerHome() {
  const { t } = useI18n();
  const { tenantId } = useTenant();
  const { data: employees = [] } = useEmployees();
  const activeEmployees = employees.filter(e => e.status === "active");
  const newStarters = employees.filter(e => e.status === "starter" || (e.status as string) === "onboarding");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: shifts = [] } = useShifts(weekStart, weekEnd);
  const { data: holidayRequests = [] } = useAllHolidayRequests();

  const { data: todayEntries = [] } = useQuery({
    queryKey: ["today_clock_ins", tenantId, todayStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, employees!inner(forename, surname, department)")
        .eq("tenant_id", tenantId)
        .gte("clock_in_time", `${todayStr}T00:00:00`)
        .lte("clock_in_time", `${todayStr}T23:59:59`)
        .order("clock_in_time", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const todayShifts = shifts.filter((s: any) => s.shift_date === todayStr);
  const tomorrowShifts = shifts.filter((s: any) => s.shift_date === tomorrowStr);
  const clockedInNow = todayEntries.filter((e: any) => !e.clock_out_time);

  const missingClockOut = todayEntries.filter((e: any) => {
    if (e.clock_out_time) return false;
    const hoursAgo = (Date.now() - new Date(e.clock_in_time).getTime()) / 3600000;
    return hoursAgo > 10;
  });

  const now = new Date();
  const currentTimeStr = format(now, "HH:mm");
  const clockedInEmployeeIds = new Set(todayEntries.map((e: any) => e.employee_id));

  const lateArrivals = todayShifts.filter((s: any) => {
    if (!s.start_time) return false;
    return s.start_time.slice(0, 5) < currentTimeStr && !clockedInEmployeeIds.has(s.employee_id);
  });

  const missingClockIns = todayShifts.filter((s: any) => {
    if (!s.start_time || !s.employee_id) return false;
    const shiftStart = s.start_time.slice(0, 5);
    const [h, m] = shiftStart.split(":").map(Number);
    const shiftStartDate = new Date();
    shiftStartDate.setHours(h, m + 30, 0, 0);
    return shiftStartDate < now && !clockedInEmployeeIds.has(s.employee_id);
  });

  const unassignedToday = todayShifts.filter((s: any) => !s.employee_id);
  const pendingRequests = holidayRequests.filter((r: any) => r.status === "pending");
  const pendingTimesheets = todayEntries.filter((e: any) => e.status === "pending");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // Build prioritised alerts
  const alerts: { icon: any; label: string; count: number; color: string; bg: string; path: string }[] = [];
  if (missingClockOut.length > 0)
    alerts.push({ icon: AlertTriangle, label: "Missing clock-out", count: missingClockOut.length, color: "text-destructive", bg: "bg-destructive/10", path: "/timesheets" });
  if (missingClockIns.length > 0)
    alerts.push({ icon: UserX, label: "Missing clock-in", count: missingClockIns.length, color: "text-destructive", bg: "bg-destructive/10", path: "/timesheets" });
  if (lateArrivals.length > 0)
    alerts.push({ icon: Timer, label: "Late arrival", count: lateArrivals.length, color: "text-warning", bg: "bg-warning/10", path: "/timesheets" });
  if (unassignedToday.length > 0)
    alerts.push({ icon: TrendingDown, label: "Unassigned shift", count: unassignedToday.length, color: "text-warning", bg: "bg-warning/10", path: "/schedule" });
  if (pendingRequests.length > 0)
    alerts.push({ icon: Calendar, label: "Pending leave", count: pendingRequests.length, color: "text-accent", bg: "bg-accent/10", path: "/holidays?tab=requests" });
  if (pendingTimesheets.length > 0)
    alerts.push({ icon: ClipboardCheck, label: "Timesheets to review", count: pendingTimesheets.length, color: "text-primary", bg: "bg-primary/10", path: "/timesheets" });
  if (newStarters.length > 0)
    alerts.push({ icon: UserCheck, label: "New starter setup", count: newStarters.length, color: "text-accent", bg: "bg-accent/10", path: "/employees" });

  const hasNoAlerts = alerts.length === 0;

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24">
      {/* Greeting */}
      <motion.div {...anim} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold text-foreground">{greeting()} 👋</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </motion.div>

      {/* Workforce Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.03 }}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FindCoverSheet trigger={<Button variant="outline" size="sm" className="flex-shrink-0 rounded-xl h-10"><Search className="h-4 w-4 mr-1.5" /> Find Cover</Button>} />
          <EmergencyCoverTool trigger={<Button variant="destructive" size="sm" className="flex-shrink-0 rounded-xl h-10"><AlertTriangle className="h-4 w-4 mr-1.5" /> Emergency</Button>} />
          <Link to="/workforce"><Button variant="outline" size="sm" className="flex-shrink-0 rounded-xl h-10"><Building2 className="h-4 w-4 mr-1.5" /> Workforce</Button></Link>
        </div>
      </motion.div>

      {/* Live Status Strip */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
        <div className="grid grid-cols-3 gap-2">
          <StatusCard value={clockedInNow.length} label="Working" color="text-success" />
          <StatusCard value={todayShifts.length} label="Scheduled" color="text-primary" />
          <StatusCard value={activeEmployees.length} label="Team" color="text-muted-foreground" />
        </div>
      </motion.div>

      {/* Alerts or All Clear */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
        {hasNoAlerts ? (
          <div className="rounded-xl bg-success/5 border border-success/15 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground">No attendance issues, pending approvals, or staffing gaps right now.</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Needs Attention</h2>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Link key={i} to={alert.path} className={cn("flex items-center gap-3 p-3.5 rounded-xl border border-border shadow-sm", alert.bg)}>
                  <alert.icon className={cn("h-5 w-5 shrink-0", alert.color)} />
                  <span className="text-sm font-medium text-foreground flex-1">{alert.count} {alert.label}{alert.count > 1 ? "s" : ""}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </Link>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Operational Alerts from shift_alerts table */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.1 }}>
        <OperationalAlertsPanel />
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.12 }}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: CalendarClock, label: "Rota", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
            { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", color: "text-accent", bg: "bg-accent/10" },
            { icon: Calendar, label: "Leave", path: "/holidays", color: "text-warning", bg: "bg-warning/10" },
            { icon: Users, label: "Team", path: "/employees", color: "text-foreground", bg: "bg-secondary" },
          ].map((a) => (
            <Link key={a.label} to={a.path} className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-muted transition-colors">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.bg)}>
                <a.icon className={cn("h-5 w-5", a.color)} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Who's Working Now */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.16 }}>
        <SectionHeader title="Working Now" linkTo="/timesheets" />
        {clockedInNow.length > 0 ? (
          <div className="space-y-1.5">
            {clockedInNow.slice(0, 6).map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {entry.employees?.forename} {entry.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Since {format(new Date(entry.clock_in_time), "HH:mm")} · {entry.branch || entry.employees?.department}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No one clocked in right now</p>
            {todayShifts.length > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-1">{todayShifts.length} shift{todayShifts.length > 1 ? "s" : ""} scheduled today</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Attendance Issues — only shown when there are issues (avoids duplication with alerts strip) */}
      {(lateArrivals.length > 0 || missingClockIns.length > 0) && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.2 }}>
          <SectionHeader title="Attendance Issues" linkTo="/timesheets" />
          <div className="space-y-1.5">
            {lateArrivals.slice(0, 4).map((shift: any) => (
              <div key={shift.id} className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20 shadow-sm">
                <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Timer className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {shift.employees?.forename} {shift.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Expected {shift.start_time?.slice(0, 5)} · {shift.department}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-warning border-warning/30 shrink-0">Late</Badge>
              </div>
            ))}
            {missingClockIns.filter((s: any) => !lateArrivals.find((l: any) => l.id === s.id)).slice(0, 3).map((shift: any) => (
              <div key={shift.id} className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 shadow-sm">
                <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <UserX className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {shift.employees?.forename} {shift.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Shift {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)} · No clock-in
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 shrink-0">Missing</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending Leave Requests */}
      {pendingRequests.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.24 }}>
          <SectionHeader title="Pending Requests" linkTo="/holidays?tab=requests" linkLabel="Review" />
          <div className="space-y-1.5">
            {pendingRequests.slice(0, 4).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {req.employees?.forename} {req.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(req.start_date), "d MMM")} – {format(new Date(req.end_date), "d MMM")}
                    {req.hours_requested ? ` · ${req.hours_requested}h` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Pending</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tomorrow's Schedule */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.28 }}>
        <SectionHeader title="Tomorrow" linkTo="/schedule" />
        {tomorrowShifts.length > 0 ? (
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">{tomorrowShifts.length} shift{tomorrowShifts.length > 1 ? "s" : ""}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Scheduled for {format(addDays(new Date(), 1), "EEEE")}
                </p>
              </div>
              <div className="flex -space-x-2">
                {tomorrowShifts.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} className="h-8 w-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">
                      {s.employees?.forename?.[0]}{s.employees?.surname?.[0]}
                    </span>
                  </div>
                ))}
                {tomorrowShifts.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground">+{tomorrowShifts.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No shifts scheduled for tomorrow</p>
            <Link to="/schedule" className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-0.5">
              Open schedule <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatusCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className={cn("text-[10px] uppercase tracking-widest font-semibold mt-1", color)}>{label}</p>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel = "View all" }: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-primary font-medium flex items-center gap-0.5">
          {linkLabel} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
