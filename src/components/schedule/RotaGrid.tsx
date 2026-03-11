import { useMemo, useState, useCallback } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Check, Lock, MapPin } from "lucide-react";
import { getMinimumStaff, getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import { ShiftCellDialog } from "./ShiftCellDialog";
import { MobileShiftSheet } from "./MobileShiftSheet";
import { BulkScheduleActions } from "./BulkScheduleActions";
import { DraggableShiftCell, CrossBranchShiftCell } from "./DraggableShiftCell";
import { DroppableCell, EmptyDropCell } from "./DroppableCell";
import { useBulkDeleteShifts, useBulkUpdateShifts } from "@/hooks/useSchedule";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { Employee } from "@/hooks/useEmployees";
import type { QuickFilter } from "./ScheduleFilters";

interface RotaGridProps {
  weekDays: Date[];
  shifts: any[];
  allShifts: any[];
  employees: Employee[];
  branch: string;
  department: string;
  isAdmin: boolean;
  onCreateShift: (data: any) => Promise<void>;
  onUpdateShift: (id: string, data: any) => Promise<void>;
  onDeleteShift: (id: string) => void;
  isPending: boolean;
  onNavigateToBranch?: (branch: string) => void;
  quickFilter?: QuickFilter;
}

export function RotaGrid({
  weekDays,
  shifts,
  allShifts,
  employees,
  branch,
  department,
  isAdmin,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  isPending,
  onNavigateToBranch,
  quickFilter = "all",
}: RotaGridProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [popoverShiftId, setPopoverShiftId] = useState<string | null>(null);
  const [mobileSheetShift, setMobileSheetShift] = useState<any>(null);
  const [mobileSheetDay, setMobileSheetDay] = useState<Date | null>(null);
  const isMobile = useIsMobile();

  const bulkDelete = useBulkDeleteShifts();
  const bulkUpdate = useBulkUpdateShifts();
  const bulkPending = bulkDelete.isPending || bulkUpdate.isPending;

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const deptEmployees = useMemo(
    () => employees.filter((e) => e.department === department && e.status === "active"),
    [employees, department]
  );

  const shiftsForDay = (day: Date) =>
    shifts?.filter(
      (s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), day) &&
        s.branch === branch &&
        s.department === department
    ) || [];

  const getShiftForEmployeeDay = (employeeId: string, day: Date) =>
    shiftsForDay(day).find((s: any) => s.employee_id === employeeId);

  const getOpenShifts = (day: Date) =>
    shiftsForDay(day).filter((s: any) => !s.employee_id);

  const getCrossBranchShift = (employeeId: string, day: Date) =>
    allShifts?.filter(
      (s: any) =>
        s.employee_id === employeeId &&
        isSameDay(new Date(s.shift_date + "T00:00:00"), day) &&
        s.branch !== branch
    ) || [];

  const getEmployeeWeeklyHours = (employeeId: string) => {
    let totalMinutes = 0;
    for (const day of weekDays) {
      const shift = getShiftForEmployeeDay(employeeId, day);
      if (shift) {
        const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
        const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        totalMinutes += mins;
      }
    }
    return totalMinutes / 60;
  };

  const currentShifts = useMemo(
    () => shifts?.filter((s: any) => s.branch === branch && s.department === department) || [],
    [shifts, branch, department]
  );
  const currentAssigned = currentShifts.filter((s: any) => s.employee_id);

  const handleBulkDeleteAll = async () => {
    const ids = currentShifts.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkDelete.mutateAsync(ids);
    toast.success(`Deleted ${ids.length} shifts`);
  };

  const handleBulkClearAssignments = async () => {
    const ids = currentAssigned.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkUpdate.mutateAsync({
      shiftIds: ids,
      updates: { employee_id: null, status: "open" as const },
    });
    toast.success(`Cleared ${ids.length} assignments`);
  };

  const handleBulkUpdateTimes = async (startTime: string, endTime: string) => {
    const ids = currentShifts.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkUpdate.mutateAsync({
      shiftIds: ids,
      updates: { start_time: startTime, end_time: endTime },
    });
    toast.success(`Updated times for ${ids.length} shifts`);
  };

  const allBranchShifts = shifts || [];
  const publishedCount = allBranchShifts.filter((s: any) => s.is_published).length;
  const unpublishedCount = allBranchShifts.filter((s: any) => !s.is_published && s.employee_id).length;
  const openShiftCount = allBranchShifts.filter((s: any) => !s.employee_id).length;

  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string | null>(null);

  const handleCellClick = (day: Date, shift?: any, employeeId?: string | null) => {
    if (!isAdmin) return;
    if (activeShift) return;
    // If clicking a shift, show mobile bottom sheet or toggle popover
    if (shift) {
      if (isMobile) {
        setMobileSheetShift(shift);
        setMobileSheetDay(day);
      } else {
        setPopoverShiftId(popoverShiftId === shift.id ? null : shift.id);
      }
      return;
    }
    setSelectedDay(day);
    setSelectedShift(null);
    setDefaultEmployeeId(employeeId || null);
    setDialogOpen(true);
  };

  const handleEditFromPopover = (shift: any, day: Date) => {
    setPopoverShiftId(null);
    setSelectedDay(day);
    setSelectedShift(shift);
    setDialogOpen(true);
  };

  const handleCopyShift = async (shift: any) => {
    setPopoverShiftId(null);
    try {
      await onCreateShift({
        shift_date: shift.shift_date,
        branch,
        department,
        employee_id: null,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: shift.notes || null,
        status: "open",
      });
      toast.success("Shift copied as open shift");
    } catch {
      toast.error("Failed to copy shift");
    }
  };

  const handleDeleteFromPopover = (shiftId: string) => {
    setPopoverShiftId(null);
    onDeleteShift(shiftId);
  };

  const handleSave = async (data: {
    employee_id: string | null;
    start_time: string;
    end_time: string;
    notes: string;
  }) => {
    if (selectedShift) {
      await onUpdateShift(selectedShift.id, {
        employee_id: data.employee_id,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes || null,
        status: data.employee_id ? "scheduled" : "open",
      });
    } else if (selectedDay) {
      await onCreateShift({
        shift_date: format(selectedDay, "yyyy-MM-dd"),
        branch,
        department,
        employee_id: data.employee_id,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes || null,
        status: data.employee_id ? "scheduled" : "open",
      });
    }
    setDialogOpen(false);
  };

  const getDayAbbr = (day: Date): DayOfWeek => {
    return DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1];
  };

  const defaultTimes = selectedDay
    ? getDefaultTimes(department as any, getDayAbbr(selectedDay))
    : { start: "11:30", end: "22:30" };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveShift(event.active.data.current?.shift || null);
    setPopoverShiftId(null); // close popover on drag
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over || !active.data.current?.shift) return;

    const shift = active.data.current.shift;
    const dropId = String(over.id);

    const [targetEmployeeId, targetDateISO] = dropId.split("::");
    if (!targetDateISO) return;

    const targetDate = format(new Date(targetDateISO), "yyyy-MM-dd");
    const isSameEmployee = shift.employee_id === targetEmployeeId;
    const isSameDate = shift.shift_date === targetDate;

    if (isSameEmployee && isSameDate) return;

    if (targetEmployeeId !== "open") {
      // Only block if employee already has a shift at THIS branch+department on this day
      const existingShift = shifts?.find(
        (s: any) =>
          s.employee_id === targetEmployeeId &&
          s.shift_date === targetDate &&
          s.branch === branch &&
          s.department === department &&
          s.id !== shift.id
      );
      if (existingShift) {
        toast.error(`${deptEmployees.find(e => e.id === targetEmployeeId)?.forename || "Employee"} already has a shift here on this day`);
        return;
      }
    }

    try {
      const updates: any = { shift_date: targetDate };
      if (targetEmployeeId === "open") {
        updates.employee_id = null;
        updates.status = "open";
      } else {
        updates.employee_id = targetEmployeeId;
        updates.status = "scheduled";
      }
      await onUpdateShift(shift.id, updates);
      const empName = targetEmployeeId === "open"
        ? "Open Shifts"
        : deptEmployees.find(e => e.id === targetEmployeeId)?.forename || "employee";
      toast.success(`Shift moved to ${empName}`);
    } catch {
      toast.error("Failed to move shift");
    }
  }, [shifts, branch, department, deptEmployees, onUpdateShift]);

  // Helper to get employee name
  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return "Open Shift";
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.forename} ${emp.surname}` : "Unknown";
  };

  // Render a shift cell — tap opens mobile sheet or desktop popover
  const renderShiftCell = (shift: any, day: Date) => {
    return (
      <div key={shift.id}>
        <DraggableShiftCell
          shift={shift}
          isAdmin={isAdmin}
          onView={(e) => {
            e.stopPropagation();
            if (isMobile) {
              setMobileSheetShift(shift);
              setMobileSheetDay(day);
            } else {
              setPopoverShiftId(popoverShiftId === shift.id ? null : shift.id);
            }
          }}
          onCopy={(e) => {
            e.stopPropagation();
            handleCopyShift(shift);
          }}
          onAdd={(e) => {
            e.stopPropagation();
            setSelectedDay(day);
            setSelectedShift(null);
            setDefaultEmployeeId(shift.employee_id || null);
            setDialogOpen(true);
          }}
        />
      </div>
    );
  };

  // Filter employees based on quickFilter
  const filteredEmployees = useMemo(() => {
    if (quickFilter === "all") return deptEmployees;
    if (quickFilter === "no_shifts") {
      return deptEmployees.filter((emp) => {
        const hasShift = weekDays.some((day) => !!getShiftForEmployeeDay(emp.id, day));
        return !hasShift;
      });
    }
    return deptEmployees;
  }, [deptEmployees, quickFilter, weekDays]);

  return (
    <>
      {isAdmin && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {currentShifts.length} shifts · {currentAssigned.length} assigned
          </span>
          <BulkScheduleActions
            branch={branch}
            department={department}
            shiftCount={currentShifts.length}
            assignedCount={currentAssigned.length}
            onDeleteAll={handleBulkDeleteAll}
            onClearAssignments={handleBulkClearAssignments}
            onBulkUpdateTimes={handleBulkUpdateTimes}
            isPending={bulkPending}
          />
        </div>
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-2 sm:p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px] sm:w-[170px] sticky left-0 bg-card z-10">
                  Employee
                </th>
                {weekDays.map((day) => {
                  const dayShifts = shiftsForDay(day);
                  const minStaff = getMinimumStaff(branch, department as any, getDayAbbr(day));
                  const assignedCount = dayShifts.filter((s: any) => s.employee_id).length;
                  const isUnder = assignedCount < minStaff;

                  return (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "text-center p-2 text-xs font-medium min-w-[130px]",
                        isToday(day) ? "bg-primary/5" : ""
                      )}
                    >
                      <div className={cn(
                        "rounded-md py-1",
                        isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}>
                        <div>{format(day, "EEE")}</div>
                        <div className="text-base font-semibold">{format(day, "d")}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        {isUnder ? (
                          <span className="text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            {assignedCount}/{minStaff}
                          </span>
                        ) : (
                          <span className="text-success flex items-center gap-0.5">
                            <Check className="h-3 w-3" />
                            {assignedCount}/{minStaff}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const weeklyHours = getEmployeeWeeklyHours(emp.id);
                const hourlyRate = Number(emp.hourly_rate) || 0;
                const weeklyCost = weeklyHours * hourlyRate;

                return (
                  <tr key={emp.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-xs font-medium sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                          {emp.forename[0]}{emp.surname?.[0] || ""}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{emp.forename} {emp.surname?.[0]}.</div>
                          <div className="text-[10px] text-muted-foreground">
                            {weeklyHours > 0
                              ? `${weeklyHours.toFixed(0)}h ${(weeklyHours % 1 * 60).toFixed(0)}m · £${weeklyCost.toFixed(2)}`
                              : "0h · £0.00"
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const shift = getShiftForEmployeeDay(emp.id, day);
                      const crossBranchShifts = getCrossBranchShift(emp.id, day);
                      const dropId = `${emp.id}::${day.toISOString()}`;

                      return (
                        <DroppableCell
                          key={day.toISOString()}
                          id={dropId}
                          isAdmin={isAdmin}
                          isToday={isToday(day)}
                          onClick={() => handleCellClick(day, shift, emp.id)}
                        >
                          {shift ? (
                            renderShiftCell(shift, day)
                          ) : crossBranchShifts.length > 0 ? (
                            crossBranchShifts.map((cbs: any) => (
                              <CrossBranchShiftCell key={cbs.id} shift={cbs} onNavigate={onNavigateToBranch} />
                            ))
                          ) : (
                            <EmptyDropCell isAdmin={isAdmin} />
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Open shifts row */}
              {weekDays.some((d) => getOpenShifts(d).length > 0) && (
                <tr className="border-t border-border border-dashed">
                  <td className="p-2 text-xs text-muted-foreground italic sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold shrink-0">
                        ?
                      </div>
                      <span>Open Shifts</span>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const openShifts = getOpenShifts(day);
                    const dropId = `open::${day.toISOString()}`;
                    return (
                      <DroppableCell
                        key={day.toISOString()}
                        id={dropId}
                        isAdmin={isAdmin}
                        isToday={isToday(day)}
                      >
                        {openShifts.map((s: any) => (
                          <div key={s.id} onClick={() => handleCellClick(day, s)}>
                            {renderShiftCell(s, day)}
                          </div>
                        ))}
                      </DroppableCell>
                    );
                  })}
                </tr>
              )}

              {/* Quick add row */}
              {isAdmin && (
                <tr className="border-t border-border border-dashed">
                  <td className="p-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                    + Add
                  </td>
                  {weekDays.map((day) => (
                    <td
                      key={day.toISOString()}
                      className="p-1 text-center border-l border-border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleCellClick(day)}
                    >
                      <div className="flex items-center justify-center h-6">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-40 hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeShift ? (
            <div className={cn(
              "rounded-md px-2 py-1.5 text-[11px] leading-tight shadow-xl ring-2 ring-primary/50 scale-105",
              "bg-card border border-primary/30 text-foreground"
            )}>
              <div className="font-semibold">
                {activeShift.start_time?.slice(0, 5)}–{activeShift.end_time?.slice(0, 5)}
              </div>
              {activeShift.employee_id && (
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {deptEmployees.find(e => e.id === activeShift.employee_id)?.forename || "Unassigned"}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>


      <ShiftCellDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDay ? format(selectedDay, "EEE d MMM") : ""}
        branch={branch}
        department={department}
        employees={deptEmployees}
        defaultStart={defaultTimes.start}
        defaultEnd={defaultTimes.end}
        defaultEmployeeId={defaultEmployeeId}
        existingShift={selectedShift}
        onSave={handleSave}
        onDelete={(id) => {
          onDeleteShift(id);
          setDialogOpen(false);
        }}
        onRepeat={async (mode) => {
          if (!selectedDay || (!selectedShift && !defaultEmployeeId)) return;
          const shiftData = selectedShift || {
            employee_id: defaultEmployeeId,
            start_time: defaultTimes.start,
            end_time: defaultTimes.end,
          };
          const dayIndex = selectedDay.getDay() === 0 ? 6 : selectedDay.getDay() - 1;
          let targetDays: Date[] = [];
          if (mode === "tomorrow") {
            const tomorrow = new Date(selectedDay);
            tomorrow.setDate(tomorrow.getDate() + 1);
            targetDays = [tomorrow];
          } else if (mode === "rest_of_week") {
            for (let i = dayIndex + 1; i < 7; i++) {
              targetDays.push(weekDays[i]);
            }
          }
          for (const day of targetDays) {
            if (!day) continue;
            try {
              await onCreateShift({
                shift_date: format(day, "yyyy-MM-dd"),
                branch,
                department,
                employee_id: shiftData.employee_id,
                start_time: shiftData.start_time,
                end_time: shiftData.end_time,
                notes: shiftData.notes || null,
                status: shiftData.employee_id ? "scheduled" : "open",
              });
            } catch {}
          }
          if (targetDays.length > 0) {
            toast.success(`Shift repeated to ${targetDays.length} day${targetDays.length > 1 ? "s" : ""}`);
          }
          setDialogOpen(false);
        }}
        isPending={isPending}
      />

      {/* Mobile shift action sheet */}
      <MobileShiftSheet
        open={!!mobileSheetShift}
        onOpenChange={(open) => { if (!open) { setMobileSheetShift(null); setMobileSheetDay(null); } }}
        shift={mobileSheetShift}
        employeeName={getEmployeeName(mobileSheetShift?.employee_id)}
        branch={branch}
        department={department}
        isAdmin={isAdmin}
        onEdit={() => {
          if (mobileSheetShift && mobileSheetDay) {
            handleEditFromPopover(mobileSheetShift, mobileSheetDay);
          }
          setMobileSheetShift(null);
        }}
        onCopy={() => {
          if (mobileSheetShift) handleCopyShift(mobileSheetShift);
          setMobileSheetShift(null);
        }}
        onDelete={() => {
          if (mobileSheetShift) handleDeleteFromPopover(mobileSheetShift.id);
          setMobileSheetShift(null);
        }}
      />
    </>
  );
}
