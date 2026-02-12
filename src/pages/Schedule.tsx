import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useShifts, useBranchLocations, useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RotaGrid } from "@/components/schedule/RotaGrid";
import { DayView } from "@/components/schedule/DayView";
import { ShiftCellDialog } from "@/components/schedule/ShiftCellDialog";
import { getDefaultTimes, type DayOfWeek, DAY_ABBR } from "@/components/schedule/shiftDefaults";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "week" | "day";
const BRANCHES = ["Fitzrovia", "Carnaby", "Brixton"] as const;
const DEPARTMENTS = ["FOH", "BOH", "CPU"] as const;

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedBranch, setSelectedBranch] = useState<string>("Fitzrovia");
  const [selectedDept, setSelectedDept] = useState<string>("FOH");

  // Day view dialog state
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dayDialogShift, setDayDialogShift] = useState<any>(null);

  const { isAdmin } = useAuth();
  const { data: employees } = useEmployees();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: shifts, isLoading } = useShifts(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd")
  );

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, viewMode === "week" ? 7 * dir : dir));
  };

  const handleCreateShift = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createShift.mutateAsync({
        ...data,
        created_by: user?.id,
      });
      toast.success("Shift added");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateShift = async (id: string, updates: any) => {
    try {
      await updateShift.mutateAsync({ id, updates });
      toast.success("Shift updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteShift = (id: string) => {
    if (confirm("Delete this shift?")) {
      deleteShift.mutate(id, {
        onSuccess: () => toast.success("Shift deleted"),
        onError: (err) => toast.error(err.message),
      });
    }
  };

  // Day view shifts
  const dayShifts = useMemo(
    () =>
      shifts?.filter(
        (s: any) =>
          isSameDay(new Date(s.shift_date + "T00:00:00"), currentDate) &&
          s.branch === selectedBranch &&
          s.department === selectedDept
      ) || [],
    [shifts, currentDate, selectedBranch, selectedDept]
  );

  const getDayAbbr = (d: Date): DayOfWeek =>
    DAY_ABBR[d.getDay() === 0 ? 6 : d.getDay() - 1];

  const dayDefaults = getDefaultTimes(selectedDept as any, getDayAbbr(currentDate));
  const deptEmployees = useMemo(
    () => activeEmployees.filter((e) => e.department === selectedDept),
    [activeEmployees, selectedDept]
  );

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
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[220px] text-center">
            {viewMode === "week"
              ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
              : format(currentDate, "EEE d MMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Branch Tabs */}
        <Tabs value={selectedBranch} onValueChange={setSelectedBranch}>
          <TabsList className="w-full justify-start">
            {BRANCHES.map((b) => (
              <TabsTrigger key={b} value={b} className="flex-1 sm:flex-none">
                {b}
              </TabsTrigger>
            ))}
          </TabsList>

          {BRANCHES.map((branchVal) => (
            <TabsContent key={branchVal} value={branchVal} className="mt-3 space-y-4">
              {/* Department Sub-tabs */}
              <Tabs value={selectedDept} onValueChange={setSelectedDept}>
                <TabsList>
                  {DEPARTMENTS.map((d) => (
                    <TabsTrigger key={d} value={d}>
                      {d}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {DEPARTMENTS.map((deptVal) => (
                  <TabsContent key={deptVal} value={deptVal} className="mt-2">
                    {viewMode === "week" ? (
                      <div className="border border-border rounded-lg bg-card overflow-hidden">
                        <RotaGrid
                          weekDays={weekDays}
                          shifts={shifts || []}
                          employees={activeEmployees}
                          branch={branchVal}
                          department={deptVal}
                          isAdmin={isAdmin}
                          onCreateShift={handleCreateShift}
                          onUpdateShift={handleUpdateShift}
                          onDeleteShift={handleDeleteShift}
                          isPending={createShift.isPending || updateShift.isPending}
                        />
                      </div>
                    ) : (
                      <>
                        <DayView
                          date={currentDate}
                          shifts={dayShifts}
                          branch={branchVal}
                          department={deptVal}
                          isAdmin={isAdmin}
                          onAddClick={() => {
                            setDayDialogShift(null);
                            setDayDialogOpen(true);
                          }}
                          onEditClick={(shift) => {
                            setDayDialogShift(shift);
                            setDayDialogOpen(true);
                          }}
                          onDeleteClick={handleDeleteShift}
                        />
                        <ShiftCellDialog
                          open={dayDialogOpen}
                          onOpenChange={setDayDialogOpen}
                          date={format(currentDate, "EEE d MMM")}
                          branch={branchVal}
                          department={deptVal}
                          employees={deptEmployees}
                          defaultStart={dayDefaults.start}
                          defaultEnd={dayDefaults.end}
                          existingShift={dayDialogShift}
                          onSave={async (data) => {
                            if (dayDialogShift) {
                              await handleUpdateShift(dayDialogShift.id, {
                                employee_id: data.employee_id,
                                start_time: data.start_time,
                                end_time: data.end_time,
                                notes: data.notes || null,
                                status: data.employee_id ? "scheduled" : "open",
                              });
                            } else {
                              await handleCreateShift({
                                shift_date: format(currentDate, "yyyy-MM-dd"),
                                branch: branchVal,
                                department: deptVal,
                                employee_id: data.employee_id,
                                start_time: data.start_time,
                                end_time: data.end_time,
                                notes: data.notes || null,
                                status: data.employee_id ? "scheduled" : "open",
                              });
                            }
                            setDayDialogOpen(false);
                          }}
                          onDelete={(id) => {
                            handleDeleteShift(id);
                            setDayDialogOpen(false);
                          }}
                          isPending={createShift.isPending || updateShift.isPending}
                        />
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
