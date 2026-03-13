import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock, MapPin, Calendar, ChevronRight, Megaphone, Sun, FileText,
  Coffee, CheckCircle2, AlertCircle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClockIn, useClockInOut, useMyTimeEntries } from "@/hooks/useTimeEntries";
import { useShifts, useBranchLocations } from "@/hooks/useSchedule";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

/* ─── Sub-components ─── */

function GreetingHeader({ name }: { name: string }) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };
  return (
    <motion.div {...anim} transition={{ duration: 0.25 }}>
      <h1 className="text-xl font-bold text-foreground">{greeting()}, {name || "there"} 👋</h1>
      <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
    </motion.div>
  );
}

function GpsIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 text-xs justify-center py-1">
      <MapPin className={cn("h-3.5 w-3.5", status === "granted" ? "text-success" : status === "denied" ? "text-destructive" : "text-muted-foreground")} />
      <span className={cn("font-medium", status === "granted" ? "text-success" : "text-muted-foreground")}>
        {status === "granted" ? "Location verified" : status === "denied" ? "Enable location services" : "Checking location..."}
      </span>
    </div>
  );
}

function ActiveShiftCard({
  activeEntry,
  elapsedTime,
  onClockOut,
  isPending,
}: {
  activeEntry: any;
  elapsedTime: string;
  onClockOut: () => void;
  isPending: boolean;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-semibold">
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        On Shift · {activeEntry.branch}
      </div>
      <div className="text-5xl font-mono font-bold text-foreground tracking-tight">
        {elapsedTime || "00:00:00"}
      </div>
      <p className="text-xs text-muted-foreground">
        Started at {format(new Date(activeEntry.clock_in_time), "HH:mm")}
      </p>
      <Button
        onClick={onClockOut}
        disabled={isPending}
        variant="destructive"
        className="w-full h-14 text-base font-semibold rounded-xl"
      >
        <Clock className="h-5 w-5 mr-2" />
        {isPending ? "Clocking out..." : "Clock Out"}
      </Button>
    </div>
  );
}

