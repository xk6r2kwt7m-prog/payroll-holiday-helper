import { useState, useMemo, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ChevronLeft, ChevronRight, Check, Clock, Users, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";
import { getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import { getPresetsForDepartment, type ShiftPreset } from "./ShiftTemplatePresets";

interface MobileShiftWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekDays: Date[];
  employees: Employee[];
  branch: string;
  department: string;
  existingShifts: any[];
  onCreateShifts: (shifts: Array<{
    shift_date: string;
    branch: string;
    department: string;
    employee_id: string | null;
    start_time: string;
    end_time: string;
    notes: string | null;
    status: string;
    is_published?: boolean;
  }>) => Promise<void>;
  isPending: boolean;
  // Allow pre-selecting day when opened from empty cell tap
  initialDay?: Date | null;
  initialDepartment?: string;
  departments?: readonly string[];
  onDeptChange?: (dept: string) => void;
}

type WizardStep = "day" | "dept" | "staff" | "time" | "review";

// Persist last used department across wizard sessions
let lastUsedDept: string | null = null;

export function MobileShiftWizard({
  open,
  onOpenChange,
  weekDays,
  employees,
  branch,
  department,
  existingShifts,
  onCreateShifts,
  isPending,
  initialDay,
  initialDepartment,
  departments,
  onDeptChange,
}: MobileShiftWizardProps) {
  const [step, setStep] = useState<WizardStep>("day");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDept, setSelectedDept] = useState(department);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("11:30");
  const [endTime, setEndTime] = useState("22:30");
  const [notes, setNotes] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Use last department or initial
  useEffect(() => {
    if (open) {
      const dept = initialDepartment || lastUsedDept || department;
      setSelectedDept(dept);
      if (initialDay) {
        setSelectedDay(initialDay);
        const dayAbbr = DAY_ABBR[initialDay.getDay() === 0 ? 6 : initialDay.getDay() - 1] as DayOfWeek;
        const defaults = getDefaultTimes(dept as any, dayAbbr);
        setStartTime(defaults.start);
        setEndTime(defaults.end);
        setStep("staff");
      }
    }
  }, [open, initialDay, initialDepartment, department]);

  const deptEmployees = useMemo(
    () => employees.filter((e) => e.department === selectedDept && e.status === "active"),
    [employees, selectedDept]
  );

  const presets = useMemo(() => getPresetsForDepartment(selectedDept), [selectedDept]);

  const resetWizard = () => {
    setStep("day");
    setSelectedDay(null);
    setSelectedEmployeeIds([]);
    setStartTime("11:30");
    setEndTime("22:30");
    setNotes("");
    setPublishNow(false);
    setShowNextActions(false);
    setCreatedCount(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetWizard, 300);
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day);
    const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
    const defaults = getDefaultTimes(selectedDept as any, dayAbbr);
    setStartTime(defaults.start);
    setEndTime(defaults.end);
    // Skip dept step if department is already set and not "All"
    if (departments && departments.length > 1 && department === "All") {
      setStep("dept");
    } else {
      setStep("staff");
    }
  };

  const handleDeptSelect = (dept: string) => {
    setSelectedDept(dept);
    lastUsedDept = dept;
    onDeptChange?.(dept);
    if (selectedDay) {
      const dayAbbr = DAY_ABBR[selectedDay.getDay() === 0 ? 6 : selectedDay.getDay() - 1] as DayOfWeek;
      const defaults = getDefaultTimes(dept as any, dayAbbr);
      setStartTime(defaults.start);
      setEndTime(defaults.end);
    }
    setSelectedEmployeeIds([]);
    setStep("staff");
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const availableIds = deptEmployees
      .filter((emp) => {
        if (!selectedDay) return true;
        return !getExistingShiftsForDay(selectedDay).some((s: any) => s.employee_id === emp.id);
      })
      .map((e) => e.id);
    setSelectedEmployeeIds(availableIds);
  };

  const handlePresetSelect = (preset: ShiftPreset) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const handleConfirm = async () => {
    if (!selectedDay || selectedEmployeeIds.length === 0) return;
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    const shifts = selectedEmployeeIds.map((empId) => ({
      shift_date: dateStr,
      branch,
      department: selectedDept,
      employee_id: empId,
      start_time: startTime,
      end_time: endTime,
      notes: notes || null,
      status: "scheduled" as string,
      is_published: publishNow,
    }));
    await onCreateShifts(shifts);
    setCreatedCount(shifts.length);
    setShowNextActions(true);
  };

  // Next actions after creation
  const handleNextAction = (action: "same_time" | "same_day" | "next_day" | "grid") => {
    if (action === "grid") {
      handleClose();
      return;
    }
    if (action === "same_time") {
      // Keep day + time, reset staff
      setSelectedEmployeeIds([]);
      setStep("staff");
      setShowNextActions(false);
      return;
    }
    if (action === "same_day") {
      // Keep day, reset everything else
      setSelectedEmployeeIds([]);
      setNotes("");
      setStep("staff");
      setShowNextActions(false);
      return;
    }
    if (action === "next_day" && selectedDay) {
      const currentIdx = weekDays.findIndex((d) => isSameDay(d, selectedDay));
      const nextIdx = currentIdx + 1;
      if (nextIdx < weekDays.length) {
        const nextDay = weekDays[nextIdx];
        setSelectedDay(nextDay);
        const dayAbbr = DAY_ABBR[nextDay.getDay() === 0 ? 6 : nextDay.getDay() - 1] as DayOfWeek;
        const defaults = getDefaultTimes(selectedDept as any, dayAbbr);
        setStartTime(defaults.start);
        setEndTime(defaults.end);
      }
      setSelectedEmployeeIds([]);
      setNotes("");
      setStep("staff");
      setShowNextActions(false);
    }
  };

  const calcHours = () => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins / 60;
  };

  const getExistingShiftsForDay = (day: Date) =>
    existingShifts.filter((s: any) =>
      isSameDay(new Date(s.shift_date + "T00:00:00"), day) &&
      s.branch === branch &&
      s.department === selectedDept
    );

  // Check for overlap warnings
  const getOverlapWarnings = () => {
    if (!selectedDay) return [];
    const warnings: string[] = [];
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    
    for (const empId of selectedEmployeeIds) {
      const emp = deptEmployees.find((e) => e.id === empId);
      // Check all shifts for this employee on this day (any branch/dept)
      const allDayShifts = existingShifts.filter(
        (s: any) => s.employee_id === empId && s.shift_date === dateStr
      );
      if (allDayShifts.length > 0) {
        warnings.push(`${emp?.forename || "Unknown"} already has a shift on ${format(selectedDay, "EEE")}`);
      }
    }
    return warnings;
  };

  const stepList: WizardStep[] = departments && department === "All"
    ? ["day", "dept", "staff", "time", "review"]
    : ["day", "staff", "time", "review"];

  const stepIndex = stepList.indexOf(step);
  const stepTitles: Record<WizardStep, string> = {
    day: "Choose Day",
    dept: "Choose Department",
    staff: "Select Staff",
    time: "Set Time",
    review: "Review & Confirm",
  };

  const goBack = () => {
    const idx = stepList.indexOf(step);
    if (idx > 0) setStep(stepList[idx - 1]);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            {step !== "day" && !showNextActions && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DrawerTitle className="text-left text-base">
                {showNextActions ? "Shifts Created ✓" : stepTitles[step]}
              </DrawerTitle>
              <p className="text-xs text-muted-foreground text-left mt-0.5">
                {branch} · {selectedDept}
                {selectedDay && ` · ${format(selectedDay, "EEE d MMM")}`}
              </p>
            </div>
            {!showNextActions && (
              <div className="flex gap-1">
                {stepList.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      stepList.length <= 4 ? "w-6" : "w-5",
                      step === s ? "bg-primary" : i < stepIndex ? "bg-primary/40" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto max-h-[55vh]">
          {/* NEXT ACTIONS after creation */}
          {showNextActions && (
            <div className="space-y-3 py-2">
              <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
                <Check className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {createdCount} shift{createdCount !== 1 ? "s" : ""} created
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDay && format(selectedDay, "EEEE d MMM")} · {startTime}–{endTime}
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleNextAction("same_time")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:border-primary/30 transition-all active:scale-[0.98]"
                >
                  <Users className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <span className="text-sm font-medium">Add more staff, same time</span>
                    <p className="text-xs text-muted-foreground">Same day & shift time</p>
                  </div>
                </button>
                <button
                  onClick={() => handleNextAction("same_day")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:border-primary/30 transition-all active:scale-[0.98]"
                >
                  <Clock className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <span className="text-sm font-medium">Add another shift, same day</span>
                    <p className="text-xs text-muted-foreground">Different time slot</p>
                  </div>
                </button>
                {selectedDay && weekDays.findIndex((d) => isSameDay(d, selectedDay)) < weekDays.length - 1 && (
                  <button
                    onClick={() => handleNextAction("next_day")}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:border-primary/30 transition-all active:scale-[0.98]"
                  >
                    <ChevronRight className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <span className="text-sm font-medium">Move to next day</span>
                      <p className="text-xs text-muted-foreground">
                        {weekDays[weekDays.findIndex((d) => isSameDay(d, selectedDay!)) + 1] &&
                          format(weekDays[weekDays.findIndex((d) => isSameDay(d, selectedDay!)) + 1], "EEEE")}
                      </p>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => handleNextAction("grid")}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to grid
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Day selection */}
          {!showNextActions && step === "day" && (
            <div className="grid grid-cols-1 gap-2">
              {weekDays.map((day) => {
                const dayShifts = getExistingShiftsForDay(day);
                const assignedCount = dayShifts.filter((s: any) => s.employee_id).length;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDaySelect(day)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all active:scale-[0.98]",
                      isToday
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex flex-col items-center justify-center",
                        isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <span className="text-[9px] font-medium uppercase leading-none">
                          {format(day, "EEE")}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-foreground">
                          {format(day, "EEEE")}
                        </span>
                        {isToday && (
                          <Badge variant="secondary" className="ml-2 text-[9px] py-0 px-1.5">Today</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {assignedCount > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {assignedCount} shift{assignedCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">No shifts</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 1b: Department selection (only when "All" is selected) */}
          {!showNextActions && step === "dept" && departments && (
            <div className="grid grid-cols-1 gap-2">
              {departments.filter(d => d !== "All").map((dept) => {
                const deptEmpCount = employees.filter((e) => e.department === dept && e.status === "active").length;
                return (
                  <button
                    key={dept}
                    onClick={() => handleDeptSelect(dept)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all active:scale-[0.98]",
                      selectedDept === dept
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <span className="text-sm font-medium">{dept}</span>
                    <span className="text-xs text-muted-foreground">{deptEmpCount} staff</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Staff selection */}
          {!showNextActions && step === "staff" && (
            <div className="space-y-2">
              {deptEmployees.length > 2 && (
                <div className="flex justify-end mb-1">
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary font-medium px-2 py-1 rounded hover:bg-primary/5"
                  >
                    Select all available
                  </button>
                </div>
              )}
              {deptEmployees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.id);
                const hasExistingShift = selectedDay && getExistingShiftsForDay(selectedDay).some(
                  (s: any) => s.employee_id === emp.id
                );

                return (
                  <button
                    key={emp.id}
                    onClick={() => !hasExistingShift && toggleEmployee(emp.id)}
                    disabled={!!hasExistingShift}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                      hasExistingShift
                        ? "opacity-40 cursor-not-allowed border-border"
                        : isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30 active:scale-[0.98]"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {emp.forename[0]}{emp.surname?.[0] || ""}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium text-foreground">
                        {emp.forename} {emp.surname}
                      </span>
                      {hasExistingShift && (
                        <span className="text-xs text-muted-foreground ml-2">Already scheduled</span>
                      )}
                    </div>
                    {emp.hourly_rate && (
                      <span className="text-xs text-muted-foreground">£{Number(emp.hourly_rate).toFixed(2)}/h</span>
                    )}
                  </button>
                );
              })}
              {deptEmployees.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No {selectedDept} staff found
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Time selection with presets */}
          {!showNextActions && step === "time" && (
            <div className="space-y-5 py-2">
              {/* Preset quick-picks */}
              {presets.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Quick pick
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => {
                      const isActive = startTime === p.start && endTime === p.end;
                      return (
                        <button
                          key={p.label}
                          onClick={() => handlePresetSelect(p)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all active:scale-95",
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          {p.label}
                          <span className="block text-[10px] opacity-70 mt-0.5">{p.start}–{p.end}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual time inputs */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-12 text-lg text-center font-mono"
                  />
                </div>
                <div className="pt-5 text-muted-foreground">→</div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">End</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-12 text-lg text-center font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{calcHours().toFixed(1)} hours per person</span>
              </div>

              {/* Optional fields */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Private event, training shift..."
                    className="h-16 text-sm resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Publish immediately</label>
                  <Switch checked={publishNow} onCheckedChange={setPublishNow} />
                </div>
              </div>

              {/* Staff summary */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span>{selectedEmployeeIds.length} staff selected</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployeeIds.map((id) => {
                    const emp = deptEmployees.find((e) => e.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {emp?.forename || "Unknown"}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {!showNextActions && step === "review" && selectedDay && (
            <div className="space-y-4 py-2">
              {/* Warnings */}
              {getOverlapWarnings().length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-1">
                  {getOverlapWarnings().map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Day</span>
                  <span className="font-medium">{format(selectedDay, "EEEE d MMM")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{selectedDept}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium font-mono">{startTime} — {endTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-medium">{calcHours().toFixed(1)}h each</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{branch}</span>
                </div>
                {notes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{notes}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={publishNow ? "default" : "secondary"} className="text-[10px]">
                    {publishNow ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Staff ({selectedEmployeeIds.length})
                </h4>
                <div className="space-y-1.5">
                  {selectedEmployeeIds.map((id) => {
                    const emp = deptEmployees.find((e) => e.id === id);
                    if (!emp) return null;
                    const cost = calcHours() * (Number(emp.hourly_rate) || 0);
                    return (
                      <div key={id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {emp.forename[0]}{emp.surname?.[0] || ""}
                          </div>
                          <span className="text-sm font-medium">{emp.forename} {emp.surname}</span>
                        </div>
                        {cost > 0 && (
                          <span className="text-xs text-muted-foreground">£{cost.toFixed(2)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {!showNextActions && (
          <DrawerFooter className="pt-2">
            {step === "staff" && (
              <Button
                onClick={() => setStep("time")}
                disabled={selectedEmployeeIds.length === 0}
                className="h-12 text-base"
              >
                <span>Continue with {selectedEmployeeIds.length} staff</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "time" && (
              <Button
                onClick={() => setStep("review")}
                className="h-12 text-base"
              >
                Review shifts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "review" && (
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className="h-12 text-base bg-success hover:bg-success/90 text-success-foreground"
              >
                {isPending ? "Creating..." : `Create ${selectedEmployeeIds.length} shift${selectedEmployeeIds.length !== 1 ? "s" : ""}`}
                <Check className="h-4 w-4 ml-1" />
              </Button>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
