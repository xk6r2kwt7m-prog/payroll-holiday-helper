import { useMemo, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Check, Lock, MapPin } from "lucide-react";
import { getMinimumStaff, getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import { ShiftCellDialog } from "./ShiftCellDialog";
import type { Employee } from "@/hooks/useEmployees";

interface RotaGridProps {
  weekDays: Date[];
  shifts: any[];
  allShifts: any[]; // All shifts across all branches for cross-branch detection
  employees: Employee[];
  branch: string;
  department: string;
  isAdmin: boolean;
  onCreateShift: (data: any) => Promise<void>;
  onUpdateShift: (id: string, data: any) => Promise<void>;
  onDeleteShift: (id: string) => void;
  isPending: boolean;
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
}: RotaGridProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  // Filter employees by department only (staff can work across branches)
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

  // Get cross-branch shifts for an employee on a given day
  const getCrossBranchShift = (employeeId: string, day: Date) =>
    allShifts?.filter(
      (s: any) =>
        s.employee_id === employeeId &&
        isSameDay(new Date(s.shift_date + "T00:00:00"), day) &&
        s.branch !== branch
    ) || [];

  // Calculate total weekly hours for an employee
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

  // Stats for status bar
  const allBranchShifts = shifts || [];
  const publishedCount = allBranchShifts.filter((s: any) => s.is_published).length;
  const unpublishedCount = allBranchShifts.filter((s: any) => !s.is_published && s.employee_id).length;
  const openShiftCount = allBranchShifts.filter((s: any) => !s.employee_id).length;

  const handleCellClick = (day: Date, shift?: any) => {
    if (!isAdmin) return;
    setSelectedDay(day);
    setSelectedShift(shift || null);
    setDialogOpen(true);
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

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs font-medium text-muted-foreground w-[140px] sticky left-0 bg-card z-10">
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
                      "text-center p-1.5 text-xs font-medium min-w-[110px]",
                      isToday(day) ? "bg-primary/10" : ""
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
            {deptEmployees.map((emp) => {
              const weeklyHours = getEmployeeWeeklyHours(emp.id);
              const hourlyRate = Number(emp.hourly_rate) || 0;
              const weeklyCost = weeklyHours * hourlyRate;

              return (
                <tr key={emp.id} className="border-t border-border">
                  <td className="p-2 text-xs font-medium sticky left-0 bg-card z-10">
                    <div className="truncate">{emp.forename} {emp.surname?.[0]}.</div>
                    {weeklyHours > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {weeklyHours.toFixed(0)}h · £{weeklyCost.toFixed(0)}
                      </div>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const shift = getShiftForEmployeeDay(emp.id, day);
                    const crossBranchShifts = getCrossBranchShift(emp.id, day);

                    return (
                      <td
                        key={day.toISOString()}
                        className={cn(
                          "p-1 text-center border-l border-border",
                          isToday(day) ? "bg-primary/5" : "",
                          isAdmin && "cursor-pointer hover:bg-muted/50 transition-colors"
                        )}
                        onClick={() => handleCellClick(day, shift)}
                      >
                        {shift ? (
                          <div
                            className={cn(
                              "rounded-md px-1.5 py-1 text-[11px] leading-tight relative",
                              shift.status === "open"
                                ? "bg-accent/15 text-accent border border-accent/20"
                                : shift.is_published
                                  ? "bg-success/15 text-success border border-success/30"
                                  : "bg-success/10 text-success border border-success/20"
                            )}
                          >
                            <div className="font-medium">
                              {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                            </div>
                            {shift.is_published && (
                              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                <Lock className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-semibold uppercase tracking-wider">Locked</span>
                              </div>
                            )}
                          </div>
                        ) : crossBranchShifts.length > 0 ? (
                          // Show cross-branch shifts in different colour
                          crossBranchShifts.map((cbs: any) => (
                            <div
                              key={cbs.id}
                              className="rounded-md px-1.5 py-1 text-[11px] leading-tight bg-warning/15 text-warning border border-warning/30 mb-0.5"
                            >
                              <div className="font-medium">
                                {cbs.start_time?.slice(0, 5)}–{cbs.end_time?.slice(0, 5)}
                              </div>
                              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-medium">{cbs.branch}</span>
                              </div>
                              {cbs.is_published && (
                                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                  <Lock className="h-2.5 w-2.5" />
                                  <span className="text-[9px] font-semibold uppercase tracking-wider">Locked</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : isAdmin ? (
                          <div className="flex items-center justify-center h-8 opacity-0 hover:opacity-40 transition-opacity">
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Open shifts row */}
            {weekDays.some((d) => getOpenShifts(d).length > 0) && (
              <tr className="border-t border-border border-dashed">
                <td className="p-2 text-xs text-muted-foreground italic sticky left-0 bg-card z-10">
                  Open Shifts
                </td>
                {weekDays.map((day) => {
                  const openShifts = getOpenShifts(day);
                  return (
                    <td key={day.toISOString()} className="p-1 text-center border-l border-border">
                      {openShifts.map((s: any) => (
                        <div
                          key={s.id}
                          className="rounded-md px-1.5 py-1 text-[11px] bg-accent/15 text-accent border border-accent/20 mb-0.5 cursor-pointer"
                          onClick={() => handleCellClick(day, s)}
                        >
                          {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Quick add row for admin */}
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

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-success" />
          {publishedCount} published
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          {unpublishedCount} unpublished
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {openShiftCount} open shifts
        </span>
      </div>

      <ShiftCellDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDay ? format(selectedDay, "EEE d MMM") : ""}
        branch={branch}
        department={department}
        employees={deptEmployees}
        defaultStart={defaultTimes.start}
        defaultEnd={defaultTimes.end}
        existingShift={selectedShift}
        onSave={handleSave}
        onDelete={(id) => {
          onDeleteShift(id);
          setDialogOpen(false);
        }}
        isPending={isPending}
      />
    </>
  );
}
