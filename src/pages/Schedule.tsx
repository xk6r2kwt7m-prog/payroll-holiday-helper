import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useShifts, useBranchLocations, useCreateShift, useDeleteShift } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "day";

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { isAdmin } = useAuth();
  const { data: branches } = useBranchLocations();
  const { data: employees } = useEmployees();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: shifts, isLoading } = useShifts(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd"),
    selectedBranch !== "all" ? selectedBranch : undefined
  );

  const createShift = useCreateShift();
  const deleteShift = useDeleteShift();

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, viewMode === "week" ? 7 * dir : dir));
  };

  const shiftsForDay = (day: Date) =>
    shifts?.filter((s) => isSameDay(new Date(s.shift_date + "T00:00:00"), day)) || [];

  // Add shift form state
  const [newShift, setNewShift] = useState({
    employee_id: "",
    branch: "Fitzrovia" as string,
    department: "FOH" as string,
    start_time: "11:30",
    end_time: "22:00",
  });

  const handleAddShift = async () => {
    const targetDate = selectedDay || currentDate;
    try {
      const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      await createShift.mutateAsync({
        employee_id: newShift.employee_id || null,
        branch: newShift.branch as any,
        department: newShift.department as any,
        shift_date: format(targetDate, "yyyy-MM-dd"),
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        status: newShift.employee_id ? "scheduled" : "open",
        created_by: user?.id,
      });
      toast.success("Shift added");
      setShowAddShift(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "day" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                )}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "week" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                )}
              >
                Week
              </button>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.branch} value={b.branch}>
                    {b.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Shift</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={format(selectedDay || currentDate, "yyyy-MM-dd")}
                        onChange={(e) => setSelectedDay(new Date(e.target.value + "T00:00:00"))}
                      />
                    </div>
                    <div>
                      <Label>Employee (leave empty for open shift)</Label>
                      <Select value={newShift.employee_id} onValueChange={(v) => setNewShift((p) => ({ ...p, employee_id: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Open Shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open Shift</SelectItem>
                          {activeEmployees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.forename} {e.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Branch</Label>
                        <Select value={newShift.branch} onValueChange={(v) => setNewShift((p) => ({ ...p, branch: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fitzrovia">Fitzrovia</SelectItem>
                            <SelectItem value="Carnaby">Carnaby</SelectItem>
                            <SelectItem value="Brixton">Brixton</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Department</Label>
                        <Select value={newShift.department} onValueChange={(v) => setNewShift((p) => ({ ...p, department: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FOH">FOH</SelectItem>
                            <SelectItem value="BOH">BOH</SelectItem>
                            <SelectItem value="CPU">CPU</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={newShift.start_time}
                          onChange={(e) => setNewShift((p) => ({ ...p, start_time: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={newShift.end_time}
                          onChange={(e) => setNewShift((p) => ({ ...p, end_time: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddShift} disabled={createShift.isPending} className="w-full">
                      {createShift.isPending ? "Adding..." : "Add Shift"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {viewMode === "week"
              ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
              : format(currentDate, "EEE d MMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        {/* Week View */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayShifts = shiftsForDay(day);
              return (
                <div key={day.toISOString()} className="min-h-[120px]">
                  <div
                    className={cn(
                      "text-center text-sm font-medium py-1.5 rounded-t-lg",
                      isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className="text-lg">{format(day, "d")}</div>
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayShifts.map((shift: any) => (
                      <div
                        key={shift.id}
                        className={cn(
                          "p-1.5 rounded text-xs cursor-pointer transition-colors",
                          shift.status === "open"
                            ? "bg-accent/20 text-accent border border-accent/30"
                            : "bg-success/15 text-success-foreground border border-success/20 bg-success/10"
                        )}
                        onClick={() => {
                          if (isAdmin) {
                            if (confirm("Delete this shift?")) {
                              deleteShift.mutate(shift.id);
                            }
                          }
                        }}
                      >
                        <div className="font-medium truncate">
                          {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                        </div>
                        <div className="truncate">
                          {shift.employees
                            ? `${shift.employees.forename}`
                            : "Open"}
                        </div>
                        {shift.status === "open" && (
                          <Badge variant="outline" className="mt-0.5 text-[10px] px-1 py-0">
                            Open
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Day View */}
        {viewMode === "day" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {format(currentDate, "EEEE d MMMM")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shiftsForDay(currentDate).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No shifts scheduled for this day
                </p>
              ) : (
                shiftsForDay(currentDate).map((shift: any) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {shift.employees
                          ? shift.employees.forename[0]
                          : "?"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {shift.employees
                            ? `${shift.employees.forename} ${shift.employees.surname}`
                            : "Open Shift"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.department} · {shift.branch}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={shift.status === "open" ? "outline" : "secondary"}
                      className="text-xs"
                    >
                      {shift.status === "open" ? "Open" : "Scheduled"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
