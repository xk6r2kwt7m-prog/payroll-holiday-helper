import { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift, usePublishWeek, useUnpublishWeek, useCopyPreviousWeek, useLoadTemplate, useBulkDeleteShifts, useBulkUpdateShifts } from "@/hooks/useSchedule";
import { useSaveScheduleTemplate } from "@/hooks/useScheduleTemplates";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { RotaGrid } from "@/components/schedule/RotaGrid";
import { DayView } from "@/components/schedule/DayView";
import { ShiftCellDialog } from "@/components/schedule/ShiftCellDialog";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleSummary } from "@/components/schedule/ScheduleSummary";
import { ScheduleFilters, type QuickFilter } from "@/components/schedule/ScheduleFilters";
import { PublishConfirmDrawer } from "@/components/schedule/PublishConfirmDrawer";
import { SaveTemplateDialog } from "@/components/schedule/SaveTemplateDialog";
import { LoadTemplateDialog } from "@/components/schedule/LoadTemplateDialog";
import { CopyPreviousWeekDialog } from "@/components/schedule/CopyPreviousWeekDialog";
import { ComplianceWarningsBanner, useComplianceWarnings } from "@/components/schedule/ComplianceWarnings";
import { getDefaultTimes, getMinimumStaff, type DayOfWeek, DAY_ABBR } from "@/components/schedule/shiftDefaults";
import { MobileShiftWizard } from "@/components/schedule/MobileShiftWizard";
import { MobileManagerBar } from "@/components/schedule/MobileManagerBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBulkCreateShifts } from "@/hooks/useSchedule";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "week" | "day";
const DEPARTMENTS = ["FOH", "BOH", "CPU"] as const;
const DEPT_WITH_ALL = ["All", ...DEPARTMENTS] as const;

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("FOH");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);

  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dayDialogShift, setDayDialogShift] = useState<any>(null);

  // Template dialog states
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const [copyPrevOpen, setCopyPrevOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialDay, setWizardInitialDay] = useState<Date | null>(null);

  const { isAdmin } = useAuth();
  const { tenantId } = useTenant();
  const { sendNotification } = useNotifications();
  const { data: companySettings } = useCompanySettings();
  const { data: employees } = useEmployees();
  const isMobile = useIsMobile();

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
  const bulkDelete = useBulkDeleteShifts();
  const bulkUpdate = useBulkUpdateShifts();
  const bulkCreate = useBulkCreateShifts();

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  const complianceWarnings = useComplianceWarnings(
    shifts || [],
    activeEmployees,
    weekDays
  );

  const branchShifts = useMemo(
    () => shifts?.filter((s: any) => s.branch === selectedBranch) || [],
    [shifts, selectedBranch]
  );
  const branchDeptShifts = useMemo(
    () => selectedDept === "All"
      ? branchShifts
      : branchShifts.filter((s: any) => s.department === selectedDept),
    [branchShifts, selectedDept]
  );
  const publishedCount = branchShifts.filter((s: any) => s.is_published).length;
  const unpublishedCount = branchShifts.filter((s: any) => !s.is_published && s.employee_id).length;
  const openShiftCount = branchShifts.filter((s: any) => !s.employee_id).length;
  const hasUnpublished = branchShifts.some((s: any) => !s.is_published);

  // Filter stats for quick filters
  const filterStats = useMemo(() => {
    const deptShifts = branchDeptShifts;
    const deptEmployees = activeEmployees.filter((e) =>
      selectedDept === "All" || e.department === selectedDept
    );
    const employeesWithShifts = new Set(
      deptShifts.filter((s: any) => s.employee_id).map((s: any) => s.employee_id)
    );
    const noShiftCount = deptEmployees.filter((e) => !employeesWithShifts.has(e.id)).length;
    const unassignedCount = deptShifts.filter((s: any) => !s.employee_id).length;
    const unpublished = deptShifts.filter((s: any) => !s.is_published).length;

    // Gap count
    let gapCount = 0;
    const dept = selectedDept === "All" ? "FOH" : selectedDept;
    for (const day of weekDays) {
      const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
      const dayShifts = deptShifts.filter((s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), day)
      );
      const assigned = dayShifts.filter((s: any) => s.employee_id).length;
      const min = getMinimumStaff(selectedBranch, dept as any, dayAbbr);
      if (assigned < min) gapCount++;
    }

    return { gapCount, unassignedCount, noShiftCount, unpublished };
  }, [branchDeptShifts, activeEmployees, selectedDept, selectedBranch, weekDays]);

  // Coverage understaffed days for publish drawer
  const understaffedDays = useMemo(() => {
    let count = 0;
    const dept = selectedDept === "All" ? "FOH" : selectedDept;
    for (const day of weekDays) {
      const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
      const dayShifts = branchDeptShifts.filter((s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), day)
      );
      const assigned = dayShifts.filter((s: any) => s.employee_id).length;
      const min = getMinimumStaff(selectedBranch, dept as any, dayAbbr);
      if (assigned < min) count++;
    }
    return count;
  }, [branchDeptShifts, selectedBranch, selectedDept, weekDays]);

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, viewMode === "week" ? 7 * dir : dir));
  };

  const handleCreateShift = async (data: any) => {
    if (!tenantId) {
      toast.error("Unable to create shift: no workspace selected. Please reload and try again.");
      return;
    }
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
      const adminEmail = companySettings?.company_email;
      if (adminEmail) {
        sendNotification({
          to: adminEmail,
          subject: `Schedule Published: ${selectedBranch} – ${format(weekStart, "d MMM")} to ${format(weekEnd, "d MMM")}`,
          type: "shift_update",
          data: {
            message: `The ${selectedBranch} rota for ${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")} has been published.`,
            shift_date: format(weekStart, "yyyy-MM-dd"),
            start_time: format(weekStart, "d MMM"),
            end_time: format(weekEnd, "d MMM"),
            branch: selectedBranch,
          },
        });
      }
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
    const currentShifts = branchDeptShifts.map((s: any) => {
      const shiftDate = new Date(s.shift_date + "T00:00:00");
      const dayOfWeek = shiftDate.getDay() === 0 ? 6 : shiftDate.getDay() - 1;
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

  const handleDeleteAllShifts = async () => {
    if (!confirm(`Delete all ${branchDeptShifts.length} shifts for ${selectedDept} at ${selectedBranch} this week?`)) return;
    const ids = branchDeptShifts.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkDelete.mutateAsync(ids);
    toast.success(`Deleted ${ids.length} shifts`);
  };

  const handleClearAssignments = async () => {
    if (!confirm("Clear all employee assignments? This turns them into open shifts.")) return;
    const assigned = branchDeptShifts.filter((s: any) => s.employee_id);
    const ids = assigned.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkUpdate.mutateAsync({
      shiftIds: ids,
      updates: { employee_id: null, status: "open" as const },
    });
    toast.success(`Cleared ${ids.length} assignments`);
  };

  const handleRemoveEmptyShifts = async () => {
    const emptyShifts = branchDeptShifts.filter((s: any) => !s.employee_id);
    if (emptyShifts.length === 0) {
      toast.info("No empty shifts to remove");
      return;
    }
    if (!confirm(`Remove ${emptyShifts.length} empty shifts?`)) return;
    await bulkDelete.mutateAsync(emptyShifts.map((s: any) => s.id));
    toast.success(`Removed ${emptyShifts.length} empty shifts`);
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
      <div className="flex flex-col h-full -m-4 sm:-m-6">
        {/* Top control area — stacked mobile-first */}
        <div className={cn("border-b border-border bg-card", isMobile ? "px-2.5 pt-2" : "px-3 pt-3")}>
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
            onDateSelect={(d) => setCurrentDate(d)}
            onPublish={() => setPublishDrawerOpen(true)}
            onUnpublish={handleUnpublish}
            isAdmin={isAdmin}
            branches={BRANCHES}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            departments={DEPT_WITH_ALL}
            selectedDept={selectedDept}
            onDeptChange={setSelectedDept}
            onCopyPreviousWeek={() => setCopyPrevOpen(true)}
            onSaveTemplate={() => setSaveTemplateOpen(true)}
            onLoadTemplate={() => setLoadTemplateOpen(true)}
            copyPending={copyPrevWeek.isPending}
            onDeleteAllShifts={handleDeleteAllShifts}
            onClearAssignments={handleClearAssignments}
            onMarkAllEmpty={handleClearAssignments}
            onRemoveEmptyShifts={handleRemoveEmptyShifts}
            shiftCount={branchDeptShifts.length}
            assignedCount={branchDeptShifts.filter((s: any) => s.employee_id).length}
          />

          {/* Coverage + Summary strip — hidden on mobile to save space */}
          {!isMobile && (
            <ScheduleSummary
              shifts={shifts || []}
              weekDays={weekDays}
              branch={selectedBranch}
              department={selectedDept === "All" ? "FOH" : selectedDept}
              employees={activeEmployees}
              complianceWarningCount={complianceWarnings.length}
            />
          )}

          {/* Quick filters — hidden on mobile, info is in manager bar */}
          {!isMobile && (
            <ScheduleFilters
              activeFilter={quickFilter}
              onFilterChange={setQuickFilter}
              gapCount={filterStats.gapCount}
              unassignedCount={filterStats.unassignedCount}
              noShiftCount={filterStats.noShiftCount}
              unpublishedCount={filterStats.unpublished}
            />
          )}

          {/* Compliance warnings — collapsed on mobile */}
          {complianceWarnings.length > 0 && !isMobile && (
            <div className="pb-2">
              <ComplianceWarningsBanner warnings={complianceWarnings} />
            </div>
          )}
        </div>

        {/* Mobile Manager Action Bar */}
        {isMobile && isAdmin && (
          <MobileManagerBar
            onBuildShift={() => { setWizardInitialDay(null); setWizardOpen(true); }}
            onPublishDay={() => setPublishDrawerOpen(true)}
            gapCount={filterStats.gapCount}
            unscheduledCount={filterStats.noShiftCount}
            hasUnpublished={hasUnpublished}
            isPublishing={publishWeek.isPending}
            department={selectedDept}
          />
        )}

        {/* Main schedule area */}
        <div className="flex-1 overflow-auto">
          {selectedDept === "All" ? (
            viewMode === "week" ? (
              <div className="divide-y divide-border">
                {DEPARTMENTS.map((deptVal) => (
                  <div key={deptVal}>
                    <div className="px-4 py-2 bg-muted/40 border-b border-border sticky top-0 z-20">
                      <h3 className="text-sm font-semibold text-foreground">{deptVal}</h3>
                    </div>
                    <RotaGrid
                      weekDays={weekDays}
                      shifts={shifts || []}
                      allShifts={shifts || []}
                      employees={activeEmployees}
                      branch={selectedBranch}
                      department={deptVal}
                      isAdmin={isAdmin}
                      onCreateShift={handleCreateShift}
                      onUpdateShift={handleUpdateShift}
                      onDeleteShift={handleDeleteShift}
                      isPending={createShift.isPending || updateShift.isPending}
                      onNavigateToBranch={(b) => setSelectedBranch(b)}
                      quickFilter={quickFilter}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground italic">
                Switch to week view to see all departments, or select a specific department for day view.
              </div>
            )
          ) : (
            viewMode === "week" ? (
              <RotaGrid
                weekDays={weekDays}
                shifts={shifts || []}
                allShifts={shifts || []}
                employees={activeEmployees}
                branch={selectedBranch}
                department={selectedDept}
                isAdmin={isAdmin}
                onCreateShift={handleCreateShift}
                onUpdateShift={handleUpdateShift}
                onDeleteShift={handleDeleteShift}
                isPending={createShift.isPending || updateShift.isPending}
                onNavigateToBranch={(b) => setSelectedBranch(b)}
                quickFilter={quickFilter}
              />
            ) : (
              <>
                <DayView
                  date={currentDate}
                  shifts={dayShifts}
                  branch={selectedBranch}
                  department={selectedDept}
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
                  branch={selectedBranch}
                  department={selectedDept}
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
                        branch: selectedBranch,
                        department: selectedDept,
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
            )
          )}
        </div>

        {/* Bottom status bar — desktop only */}
        {!isMobile && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                {openShiftCount} empty
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {unpublishedCount} draft
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                {publishedCount} live
              </span>
              {complianceWarnings.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  {complianceWarnings.length} warnings
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Publish confirmation drawer */}
      <PublishConfirmDrawer
        open={publishDrawerOpen}
        onOpenChange={setPublishDrawerOpen}
        branch={selectedBranch}
        weekStart={weekStart}
        weekEnd={weekEnd}
        unpublishedCount={unpublishedCount}
        totalShifts={branchShifts.length}
        understaffedDays={understaffedDays}
        complianceWarnings={complianceWarnings.length}
        isPublishing={publishWeek.isPending}
        onConfirmPublish={handlePublish}
      />

      {/* Dialogs triggered from toolbar dropdowns */}
      <CopyPreviousWeekDialog
        currentWeekStart={weekStart}
        branch={selectedBranch}
        department={selectedDept}
        existingShiftCount={branchDeptShifts.length}
        onCopy={handleCopyPrevWeek}
        isPending={copyPrevWeek.isPending}
        open={copyPrevOpen}
        onOpenChange={setCopyPrevOpen}
      />
      <SaveTemplateDialog
        branch={selectedBranch}
        department={selectedDept}
        shiftCount={branchDeptShifts.length}
        onSave={handleSaveTemplate}
        isPending={saveTemplate.isPending}
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
      />
      <LoadTemplateDialog
        branch={selectedBranch}
        department={selectedDept}
        onLoad={handleLoadTemplate}
        isPending={loadTemplate.isPending}
        open={loadTemplateOpen}
        onOpenChange={setLoadTemplateOpen}
      />

      {/* Mobile shift creation wizard */}
      <MobileShiftWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        weekDays={weekDays}
        employees={activeEmployees}
        branch={selectedBranch}
        department={selectedDept}
        existingShifts={shifts || []}
        initialDay={wizardInitialDay}
        departments={DEPT_WITH_ALL}
        onDeptChange={setSelectedDept}
        onCreateShifts={async (newShifts) => {
          if (!tenantId) {
            toast.error("No workspace selected");
            return;
          }
          const { data: { user } } = await supabase.auth.getUser();
          const withTenant = newShifts.map((s) => ({
            ...s,
            created_by: user?.id || null,
          }));
          await bulkCreate.mutateAsync(withTenant as any);
          toast.success(`Created ${newShifts.length} shift${newShifts.length !== 1 ? "s" : ""}`);
        }}
        isPending={bulkCreate.isPending}
      />
    </AppLayout>
  );
}
