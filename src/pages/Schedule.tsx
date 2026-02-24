import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift, usePublishWeek, useUnpublishWeek, useCopyPreviousWeek, useLoadTemplate } from "@/hooks/useSchedule";
import { useSaveScheduleTemplate } from "@/hooks/useScheduleTemplates";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RotaGrid } from "@/components/schedule/RotaGrid";
import { DayView } from "@/components/schedule/DayView";
import { ShiftCellDialog } from "@/components/schedule/ShiftCellDialog";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { CopyPreviousWeekDialog } from "@/components/schedule/CopyPreviousWeekDialog";
import { SaveTemplateDialog } from "@/components/schedule/SaveTemplateDialog";
import { LoadTemplateDialog } from "@/components/schedule/LoadTemplateDialog";
import { ComplianceWarningsBanner, useComplianceWarnings } from "@/components/schedule/ComplianceWarnings";
import { getDefaultTimes, type DayOfWeek, DAY_ABBR } from "@/components/schedule/shiftDefaults";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "week" | "day";
const BRANCHES = ["Fitzrovia", "Carnaby", "Brixton"] as const;
const DEPARTMENTS = ["FOH", "BOH", "CPU"] as const;
const DEPT_WITH_ALL = ["All", ...DEPARTMENTS] as const;

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedBranch, setSelectedBranch] = useState<string>("Fitzrovia");
  const [selectedDept, setSelectedDept] = useState<string>("FOH");

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
  const publishWeek = usePublishWeek();
  const unpublishWeek = useUnpublishWeek();
  const copyPrevWeek = useCopyPreviousWeek();
  const loadTemplate = useLoadTemplate();
  const saveTemplate = useSaveScheduleTemplate();

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  // Compliance warnings
  const complianceWarnings = useComplianceWarnings(
    shifts || [],
    activeEmployees,
    weekDays
  );

  // Publish stats for current branch
  const branchShifts = useMemo(
    () => shifts?.filter((s: any) => s.branch === selectedBranch) || [],
    [shifts, selectedBranch]
  );
  const branchDeptShifts = useMemo(
    () => branchShifts.filter((s: any) => s.department === selectedDept),
    [branchShifts, selectedDept]
  );
  const publishedCount = branchShifts.filter((s: any) => s.is_published).length;
  const hasUnpublished = branchShifts.some((s: any) => !s.is_published);

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, viewMode === "week" ? 7 * dir : dir));
  };

  const handleCreateShift = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createShift.mutateAsync({ ...data, created_by: user?.id });
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

  const handlePublish = async () => {
    try {
      await publishWeek.mutateAsync({
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
        branch: selectedBranch,
      });
      toast.success(`${selectedBranch} rota published — staff will be notified`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm("Unpublish this week's rota? Staff will no longer see it.")) return;
    try {
      await unpublishWeek.mutateAsync({
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
        branch: selectedBranch,
      });
      toast.success("Rota unpublished");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyPrevWeek = async (prevStart: string, prevEnd: string) => {
    try {
      const result = await copyPrevWeek.mutateAsync({
        prevStartDate: prevStart,
        prevEndDate: prevEnd,
        targetWeekStart: format(weekStart, "yyyy-MM-dd"),
        branch: selectedBranch,
        department: selectedDept,
      });
      toast.success(`Copied ${(result as any[])?.length || 0} shifts from last week`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveTemplate = async (name: string) => {
    // Get current week's shifts for this branch+dept, map to template format
    const currentShifts = branchDeptShifts.map((s: any) => {
      const shiftDate = new Date(s.shift_date + "T00:00:00");
      const dayOfWeek = shiftDate.getDay() === 0 ? 6 : shiftDate.getDay() - 1; // 0=Mon
      return {
        day_of_week: dayOfWeek,
        employee_id: s.employee_id,
        start_time: s.start_time,
        end_time: s.end_time,
        notes: s.notes || null,
      };
    });

    await saveTemplate.mutateAsync({
      name,
      branch: selectedBranch,
      department: selectedDept,
      shifts: currentShifts,
    });
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const result = await loadTemplate.mutateAsync({
        templateId,
        targetWeekStart: format(weekStart, "yyyy-MM-dd"),
        branch: selectedBranch,
        department: selectedDept,
      });
      toast.success(`Loaded ${(result as any[])?.length || 0} shifts from template`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Day view
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
        <ScheduleHeader
          currentDate={currentDate}
          viewMode={viewMode}
          weekStart={weekStart}
          weekEnd={weekEnd}
          hasUnpublished={hasUnpublished}
          publishedCount={publishedCount}
          totalCount={branchShifts.length}
          isPublishing={publishWeek.isPending}
          onViewModeChange={setViewMode}
          onNavigate={navigate}
          onToday={() => setCurrentDate(new Date())}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          isAdmin={isAdmin}
        />

        {/* Compliance Warnings + Quick Actions toolbar */}
        {isAdmin && viewMode === "week" && (
          <div className="flex flex-wrap items-center gap-2">
            <ComplianceWarningsBanner warnings={complianceWarnings} />
            <div className="flex-1" />
            <CopyPreviousWeekDialog
              currentWeekStart={weekStart}
              branch={selectedBranch}
              department={selectedDept}
              existingShiftCount={branchDeptShifts.length}
              onCopy={handleCopyPrevWeek}
              isPending={copyPrevWeek.isPending}
            />
            <SaveTemplateDialog
              branch={selectedBranch}
              department={selectedDept}
              shiftCount={branchDeptShifts.length}
              onSave={handleSaveTemplate}
              isPending={saveTemplate.isPending}
            />
            <LoadTemplateDialog
              branch={selectedBranch}
              department={selectedDept}
              onLoad={handleLoadTemplate}
              isPending={loadTemplate.isPending}
            />
          </div>
        )}

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
              <Tabs value={selectedDept} onValueChange={setSelectedDept}>
                <TabsList>
                  {DEPT_WITH_ALL.map((d) => (
                    <TabsTrigger key={d} value={d}>
                      {d}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* All Departments stacked view */}
                <TabsContent value="All" className="mt-2 space-y-4">
                  {viewMode === "week" ? (
                    DEPARTMENTS.map((deptVal) => (
                      <div key={deptVal} className="border border-border rounded-lg bg-card overflow-hidden">
                        <div className="px-3 py-2 bg-muted/50 border-b border-border">
                          <h3 className="text-sm font-semibold text-foreground">{deptVal}</h3>
                        </div>
                        <RotaGrid
                          weekDays={weekDays}
                          shifts={shifts || []}
                          allShifts={shifts || []}
                          employees={activeEmployees}
                          branch={branchVal}
                          department={deptVal}
                          isAdmin={isAdmin}
                          onCreateShift={handleCreateShift}
                          onUpdateShift={handleUpdateShift}
                          onDeleteShift={handleDeleteShift}
                          isPending={createShift.isPending || updateShift.isPending}
                          onNavigateToBranch={(b) => setSelectedBranch(b)}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4">
                      Switch to week view to see all departments, or select a specific department for day view.
                    </div>
                  )}
                </TabsContent>

                {DEPARTMENTS.map((deptVal) => (
                  <TabsContent key={deptVal} value={deptVal} className="mt-2">
                    {viewMode === "week" ? (
                      <div className="border border-border rounded-lg bg-card overflow-hidden">
                      <RotaGrid
                          weekDays={weekDays}
                          shifts={shifts || []}
                          allShifts={shifts || []}
                          employees={activeEmployees}
                          branch={branchVal}
                          department={deptVal}
                          isAdmin={isAdmin}
                          onCreateShift={handleCreateShift}
                          onUpdateShift={handleUpdateShift}
                          onDeleteShift={handleDeleteShift}
                          isPending={createShift.isPending || updateShift.isPending}
                          onNavigateToBranch={(b) => setSelectedBranch(b)}
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
