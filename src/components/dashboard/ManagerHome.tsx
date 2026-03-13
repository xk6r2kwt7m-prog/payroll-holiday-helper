import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Clock, AlertTriangle, CheckCircle2, Calendar, CalendarClock,
  ChevronRight, UserX, Megaphone, ClipboardCheck, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useShifts } from "@/hooks/useSchedule";
import { useHolidayRequests } from "@/hooks/useHolidayRequests";
import { useI18n } from "@/hooks/useI18n";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export function ManagerHome() {
  const { t } = useI18n();
  const { data: employees = [] } = useEmployees();
  const activeEmployees = employees.filter(e => e.status === "active");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: shifts = [] } = useShifts(weekStart, weekEnd);
  const { data: holidayRequests = [] } = useHolidayRequests();

  // Time entries for today (clocked in staff)
  const { data: todayEntries = [] } = useQuery({
    queryKey: ["today_clock_ins", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, employees!inner(forename, surname, department)")
        .gte("clock_in_time", `${todayStr}T00:00:00`)
        .lte("clock_in_time", `${todayStr}T23:59:59`)
        .order("clock_in_time", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const todayShifts = shifts.filter((s: any) => s.shift_date === todayStr);
  const clockedInNow = todayEntries.filter((e: any) => !e.clock_out_time);
  const missingClockOut = todayEntries.filter((e: any) => {
    if (e.clock_out_time) return false;
    const clockIn = new Date(e.clock_in_time);
    const hoursAgo = (Date.now() - clockIn.getTime()) / 3600000;
    return hoursAgo > 10;
  });

  const pendingRequests = holidayRequests.filter((r: any) => r.status === "pending");
  const pendingTimesheets = todayEntries.filter((e: any) => e.status === "pending");

  const scheduledToday = todayShifts.length;
  const clockedInCount = clockedInNow.length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const alerts = [
    ...(missingClockOut.length > 0 ? [{ icon: AlertTriangle, label: `${missingClockOut.length} missing clock-out${missingClockOut.length > 1 ? "s" : ""}`, color: "text-destructive", bg: "bg-destructive/10" }] : []),
    ...(pendingRequests.length > 0 ? [{ icon: Calendar, label: `${pendingRequests.length} pending leave request${pendingRequests.length > 1 ? "s" : ""}`, color: "text-warning", bg: "bg-warning/10" }] : []),
    ...(pendingTimesheets.length > 0 ? [{ icon: ClipboardCheck, label: `${pendingTimesheets.length} timesheet${pendingTimesheets.length > 1 ? "s" : ""} to review`, color: "text-accent", bg: "bg-accent/10" }] : []),
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Greeting */}
      <motion.div {...anim} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold text-foreground">{greeting()} 👋</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </motion.div>

      {/* Live Status Strip */}
      <motion.div {...anim} transition={{ duration: 0.3, delay: 0.05 }}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{clockedInCount}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-success mt-1">Working now</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{scheduledToday}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-primary mt-1">Scheduled</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{activeEmployees.length}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Team</p>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.3, delay: 0.1 }}>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Needs Attention</h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl border border-border", alert.bg)}>
                <alert.icon className={cn("h-5 w-5 shrink-0", alert.color)} />
                <span className="text-sm font-medium text-foreground">{alert.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.3, delay: 0.15 }}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: CalendarClock, label: "Rota", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
            { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", color: "text-accent", bg: "bg-accent/10" },
            { icon: Calendar, label: "Leave", path: "/holidays", color: "text-warning", bg: "bg-warning/10" },
            { icon: Megaphone, label: "Announce", path: "/announcements", color: "text-foreground", bg: "bg-secondary" },
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
      {clockedInNow.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.3, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Working Now</h2>
            <Link to="/timesheets" className="text-xs text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {clockedInNow.slice(0, 6).map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
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

      {/* Pending Holiday Requests */}
      {pendingRequests.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.3, delay: 0.25 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Pending Requests</h2>
            <Link to="/holidays" className="text-xs text-primary font-medium flex items-center gap-0.5">
              Review <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {pendingRequests.slice(0, 4).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">
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

      {/* Today's Schedule Overview */}
      {todayShifts.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.3, delay: 0.3 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Today's Schedule</h2>
            <Link to="/schedule" className="text-xs text-primary font-medium flex items-center gap-0.5">
              Full view <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {todayShifts.slice(0, 6).map((shift: any) => (
              <div key={shift.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {shift.employees?.forename} {shift.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)} · {shift.department}
                  </p>
                </div>
                <Badge variant={shift.is_published ? "secondary" : "outline"} className="text-[10px]">
                  {shift.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
