import { useMemo, useState, useCallback } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { getMinimumStaff, getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import { ShiftCellDialog } from "./ShiftCellDialog";
import { ShiftDetailPopover } from "./ShiftDetailPopover";
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
    const shiftCell = (
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
    );

    if (!isMobile) {
      return (
        <div key={shift.id}>
          <ShiftDetailPopover
            shift={shift}
            employeeName={getEmployeeName(shift.employee_id)}
            branch={branch}
            department={department}
            isAdmin={isAdmin}
            open={popoverShiftId === shift.id}
            onOpenChange={(open) => setPopoverShiftId(open ? shift.id : null)}
            employees={employees}
            existingShifts={shifts || []}
            onEdit={() => {
              setPopoverShiftId(null);
              handleEditFromPopover(shift, day);
            }}
            onCopy={() => {
              setPopoverShiftId(null);
              handleCopyShift(shift);
            }}
            onDelete={() => {
              setPopoverShiftId(null);
              handleDeleteFromPopover(shift.id);
            }}
            onMove={() => {
              setPopoverShiftId(null);
              setMoveDrawerShift(shift);
            }}
            onUpdate={async (id, updates) => {
              await onUpdateShift(id, updates);
              toast.success("Shift updated");
            }}
          >
            {shiftCell}
          </ShiftDetailPopover>
        </div>
      );
    }

    return <div key={shift.id}>{shiftCell}</div>;
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
          <table className="w-full border-collapse table-fixed">
             <thead>
              <tr className="border-b border-border/20">
                <th className={cn(
                  "text-left py-2.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider sticky left-0 bg-background z-10",
                  isMobile ? "px-1.5 w-[80px]" : "px-3 w-[100px] sm:w-[150px]"
                )}>
                  Team
                </th>
                {weekDays.map((day) => {
                  const today = isToday(day);

                  return (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "text-center px-0.5 py-2.5",
                        isMobile ? "min-w-[48px]" : "min-w-[44px] sm:min-w-[100px]",
                      )}
                    >
                      <div className={cn(
                        "flex flex-col items-center gap-0 rounded-lg py-1 mx-auto transition-colors",
                        today && "bg-primary text-primary-foreground px-2.5",
                      )}>
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider",
                          !today && "text-muted-foreground/50"
                        )}>
                          {format(day, "EEE")}
                        </span>
                        <span className={cn(
                          "text-sm sm:text-[15px] font-bold leading-tight",
                          !today && "text-foreground/80"
                        )}>
                          {format(day, "d")}
                        </span>
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
                      empIdx > 0 && "border-t border-border/15",
                      hasNoShifts && "opacity-40",
                    )}
                  >
                    <td className={cn(
                      "py-1 sticky left-0 bg-background z-10",
                      isMobile ? "px-1.5" : "px-3 py-1.5"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          isMobile ? "h-6 w-6" : "h-7 w-7",
                          hasNoShifts
                            ? "bg-muted/60 text-muted-foreground/60"
                            : "bg-primary/[0.06] text-primary"
                        )}>
                          {emp.forename[0]}{emp.surname?.[0] || ""}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] sm:text-xs font-medium text-foreground leading-tight">
                            {emp.forename}
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 tabular-nums">
                            {weeklyHours > 0
                              ? `${Math.floor(weeklyHours)}h${Math.round((weeklyHours % 1) * 60) > 0 ? ` ${Math.round((weeklyHours % 1) * 60)}m` : ""}`
                              : "—"
                            }
                            {!isMobile && weeklyCost > 0 && (
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
                <tr className="border-t border-dashed border-border/20">
                  <td className="px-3 py-1.5 sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted/40 text-muted-foreground/60 flex items-center justify-center text-[10px] font-bold shrink-0">
                        ?
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Open</span>
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
              "rounded px-2 py-1.5 text-[11px] leading-tight shadow-lg ring-1 ring-primary/20",
              "bg-card border border-border/40 text-foreground"
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
        employees={employees}
        existingShifts={shifts || []}
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
        existingShifts={shifts || []}
        onMove={handleMoveShift}
        isPending={isPending}
      />
    </>
  );
}
