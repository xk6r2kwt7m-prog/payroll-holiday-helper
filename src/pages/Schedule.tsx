import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, addDays, isSameDay } from "date-fns";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useTenantBranches } from "@/hooks/useBranches";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { RotaGrid } from "@/components/schedule/RotaGrid";
import { DayView } from "@/components/schedule/DayView";
import { ShiftCellDialog } from "@/components/schedule/ShiftCellDialog";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleSummary } from "@/components/schedule/ScheduleSummary";
import { type QuickFilter } from "@/components/schedule/ScheduleFilters";
import { PublishConfirmDrawer } from "@/components/schedule/PublishConfirmDrawer";
import { SaveTemplateDialog } from "@/components/schedule/SaveTemplateDialog";
import { LoadTemplateDialog } from "@/components/schedule/LoadTemplateDialog";
import { CopyPreviousWeekDialog } from "@/components/schedule/CopyPreviousWeekDialog";
import { useComplianceWarnings } from "@/components/schedule/ComplianceWarnings";
import { getDefaultTimes, type DayOfWeek, DAY_ABBR, getMinimumStaff } from "@/components/schedule/shiftDefaults";
import { MobileShiftWizard } from "@/components/schedule/MobileShiftWizard";
import { MobileManagerBar } from "@/components/schedule/MobileManagerBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarClock } from "lucide-react";
import { usePermission } from "@/hooks/useRolePermissions";
import { useTenantPreferences } from "@/hooks/useTenantPreferences";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { useRotaTerms } from "@/hooks/useRotaTerms";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode = "week" | "day";
const DEPARTMENTS = ["FOH", "BOH", "CPU"] as const;
const DEPT_WITH_ALL = ["All", ...DEPARTMENTS] as const;

const SCHEDULING_DEFAULTS = {
  defaultView: "week" as string,
  autoPublish: false,
  showDeptFilter: true,
  mobileQuickBuild: true,
  shiftSwapNotify: true,
};

