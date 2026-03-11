import { useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ChevronLeft, ChevronRight, Check, Plus, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";
import { getDefaultTimes, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";

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
  }>) => Promise<void>;
  isPending: boolean;
}

type WizardStep = "day" | "staff" | "time" | "review";

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
}: MobileShiftWizardProps) {
  const [step, setStep] = useState<WizardStep>("day");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("11:30");
  const [endTime, setEndTime] = useState("22:30");

  const deptEmployees = useMemo(
    () => employees.filter((e) => e.department === department && e.status === "active"),
    [employees, department]
  );

  const resetWizard = () => {
    setStep("day");
    setSelectedDay(null);
    setSelectedEmployeeIds([]);
    setStartTime("11:30");
    setEndTime("22:30");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetWizard, 300);
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day);
    const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
    const defaults = getDefaultTimes(department as any, dayAbbr);
    setStartTime(defaults.start);
    setEndTime(defaults.end);
    setStep("staff");
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!selectedDay || selectedEmployeeIds.length === 0) return;
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    const shifts = selectedEmployeeIds.map((empId) => ({
      shift_date: dateStr,
      branch,
      department,
      employee_id: empId,
      start_time: startTime,
      end_time: endTime,
      notes: null as string | null,
      status: "scheduled" as string,
    }));
    await onCreateShifts(shifts);
    handleClose();
  };

  // Calculate hours
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
      s.department === department
    );

  const stepTitles: Record<WizardStep, string> = {
    day: "Choose Day",
    staff: "Select Staff",
    time: "Set Time",
    review: "Review & Confirm",
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            {step !== "day" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (step === "staff") setStep("day");
                  else if (step === "time") setStep("staff");
                  else if (step === "review") setStep("time");
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DrawerTitle className="text-left text-base">
                {stepTitles[step]}
              </DrawerTitle>
              <p className="text-xs text-muted-foreground text-left mt-0.5">
                {branch} · {department}
                {selectedDay && ` · ${format(selectedDay, "EEE d MMM")}`}
              </p>
            </div>
            {/* Step indicator */}
            <div className="flex gap-1">
              {(["day", "staff", "time", "review"] as WizardStep[]).map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors",
                    step === s ? "bg-primary" : i < ["day", "staff", "time", "review"].indexOf(step) ? "bg-primary/40" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto max-h-[50vh]">
          {/* STEP 1: Day selection */}
          {step === "day" && (
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

          {/* STEP 2: Staff selection */}
          {step === "staff" && (
            <div className="space-y-2">
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
                  No {department} staff found
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Time selection */}
          {step === "time" && (
            <div className="space-y-6 py-4">
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
          {step === "review" && selectedDay && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Day</span>
                  <span className="font-medium">{format(selectedDay, "EEEE d MMM")}</span>
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
                  <span className="font-medium">{branch} · {department}</span>
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
      </DrawerContent>
    </Drawer>
  );
}