function ClockInCard({
  gpsStatus,
  selectedBranch,
  setSelectedBranch,
  branches,
  onClockIn,
  isPending,
  hasShiftToday,
}: {
  gpsStatus: string;
  selectedBranch: string;
  setSelectedBranch: (v: string) => void;
  branches: any[];
  onClockIn: () => void;
  isPending: boolean;
  hasShiftToday: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Ready to start?</h2>
        {!hasShiftToday && (
          <p className="text-xs text-warning font-medium mt-1">No shift scheduled today</p>
        )}
      </div>
      <GpsIndicator status={gpsStatus} />
      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
        <SelectTrigger className="h-12 rounded-xl text-sm">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches?.map((b) => (
            <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={onClockIn}
        disabled={isPending || gpsStatus !== "granted"}
        className="w-full h-14 text-base font-semibold rounded-xl"
      >
        <Clock className="h-5 w-5 mr-2" />
        {isPending ? "Clocking in..." : "Clock In"}
      </Button>
    </div>
  );
}

function QuickActionGrid() {
  const actions = [
    { icon: Calendar, label: "Schedule", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
    { icon: Sun, label: "Time Off", path: "/holidays", color: "text-accent", bg: "bg-accent/10" },
    { icon: FileText, label: "Documents", path: "/staff", color: "text-foreground", bg: "bg-secondary" },
    { icon: Megaphone, label: "Updates", path: "/announcements", color: "text-warning", bg: "bg-warning/10" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.path}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-muted transition-colors"
        >
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.bg)}>
            <a.icon className={cn("h-5 w-5", a.color)} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

/* ─── Main component ─── */

export function StaffHome() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");

  const { data: activeEntry } = useActiveClockIn();
  const clockInOut = useClockInOut();
  const { data: myEntries } = useMyTimeEntries();
  const { data: branches } = useBranchLocations();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: myShifts } = useShifts(weekStart, weekEnd);

  const { data: announcements = [] } = useQuery({
    queryKey: ["staff_announcements_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_announcements" as any)
        .select("*")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
  });

  // Resolve employee
  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id, forename, surname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setEmployeeId(data.id); setEmployeeName(data.forename); }
      });
  }, [user]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus("granted"); },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!activeEntry?.clock_in_time) return;
    const tick = () => {
      const diff = Date.now() - new Date(activeEntry.clock_in_time).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeEntry?.clock_in_time]);

  const handleClockIn = async () => {
    if (!selectedBranch) { toast.error("Please select a branch"); return; }
    try {
      await clockInOut.mutateAsync({ action: "clock_in", latitude: coords?.lat, longitude: coords?.lng, branch: selectedBranch });
      toast.success("Clocked in!");
    } catch (err: any) {
      toast.error(err.requires_override ? "Outside allowed area. Ask your manager." : err.message);
    }
  };

  const handleClockOut = async () => {
    try {
      await clockInOut.mutateAsync({ action: "clock_out", latitude: coords?.lat, longitude: coords?.lng });
      toast.success("Clocked out!");
    } catch (err: any) {
      toast.error(err.requires_override ? "Outside allowed area to clock out." : err.message);
    }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShifts = myShifts?.filter((s: any) => s.shift_date === todayStr) || [];
  const upcomingShifts = myShifts
    ?.filter((s: any) => s.shift_date > todayStr)
    .sort((a: any, b: any) => a.shift_date.localeCompare(b.shift_date))
    .slice(0, 3) || [];

  const todayWorkedHours = myEntries
    ?.filter((e: any) => e.clock_in_time && format(new Date(e.clock_in_time), "yyyy-MM-dd") === todayStr && e.total_hours)
    .reduce((sum: number, e: any) => sum + Number(e.total_hours), 0) || 0;

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <GreetingHeader name={employeeName} />

      {/* Primary Time Action */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
        <div className={cn(
          "rounded-2xl p-5 border transition-all",
          activeEntry ? "border-success/30 bg-success/5" : "border-border bg-card shadow-sm"
        )}>
          {activeEntry ? (
            <ActiveShiftCard
              activeEntry={activeEntry}
              elapsedTime={elapsedTime}
              onClockOut={handleClockOut}
              isPending={clockInOut.isPending}
            />
          ) : (
            <ClockInCard
              gpsStatus={gpsStatus}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              branches={branches || []}
              onClockIn={handleClockIn}
              isPending={clockInOut.isPending}
              hasShiftToday={todayShifts.length > 0}
            />
          )}
        </div>
      </motion.div>

      {/* Today Summary */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Today's Shift</p>
            <p className="text-xl font-bold text-foreground mt-1.5 tabular-nums">
              {todayShifts.length > 0
                ? `${todayShifts[0].start_time?.slice(0, 5)} – ${todayShifts[0].end_time?.slice(0, 5)}`
                : "Day off"}
            </p>
            {todayShifts.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">{todayShifts[0].department} · {todayShifts[0].branch}</p>
            )}
          </div>
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Worked Today</p>
            <p className="text-xl font-bold text-foreground mt-1.5 tabular-nums">
              {activeEntry ? elapsedTime?.slice(0, 5) || "0:00" : todayWorkedHours > 0 ? `${todayWorkedHours.toFixed(1)}h` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activeEntry ? "In progress" : todayWorkedHours > 0 ? "Completed" : "Not started"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.12 }}>
        <QuickActionGrid />
      </motion.div>

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.16 }}>
          <SectionHeader title="Upcoming Shifts" linkTo="/schedule" />
          <div className="space-y-2">
            {upcomingShifts.map((shift: any) => {
              const d = new Date(shift.shift_date);
              return (
                <div key={shift.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <span className="text-xs font-bold leading-none">{format(d, "d")}</span>
                    <span className="text-[9px] uppercase leading-none mt-0.5">{format(d, "EEE")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{shift.department} · {shift.branch}</p>
                  </div>
                  {isTomorrow(d) && <Badge variant="secondary" className="text-[10px] shrink-0">Tomorrow</Badge>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.2 }}>
          <SectionHeader title="Updates" linkTo="/announcements" />
          <div className="space-y-2">
            {announcements.map((ann: any) => (
              <div key={ann.id} className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(ann.published_at), "d MMM")}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      {myEntries && myEntries.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.24 }}>
          <SectionHeader title="Recent Activity" />
          <div className="space-y-1.5">
            {myEntries.slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                <div>
                  <p className="text-sm font-medium text-foreground">{format(new Date(entry.clock_in_time), "EEE d MMM")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(entry.clock_in_time), "HH:mm")}
                    {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – on shift"}
                    {entry.total_hours ? ` · ${entry.total_hours}h` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", {
                  "text-warning border-warning/30": entry.status === "pending",
                  "text-success border-success/30": entry.status === "approved",
                  "text-primary border-primary/30": entry.status === "clocked_in",
                })}>
                  {entry.status === "clocked_in" ? "Active" : entry.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Shared helpers ─── */

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