export default function Schedule() {
  // Load tenant scheduling preferences
  const { data: schedPrefs } = useTenantPreferences("scheduling", SCHEDULING_DEFAULTS);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [viewModeInitialized, setViewModeInitialized] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDept, setSelectedDept] = useState("FOH");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  // Reset page-local state on tenant switch
  const resetPageState = useCallback(() => {
    setSelectedBranch("");
    setSelectedDept("FOH");
    setQuickFilter("all");
  }, []);
  const { tenantReady } = useTenantGuard(resetPageState);

  // Apply stored default view preference on first load
  useEffect(() => {
    if (schedPrefs && !viewModeInitialized) {
      setViewMode((schedPrefs.defaultView === "day" ? "day" : "week") as ViewMode);
      setViewModeInitialized(true);
    }
  }, [schedPrefs, viewModeInitialized]);

  // Dialog states
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const [copyPrevOpen, setCopyPrevOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialDay, setWizardInitialDay] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dayDialogShift, setDayDialogShift] = useState<any>(null);

  const { isAdmin } = useAuth();
  // Permission-based access
  const canEditSchedules = usePermission("edit_schedules");
  const canPublishSchedules = usePermission("publish_schedules");
  
  const { data: employees } = useEmployees();
  const { data: tenantBranches = [] } = useTenantBranches();
  const isMobile = useIsMobile();

  // Auto-select first branch
  useEffect(() => {
    if (tenantBranches.length > 0 && !selectedBranch) {
      setSelectedBranch(tenantBranches[0]);
    }
  }, [tenantBranches, selectedBranch]);

  // All schedule logic extracted into hook
  const schedule = useScheduleActions({ currentDate, selectedBranch, selectedDept });

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active" || e.status === "starter") || [],
    [employees]
  );

  const complianceWarnings = useComplianceWarnings(
    schedule.shifts || [],
    activeEmployees,
    schedule.weekDays
  );

  // Quick filter stats
  const filterStats = useMemo(() => {
    const deptShifts = schedule.branchDeptShifts;
    const deptEmployees = activeEmployees.filter((e) =>
      selectedDept === "All" || e.department === selectedDept
    );
    const employeesWithShifts = new Set(
      deptShifts.filter((s: any) => s.employee_id).map((s: any) => s.employee_id)
    );
    const noShiftCount = deptEmployees.filter((e) => !employeesWithShifts.has(e.id)).length;
    const unassignedCount = deptShifts.filter((s: any) => !s.employee_id).length;
    const unpublished = deptShifts.filter((s: any) => !s.is_published).length;

    let gapCount = 0;
    const dept = selectedDept === "All" ? "FOH" : selectedDept;
    for (const day of schedule.weekDays) {
      const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
      const dayShifts = deptShifts.filter((s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), day)
      );
      const assigned = dayShifts.filter((s: any) => s.employee_id).length;
      const min = getMinimumStaff(selectedBranch, dept as any, dayAbbr);
      if (assigned < min) gapCount++;
    }

    return { gapCount, unassignedCount, noShiftCount, unpublished };
  }, [schedule.branchDeptShifts, activeEmployees, selectedDept, selectedBranch, schedule.weekDays]);

  const navigate = (dir: number) => {
    setCurrentDate((d) => addDays(d, viewMode === "week" ? 7 * dir : dir));
  };

  // Undo publish timer
  const [undoTimeStr, setUndoTimeStr] = useState("");
  useEffect(() => {
    if (!schedule.publishRollbackInfo.canUndo) {
      setUndoTimeStr("");
      return;
    }
    const updateTimer = () => {
      if (schedule.publishRollbackInfo.publishedAt) {
        const publishedTime = new Date(schedule.publishRollbackInfo.publishedAt).getTime();
        const left = Math.max(0, 10 * 60 * 1000 - (Date.now() - publishedTime));
        const mins = Math.floor(left / 60000);
        const secs = Math.floor((left % 60000) / 1000);
        setUndoTimeStr(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [schedule.publishRollbackInfo.canUndo, schedule.publishRollbackInfo.publishedAt]);

  // Day view data
  const dayShifts = useMemo(
    () => schedule.shifts?.filter(
      (s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), currentDate) &&
        s.branch === selectedBranch &&
        s.department === selectedDept
    ) || [],
    [schedule.shifts, currentDate, selectedBranch, selectedDept]
  );

  const getDayAbbr = (d: Date): DayOfWeek =>
    DAY_ABBR[d.getDay() === 0 ? 6 : d.getDay() - 1];
  const dayDefaults = getDefaultTimes(selectedDept as any, getDayAbbr(currentDate));
  const deptEmployees = useMemo(
    () => activeEmployees.filter((e) => e.department === selectedDept),
    [activeEmployees, selectedDept]
  );

  // Phase 3 — terms-aware rates (base + service charge split) for day-view dialog & wizard.
  const rotaWindowStart = useMemo(
    () => (schedule.weekDays[0] ? format(schedule.weekDays[0], "yyyy-MM-dd") : undefined),
    [schedule.weekDays],
  );
  const rotaWindowEnd = useMemo(
    () => (schedule.weekDays[schedule.weekDays.length - 1]
      ? format(schedule.weekDays[schedule.weekDays.length - 1], "yyyy-MM-dd")
      : undefined),
    [schedule.weekDays],
  );
  const rotaTerms = useRotaTerms(activeEmployees, rotaWindowStart, rotaWindowEnd);

  // Empty state — no branch configured
  if (!schedule.isLoading && tenantBranches.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          icon={CalendarClock}
          title="No locations set up"
          description="Add at least one location before building your schedule. Locations define where your team works and what shifts are available."
          hint="You can set up locations, operating hours, and geofencing in workplace settings."
          actionLabel="Add a Location"
          actionHref="/settings?group=workplaces&section=locations"
          secondaryLabel="View Locations"
          secondaryHref="/locations"
        />
      </AppLayout>
    );
  }

  if (!tenantReady) {
    return (
      <AppLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full -m-4 sm:-m-6">
        {/* Compact top control area */}
        <div className={cn(
          "bg-background",
          isMobile ? "px-2.5 pt-2" : "px-4 pt-2"
        )}>
          <ScheduleHeader
            currentDate={currentDate}
            viewMode={viewMode}
            weekStart={schedule.weekStart}
            weekEnd={schedule.weekEnd}
            hasUnpublished={schedule.hasUnpublished}
            publishedCount={schedule.publishedCount}
            totalCount={schedule.branchShifts.length}
            isPublishing={schedule.isPublishing}
            onViewModeChange={setViewMode}
            onNavigate={navigate}
            onToday={() => setCurrentDate(new Date())}
            onDateSelect={(d) => setCurrentDate(d)}
            onPublish={() => canPublishSchedules ? setPublishDrawerOpen(true) : undefined}
            onUnpublish={canPublishSchedules ? schedule.handleUnpublish : undefined}
            isAdmin={canEditSchedules}
            branches={tenantBranches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            departments={DEPT_WITH_ALL}
            selectedDept={selectedDept}
            onDeptChange={setSelectedDept}
            onCopyPreviousWeek={() => setCopyPrevOpen(true)}
            onCopyToNextWeek={() => {}}
            onSaveTemplate={() => setSaveTemplateOpen(true)}
            onLoadTemplate={() => setLoadTemplateOpen(true)}
            copyPending={schedule.isCopying}
            onDeleteAllShifts={schedule.handleDeleteAllShifts}
            onClearAssignments={schedule.handleClearAssignments}
            onMarkAllEmpty={schedule.handleClearAssignments}
            onRemoveEmptyShifts={schedule.handleRemoveEmptyShifts}
            shiftCount={schedule.branchDeptShifts.length}
            assignedCount={schedule.branchDeptShifts.filter((s: any) => s.employee_id).length}
            canUndoPublish={schedule.publishRollbackInfo.canUndo}
            undoTimeRemaining={undoTimeStr}
            onUndoPublish={schedule.handleUndoPublish}
          />
        </div>

        {/* Thin separator */}
        <div className="h-px bg-border/30" />

        {/* Mobile Manager Bar */}
        {isMobile && canEditSchedules && schedPrefs?.mobileQuickBuild !== false && (
          <MobileManagerBar
            onBuildShift={() => { setWizardInitialDay(null); setWizardOpen(true); }}
            onPublishDay={() => setPublishDrawerOpen(true)}
            onCopyPreviousWeek={() => setCopyPrevOpen(true)}
            onLoadTemplate={() => setLoadTemplateOpen(true)}
            gapCount={filterStats.gapCount}
            unscheduledCount={filterStats.noShiftCount}
            hasUnpublished={schedule.hasUnpublished}
            isPublishing={schedule.isPublishing}
            department={selectedDept}
            shiftCount={schedule.branchDeptShifts.length}
          />
        )}

        {/* Mobile coverage strip */}
        {isMobile && (schedule.shifts?.length ?? 0) > 0 && selectedDept !== "All" && (
          <div className="px-3 py-2 border-b border-border/30 bg-background">
            <ScheduleSummary
              shifts={schedule.shifts || []}
              weekDays={schedule.weekDays}
              branch={selectedBranch}
              department={selectedDept === "All" ? "FOH" : selectedDept}
              employees={activeEmployees}
              complianceWarningCount={complianceWarnings.length}
            />
          </div>
        )}

        {/* Main schedule area — the hero */}
        <div className="flex-1 overflow-auto bg-background">
          {/* Desktop: inline summary strip above the grid */}
          {!isMobile && (schedule.shifts?.length ?? 0) > 0 && (
            <div className="px-4 py-1.5 border-b border-border/30">
              <ScheduleSummary
                shifts={schedule.shifts || []}
                weekDays={schedule.weekDays}
                branch={selectedBranch}
                department={selectedDept === "All" ? "FOH" : selectedDept}
                employees={activeEmployees}
                complianceWarningCount={complianceWarnings.length}
              />
            </div>
          )}

          {/* Empty state when no shifts exist */}
          {!schedule.isLoading && (schedule.shifts?.length === 0) && (
            <EmptyState
              icon={CalendarClock}
              title="No shifts this week"
              description={canEditSchedules
                ? isMobile
                  ? "Tap Build Shift above to start, or use the ⋮ menu to copy last week or load a saved template."
                  : "Start building your rota by adding shifts, copying from last week, or loading a template."
                : "No shifts have been published for this week yet. Check back later or contact your manager."
              }
              actionLabel={canEditSchedules && !isMobile ? "Build Shift" : undefined}
              onAction={canEditSchedules && !isMobile ? () => { setWizardInitialDay(null); setWizardOpen(true); } : undefined}
            />
          )}

          {(schedule.shifts?.length ?? 0) > 0 && (
            selectedDept === "All" ? (
              viewMode === "week" ? (
                <div className="divide-y divide-border/20">
                  {DEPARTMENTS.map((deptVal) => (
                    <div key={deptVal}>
                      <div className="px-4 py-1.5 bg-muted/10 border-b border-border/20 sticky top-0 z-20">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{deptVal}</h3>
                      </div>
                      <RotaGrid
                        weekDays={schedule.weekDays}
                        shifts={schedule.shifts || []}
                        allShifts={schedule.shifts || []}
                        employees={activeEmployees}
                        branch={selectedBranch}
                        department={deptVal}
                        isAdmin={canEditSchedules}
                        onCreateShift={schedule.handleCreateShift}
                        onUpdateShift={schedule.handleUpdateShift}
                        onDeleteShift={schedule.handleDeleteShift}
                        isPending={schedule.isPending}
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
                  weekDays={schedule.weekDays}
                  shifts={schedule.shifts || []}
                  allShifts={schedule.shifts || []}
                  employees={activeEmployees}
                  branch={selectedBranch}
                  department={selectedDept}
                  isAdmin={canEditSchedules}
                  onCreateShift={schedule.handleCreateShift}
                  onUpdateShift={schedule.handleUpdateShift}
                  onDeleteShift={schedule.handleDeleteShift}
                  isPending={schedule.isPending}
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
                    isAdmin={canEditSchedules}
                    onAddClick={() => { setDayDialogShift(null); setDayDialogOpen(true); }}
                    onEditClick={(shift) => { setDayDialogShift(shift); setDayDialogOpen(true); }}
                    onDeleteClick={schedule.handleDeleteShift}
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
                        await schedule.handleUpdateShift(dayDialogShift.id, {
                          employee_id: data.employee_id,
                          start_time: data.start_time,
                          end_time: data.end_time,
                          notes: data.notes || null,
                          status: data.employee_id ? "scheduled" : "open",
                        });
                      } else {
                        await schedule.handleCreateShift({
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
                    onDelete={(id) => { schedule.handleDeleteShift(id); setDayDialogOpen(false); }}
                    isPending={schedule.isPending}
                  />
                </>
              )
            )
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PublishConfirmDrawer
        open={publishDrawerOpen}
        onOpenChange={setPublishDrawerOpen}
        branch={selectedBranch}
        weekStart={schedule.weekStart}
        weekEnd={schedule.weekEnd}
        unpublishedCount={schedule.unpublishedCount}
        totalShifts={schedule.branchShifts.length}
        understaffedDays={schedule.understaffedDays}
        complianceWarnings={complianceWarnings.length}
        isPublishing={schedule.isPublishing}
        onConfirmPublish={schedule.handlePublish}
      />
      <CopyPreviousWeekDialog
        currentWeekStart={schedule.weekStart}
        branch={selectedBranch}
        department={selectedDept}
        existingShiftCount={schedule.branchDeptShifts.length}
        onCopy={schedule.handleCopyPrevWeek}
        isPending={schedule.isCopying}
        open={copyPrevOpen}
        onOpenChange={setCopyPrevOpen}
      />
      <SaveTemplateDialog
        branch={selectedBranch}
        department={selectedDept}
        shiftCount={schedule.branchDeptShifts.length}
        onSave={schedule.handleSaveTemplate}
        isPending={schedule.isSavingTemplate}
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
      />
      <LoadTemplateDialog
        branch={selectedBranch}
        department={selectedDept}
        onLoad={schedule.handleLoadTemplate}
        isPending={schedule.isLoadingTemplate}
        open={loadTemplateOpen}
        onOpenChange={setLoadTemplateOpen}
      />
      <MobileShiftWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        weekDays={schedule.weekDays}
        employees={activeEmployees}
        branch={selectedBranch}
        department={selectedDept}
        existingShifts={schedule.shifts || []}
        initialDay={wizardInitialDay}
        departments={DEPT_WITH_ALL}
        onDeptChange={setSelectedDept}
        onCreateShifts={schedule.handleBulkCreateShifts}
        isPending={schedule.isBulkCreating}
      />
    </AppLayout>
  );
}
