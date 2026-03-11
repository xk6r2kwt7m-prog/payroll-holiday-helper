import { useMemo, useState, useCallback } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { getMinimumStaff, getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import { ShiftCellDialog } from "./ShiftCellDialog";
import { MobileShiftSheet } from "./MobileShiftSheet";
import { MoveShiftDrawer } from "./MoveShiftDrawer";
import { DraggableShiftCell, CrossBranchShiftCell } from "./DraggableShiftCell";
import { DroppableCell, EmptyDropCell } from "./DroppableCell";

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
  const [moveDrawerShift, setMoveDrawerShift] = useState<any>(null);
  const isMobile = useIsMobile();

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

  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string | null>(null);

  const handleCellClick = (day: Date, shift?: any, employeeId?: string | null) => {
    if (!isAdmin) return;
    if (activeShift) return;
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

  const handleMoveShift = async (shiftId: string, updates: any) => {
    try {
      await onUpdateShift(shiftId, updates);
      toast.success("Shift moved");
    } catch {
      toast.error("Failed to move shift");
    }
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
    setPopoverShiftId(null);
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

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return "Open Shift";
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.forename} ${emp.surname}` : "Unknown";
  };

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
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(
                  "text-left py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-card z-10 border-b border-border",
                  isMobile ? "px-1.5 w-[80px]" : "px-2 w-[100px] sm:w-[160px]"
                )}>
                  <span className="hidden sm:inline">Employee</span>
                  <span className="sm:hidden">Staff</span>
                </th>
                {weekDays.map((day) => {
                  const dayShifts = shiftsForDay(day);
                  const minStaff = getMinimumStaff(branch, department as any, getDayAbbr(day));
                  const assignedCount = dayShifts.filter((s: any) => s.employee_id).length;
                  const isUnder = assignedCount < minStaff;
                  const today = isToday(day);

                  return (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "text-center px-0.5 py-1.5 sm:py-2 min-w-[44px] sm:min-w-[100px] border-b",
                        today ? "border-primary/40" : "border-border",
                      )}
                    >
                      <div className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg py-1 mx-auto",
                        today && "bg-primary text-primary-foreground",
                      )}>
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-medium uppercase",
                          !today && "text-muted-foreground"
                        )}>
                          {format(day, "EEE")}
                        </span>
                        <span className={cn(
                          "text-sm sm:text-base font-bold leading-none",
                          !today && "text-foreground"
                        )}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-center">
                        {isUnder ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                            <span className="hidden sm:inline">{assignedCount}/{minStaff}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-success/70">
                            <span className="h-1.5 w-1.5 rounded-full bg-success/60" />
                            <span className="hidden sm:inline">{assignedCount}/{minStaff}</span>
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, empIdx) => {
                const weeklyHours = getEmployeeWeeklyHours(emp.id);
                const hourlyRate = Number(emp.hourly_rate) || 0;
                const weeklyCost = weeklyHours * hourlyRate;
                const hasNoShifts = weeklyHours === 0;

                return (
                  <tr
                    key={emp.id}
                    className={cn(
                      "transition-colors",
                      empIdx > 0 && "border-t border-border/40",
                      hasNoShifts && "bg-muted/[0.15]",
                    )}
                  >
                    <td className="px-2 py-2 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          hasNoShifts
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        )}>
                          {emp.forename[0]}{emp.surname?.[0] || ""}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] sm:text-xs font-medium text-foreground leading-tight">
                            {emp.forename}
                          </div>
                          <div className="text-[9px] text-muted-foreground leading-tight mt-0.5 tabular-nums">
                            {weeklyHours > 0
                              ? `${Math.floor(weeklyHours)}h${Math.round((weeklyHours % 1) * 60) > 0 ? ` ${Math.round((weeklyHours % 1) * 60)}m` : ""}`
                              : "—"
                            }
                            {weeklyCost > 0 && (
                              <span className="hidden sm:inline"> · £{weeklyCost.toFixed(0)}</span>
                            )}
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
                <tr className="border-t-2 border-dashed border-accent/20">
                  <td className="px-2 py-2 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                        ?
                      </div>
                      <span className="text-[11px] text-accent font-medium">Open</span>
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
                        <div className="space-y-0.5">
                          {openShifts.map((s: any) => (
                            <div key={s.id} onClick={() => handleCellClick(day, s)}>
                              {renderShiftCell(s, day)}
                            </div>
                          ))}
                        </div>
                      </DroppableCell>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeShift ? (
            <div className={cn(
              "rounded-lg px-2 py-1.5 text-[11px] leading-tight shadow-xl ring-2 ring-primary/50 scale-105",
              "bg-card border border-primary/30 text-foreground"
            )}>
              <div className="font-semibold tabular-nums">
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
          const shift = mobileSheetShift;
          const day = mobileSheetDay;
          setMobileSheetShift(null);
          setMobileSheetDay(null);
          if (shift && day) {
            handleEditFromPopover(shift, day);
          }
        }}
        onCopy={() => {
          const shift = mobileSheetShift;
          setMobileSheetShift(null);
          setMobileSheetDay(null);
          if (shift) handleCopyShift(shift);
        }}
        onDelete={() => {
          const shift = mobileSheetShift;
          setMobileSheetShift(null);
          setMobileSheetDay(null);
          if (shift) handleDeleteFromPopover(shift.id);
        }}
        onMove={() => {
          const shift = mobileSheetShift;
          setMobileSheetShift(null);
          setMobileSheetDay(null);
          if (shift) setMoveDrawerShift(shift);
        }}
        onUpdate={async (id, updates) => {
          await onUpdateShift(id, updates);
          toast.success("Shift updated");
        }}
      />

      {/* Move shift drawer */}
      <MoveShiftDrawer
        open={!!moveDrawerShift}
        onOpenChange={(open) => { if (!open) setMoveDrawerShift(null); }}
        shift={moveDrawerShift}
        weekDays={weekDays}
        employees={employees}
        department={department}
        branch={branch}
        existingShifts={shifts || []}
        onMove={handleMoveShift}
        onCopy={async (data) => {
          await onCreateShift({
            shift_date: data.shift_date,
            branch,
            department,
            employee_id: data.employee_id,
            start_time: data.start_time,
            end_time: data.end_time,
            notes: data.notes,
            status: data.employee_id ? "scheduled" : "open",
          });
          toast.success("Shift copied");
        }}
        isPending={isPending}
      />
    </>
  );
}
