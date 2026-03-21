import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock, MapPin, Calendar, ChevronRight, Megaphone, Sun, FileText,
  Coffee, CheckCircle2, AlertCircle, ArrowRight, Pause, Play, Navigation,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useActiveClockIn, useClockInOut, useMyTimeEntries, useUpdateBreakMinutes } from "@/hooks/useTimeEntries";
import { useShifts, useBranchLocations } from "@/hooks/useSchedule";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, isTomorrow, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReadinessBanner } from "@/components/staff-portal/ReadinessBanner";

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

function GpsIndicator({ status, distance }: { status: string; distance?: number | null }) {
  const withinGeofence = distance != null && distance <= 200;
  return (
    <div className="flex items-center gap-2 text-xs justify-center py-1.5 rounded-lg bg-muted/50 px-3">
      <Navigation className={cn(
        "h-3.5 w-3.5",
        status === "granted"
          ? withinGeofence ? "text-success" : "text-warning"
          : status === "denied" ? "text-destructive" : "text-muted-foreground"
      )} />
      <span className={cn(
        "font-medium",
        status === "granted"
          ? withinGeofence ? "text-success" : "text-warning"
          : "text-muted-foreground"
      )}>
        {status === "granted"
          ? withinGeofence
            ? "Within work area"
            : distance != null
              ? `${Math.round(distance)}m from workplace`
              : "Location verified"
          : status === "denied" ? "Enable location services" : "Checking location..."}
      </span>
    </div>
  );
}

function ActiveShiftCard({
  activeEntry,
  elapsedTime,
  onClockOut,
  onBreak,
  isPending,
  isOnBreak,
  breakElapsed,
}: {
  activeEntry: any;
  elapsedTime: string;
  onClockOut: () => void;
  onBreak: () => void;
  isPending: boolean;
  isOnBreak: boolean;
  breakElapsed?: string;
}) {
  return (
    <div className="text-center space-y-4">
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
        isOnBreak ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
      )}>
        <div className={cn("h-2 w-2 rounded-full animate-pulse", isOnBreak ? "bg-warning" : "bg-success")} />
        {isOnBreak ? "On Break" : `On Shift · ${activeEntry.branch}`}
      </div>

      <div className="text-5xl font-mono font-bold text-foreground tracking-tight">
        {elapsedTime || "00:00:00"}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>Started {format(new Date(activeEntry.clock_in_time), "HH:mm")}</span>
        {activeEntry.break_minutes > 0 && (
          <span>· {activeEntry.break_minutes}min break</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onBreak}
          variant="outline"
          className="h-12 rounded-xl text-sm font-semibold"
          disabled={isPending}
        >
          {isOnBreak ? <Play className="h-4 w-4 mr-1.5" /> : <Pause className="h-4 w-4 mr-1.5" />}
          {isOnBreak ? "End Break" : "Start Break"}
        </Button>
        <Button
          onClick={onClockOut}
          disabled={isPending}
          variant="destructive"
          className="h-12 rounded-xl text-sm font-semibold"
        >
          <Clock className="h-4 w-4 mr-1.5" />
          {isPending ? "Ending..." : "Clock Out"}
        </Button>
      </div>
    </div>
  );
}

