import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClockIn, useClockInOut, useMyTimeEntries } from "@/hooks/useTimeEntries";
import { useShifts, useBranchLocations } from "@/hooks/useSchedule";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Clock, MapPin, LogOut, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StaffPortal() {
  const { user, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState("");

  const { data: activeEntry, isLoading: loadingActive } = useActiveClockIn();
  const clockInOut = useClockInOut();
  const { data: myEntries } = useMyTimeEntries();
  const { data: branches } = useBranchLocations();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: myShifts } = useShifts(weekStart, weekEnd);

  // Get employee record
  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id, forename, surname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmployeeId(data.id);
          setEmployeeName(`${data.forename} ${data.surname}`);
        }
      });
  }, [user]);

  // Get GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("granted");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!activeEntry?.clock_in_time) return;
    const interval = setInterval(() => {
      const start = new Date(activeEntry.clock_in_time).getTime();
      const diff = Date.now() - start;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEntry?.clock_in_time]);

  const handleClockIn = async () => {
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }
    try {
      await clockInOut.mutateAsync({
        action: "clock_in",
        latitude: coords?.lat,
        longitude: coords?.lng,
        branch: selectedBranch,
      });
      toast.success("Clocked in!");
    } catch (err: any) {
      if (err.requires_override) {
        toast.error("You're outside the allowed area. Ask your manager to override.");
      } else {
        toast.error(err.message);
      }
    }
  };

  const handleClockOut = async () => {
    try {
      await clockInOut.mutateAsync({
        action: "clock_out",
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      toast.success("Clocked out!");
    } catch (err: any) {
      if (err.requires_override) {
        toast.error("You're outside the allowed area to clock out. Ask your manager.");
      } else {
        toast.error(err.message);
      }
    }
  };

  if (!employeeId && !loadingActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account hasn't been linked to an employee record yet. Please contact your manager.
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayShifts = myShifts?.filter(
    (s: any) => s.shift_date === format(new Date(), "yyyy-MM-dd")
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">👋 {employeeName}</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE d MMMM yyyy")}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* GPS Status */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className={cn("h-4 w-4", gpsStatus === "granted" ? "text-success" : "text-destructive")} />
          <span className={gpsStatus === "granted" ? "text-success" : "text-destructive"}>
            {gpsStatus === "granted" ? "Location enabled" : gpsStatus === "denied" ? "Location denied – enable GPS" : gpsStatus === "loading" ? "Getting location..." : "GPS unavailable"}
          </span>
        </div>

        {/* Clock In/Out Card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            {activeEntry ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  On Shift – {activeEntry.branch}
                </div>
                <div className="text-4xl font-mono font-bold text-foreground">
                  {elapsedTime || "00:00:00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(activeEntry.clock_in_time), "HH:mm")}
                </p>
                <Button
                  onClick={handleClockOut}
                  disabled={clockInOut.isPending}
                  variant="destructive"
                  size="lg"
                  className="w-full text-lg h-14"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  {clockInOut.isPending ? "Clocking out..." : "Clock Out"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-1">Ready to start?</h2>
                  <p className="text-sm text-muted-foreground">Select your branch and clock in</p>
                </div>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.branch} value={b.branch}>
                        {b.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleClockIn}
                  disabled={clockInOut.isPending || gpsStatus !== "granted"}
                  size="lg"
                  className="w-full text-lg h-14"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  {clockInOut.isPending ? "Clocking in..." : "Clock In"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Shifts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No shifts scheduled today</p>
            ) : (
              <div className="space-y-2">
                {todayShifts.map((shift: any) => (
                  <div key={shift.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">
                        {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">{shift.department} · {shift.branch}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Scheduled</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Timesheets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Recent Timesheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!myEntries || myEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No recent entries</p>
            ) : (
              <div className="space-y-2">
                {myEntries.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(entry.clock_in_time), "EEE d MMM")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.clock_in_time), "HH:mm")}
                        {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – on shift"}
                        {entry.total_hours ? ` (${entry.total_hours}h)` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", {
                        "text-warning border-warning/30": entry.status === "pending",
                        "text-success border-success/30": entry.status === "approved",
                        "text-destructive border-destructive/30": entry.status === "rejected",
                        "text-primary border-primary/30": entry.status === "clocked_in",
                      })}
                    >
                      {entry.status === "clocked_in" ? "Active" : entry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