function ClockInCard({
  gpsStatus,
  gpsDistance,
  selectedBranch,
  setSelectedBranch,
  branches,
  onClockIn,
  isPending,
  hasShiftToday,
  nextShiftTime,
}: {
  gpsStatus: string;
  gpsDistance?: number | null;
  selectedBranch: string;
  setSelectedBranch: (v: string) => void;
  branches: any[];
  onClockIn: () => void;
  isPending: boolean;
  hasShiftToday: boolean;
  nextShiftTime?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {hasShiftToday ? "Ready to start?" : "No shift scheduled"}
        </h2>
        {hasShiftToday && nextShiftTime && (
          <p className="text-sm text-muted-foreground mt-1">
            Shift starts at <span className="font-semibold text-foreground">{nextShiftTime}</span>
          </p>
        )}
        {!hasShiftToday && (
          <p className="text-xs text-muted-foreground mt-1">You can still clock in if needed</p>
        )}
      </div>

      <GpsIndicator status={gpsStatus} distance={gpsDistance} />

      {branches && branches.length > 1 && (
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="h-12 rounded-xl text-sm">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        onClick={onClockIn}
        disabled={isPending || gpsStatus !== "granted"}
        className={cn(
          "w-full h-14 text-base font-semibold rounded-xl",
          !hasShiftToday && "bg-muted-foreground hover:bg-muted-foreground/90"
        )}
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
    { icon: FileText, label: "My Records", path: "/staff", color: "text-foreground", bg: "bg-secondary" },
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

function ShiftCountdown({ shiftStart }: { shiftStart: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

  const today = format(now, "yyyy-MM-dd");
  const shiftDate = new Date(`${today}T${shiftStart}`);
  const minsUntil = differenceInMinutes(shiftDate, now);

  if (minsUntil <= 0 || minsUntil > 480) return null;

  const hrs = Math.floor(minsUntil / 60);
  const mins = minsUntil % 60;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium text-primary">
        Shift starts in {hrs > 0 ? `${hrs}h ` : ""}{mins}min
      </span>
    </div>
  );
}

/* ─── Main component ─── */

export function StaffHome() {
  const { employee, employeeId, isLinked } = useCurrentEmployee();
  const tenantId = employee?.tenant_id ?? null;
  const [gpsStatus, setGpsStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [accumulatedBreakMs, setAccumulatedBreakMs] = useState(0);

  const { data: activeEntry } = useActiveClockIn();
  const clockInOut = useClockInOut();
  const updateBreak = useUpdateBreakMinutes();
  const { data: branches } = useBranchLocations();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: myShifts } = useShifts(weekStart, weekEnd);

  const { data: announcements = [] } = useQuery({
    queryKey: ["staff_announcements_home", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("staff_announcements" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus("granted"); },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-select single branch
  useEffect(() => {
    if (branches && branches.length === 1 && !selectedBranch) {
      setSelectedBranch(branches[0].branch);
    }
  }, [branches, selectedBranch]);

  // Calculate distance to nearest branch
  const gpsDistance = useMemo(() => {
    if (!coords || !branches || branches.length === 0) return null;
    const target = selectedBranch
      ? branches.find((b: any) => b.branch === selectedBranch)
      : branches[0];
    if (!target?.latitude || !target?.longitude) return null;

    const R = 6371000;
    const dLat = ((target.latitude - coords.lat) * Math.PI) / 180;
    const dLon = ((target.longitude - coords.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((coords.lat * Math.PI) / 180) *
      Math.cos((target.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [coords, branches, selectedBranch]);

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
    if (!selectedBranch) { toast.error("Please select a location"); return; }
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
      setIsOnBreak(false);
      setBreakStartTime(null);
    } catch (err: any) {
      toast.error(err.requires_override ? "Outside allowed area to clock out." : err.message);
    }
  };

  const handleBreak = () => {
    if (isOnBreak && breakStartTime) {
      // End break: accumulate elapsed break time and persist
      const breakMs = Date.now() - breakStartTime.getTime();
      const newTotal = accumulatedBreakMs + breakMs;
      setAccumulatedBreakMs(newTotal);
      setIsOnBreak(false);
      setBreakStartTime(null);
      const totalMinutes = Math.round(newTotal / 60000);
      if (activeEntry?.id) {
        updateBreak.mutate({ entryId: activeEntry.id, breakMinutes: totalMinutes });
      }
      toast.success("Break ended");
    } else {
      setIsOnBreak(true);
      setBreakStartTime(new Date());
      toast.success("Break started");
    }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShifts = myShifts?.filter((s: any) => s.shift_date === todayStr) || [];
  const upcomingShifts = myShifts
    ?.filter((s: any) => s.shift_date > todayStr)
    .sort((a: any, b: any) => a.shift_date.localeCompare(b.shift_date))
    .slice(0, 3) || [];

  const nextShiftTime = todayShifts.length > 0 ? todayShifts[0].start_time?.slice(0, 5) : null;

  // Pending requests count
  const { data: myRequests = [] } = useQuery({
    queryKey: ["my_holiday_requests_count"],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("holiday_requests")
        .select("id, status")
        .eq("employee_id", employeeId)
        .eq("status", "pending");
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  // Today's worked hours from active entry only (not full timesheet history)
  const todayWorkedDisplay = activeEntry
    ? elapsedTime?.slice(0, 5) || "0:00"
    : "0h";

  const isOnboarding = employee?.status === "onboarding" || employee?.status === "starter";

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <GreetingHeader name={employee?.forename || ""} />

      {/* Onboarding / Readiness banner for new employees */}
      {employeeId && isOnboarding && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.01 }}>
          <ReadinessBanner employeeId={employeeId} />
          <Link
            to="/employee-onboarding"
            className="mt-2 flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 active:bg-primary/10 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Complete your onboarding</p>
              <p className="text-xs text-muted-foreground">Finish your setup to get ready for work</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </Link>
        </motion.div>
      )}

      {/* Shift Countdown */}
      {!activeEntry && nextShiftTime && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.02 }}>
          <ShiftCountdown shiftStart={nextShiftTime} />
        </motion.div>
      )}

      {/* Primary Time Action */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
        <div className={cn(
          "rounded-2xl p-5 border transition-all",
          activeEntry
            ? isOnBreak ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"
            : "border-border bg-card shadow-sm"
        )}>
          {activeEntry ? (
            <ActiveShiftCard
              activeEntry={activeEntry}
              elapsedTime={elapsedTime}
              onClockOut={handleClockOut}
              onBreak={handleBreak}
              isPending={clockInOut.isPending}
              isOnBreak={isOnBreak}
            />
          ) : (
            <ClockInCard
              gpsStatus={gpsStatus}
              gpsDistance={gpsDistance}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              branches={branches || []}
              onClockIn={handleClockIn}
              isPending={clockInOut.isPending}
              hasShiftToday={todayShifts.length > 0}
              nextShiftTime={nextShiftTime}
            />
          )}
        </div>
      </motion.div>

      {/* Today Summary */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground tabular-nums">
              {todayShifts.length > 0
                ? `${todayShifts[0].start_time?.slice(0, 5)}`
                : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">
              {todayShifts.length > 0 ? "Shift" : "Day Off"}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground tabular-nums">{todayWorkedDisplay}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Worked</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3.5 text-center shadow-sm">
            <p className={cn("text-lg font-bold tabular-nums", myRequests.length > 0 ? "text-warning" : "text-foreground")}>
              {myRequests.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">Pending</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.12 }}>
        <QuickActionGrid />
      </motion.div>

      {/* Upcoming Shifts */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.16 }}>
        <SectionHeader title="Upcoming Shifts" linkTo="/schedule" />
        {upcomingShifts.length > 0 ? (
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
        ) : (
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No upcoming shifts this week</p>
            <Link to="/schedule" className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-0.5">
              View full schedule <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </motion.div>

      {/* Announcements */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.2 }}>
        <SectionHeader title="Updates" linkTo="/announcements" />
        {announcements.length > 0 ? (
          <div className="space-y-2">
            {announcements.map((ann: any) => (
              <div key={ann.id} className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(ann.published_at), "d MMM")}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No recent updates</p>
          </div>
        )}
      </motion.div>
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
