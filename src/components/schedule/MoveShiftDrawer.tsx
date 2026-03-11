import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ArrowRightLeft, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";

type MoveMode = "move" | "copy";

interface MoveShiftDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  weekDays: Date[];
  employees: Employee[];
  department: string;
  branch: string;
  existingShifts: any[];
  onMove: (shiftId: string, updates: { shift_date?: string; employee_id?: string | null }) => Promise<void>;
  onCopy?: (data: { shift_date: string; employee_id: string | null; start_time: string; end_time: string; notes: string | null }) => Promise<void>;
  isPending: boolean;
}

export function MoveShiftDrawer({
  open,
  onOpenChange,
  shift,
  weekDays,
  employees,
  department,
  branch,
  existingShifts,
  onMove,
  onCopy,
  isPending,
}: MoveShiftDrawerProps) {
  const [mode, setMode] = useState<MoveMode>("move");
  const [targetDay, setTargetDay] = useState<Date | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);

  const deptEmployees = employees.filter((e) => e.department === department && e.status === "active");

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setMode("move");
      setTargetDay(null);
      setTargetEmployeeId(null);
    }, 300);
  };

  const handleConfirm = async () => {
    if (!shift) return;

    if (mode === "copy" && onCopy) {
      const date = targetDay ? format(targetDay, "yyyy-MM-dd") : shift.shift_date;
      const empId = targetEmployeeId === "open" ? null : (targetEmployeeId || shift.employee_id);
      await onCopy({
        shift_date: date,
        employee_id: empId,
        start_time: shift.start_time,
        end_time: shift.end_time,
        notes: shift.notes || null,
      });
      handleClose();
      return;
    }

    const updates: any = {};
    if (targetDay) updates.shift_date = format(targetDay, "yyyy-MM-dd");
    if (targetEmployeeId !== null) {
      updates.employee_id = targetEmployeeId === "open" ? null : targetEmployeeId;
      updates.status = targetEmployeeId === "open" ? "open" : "scheduled";
    }
    if (Object.keys(updates).length === 0) return;
    await onMove(shift.id, updates);
    handleClose();
  };

  if (!shift) return null;

  const currentEmp = employees.find((e) => e.id === shift.employee_id);
  const currentName = currentEmp ? `${currentEmp.forename} ${currentEmp.surname}` : "Open Shift";

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            {mode === "move" ? <ArrowRightLeft className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {mode === "move" ? "Move Shift" : "Copy Shift"}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground text-left">
            {currentName} · {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
          </p>
          {/* Mode toggle */}
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setMode("move")}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                mode === "move"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Move
            </button>
            <button
              onClick={() => setMode("copy")}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                mode === "copy"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Copy
            </button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto max-h-[50vh] space-y-4">
          {/* Day selection */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {mode === "move" ? "Move to day" : "Copy to day"}
            </h4>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isCurrent = shift.shift_date === format(day, "yyyy-MM-dd");
                const isSelected = targetDay && isSameDay(targetDay, day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setTargetDay(isSelected ? null : day)}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-lg border text-center transition-all",
                      isCurrent && mode === "move"
                        ? "border-muted bg-muted/30 opacity-50"
                        : isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 active:scale-95"
                    )}
                  >
                    <span className="text-[9px] font-medium uppercase text-muted-foreground">{format(day, "EEE")}</span>
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Employee selection */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Reassign to</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => setTargetEmployeeId(targetEmployeeId === "open" ? null : "open")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all",
                  targetEmployeeId === "open"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/30"
                )}
              >
                <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">?</div>
                <span className="text-sm">Open Shift</span>
              </button>
              {deptEmployees.map((emp) => {
                const isCurrent = emp.id === shift.employee_id;
                const isSelected = targetEmployeeId === emp.id;
                const checkDay = targetDay || new Date(shift.shift_date + "T00:00:00");
                const hasConflict = existingShifts.some(
                  (s: any) =>
                    s.employee_id === emp.id &&
                    isSameDay(new Date(s.shift_date + "T00:00:00"), checkDay) &&
                    s.branch === branch &&
                    s.department === department &&
                    s.id !== shift.id
                );

                return (
                  <button
                    key={emp.id}
                    onClick={() => !hasConflict && !(isCurrent && mode === "move") && setTargetEmployeeId(isSelected ? null : emp.id)}
                    disabled={hasConflict || (isCurrent && mode === "move")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all",
                      (isCurrent && mode === "move")
                        ? "border-muted opacity-40 cursor-not-allowed"
                        : hasConflict
                          ? "border-destructive/20 opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30 active:scale-[0.98]"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                      isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {emp.forename[0]}{emp.surname?.[0] || ""}
                    </div>
                    <span className="text-sm flex-1 text-left">{emp.forename} {emp.surname}</span>
                    {isCurrent && <Badge variant="secondary" className="text-[9px]">Current</Badge>}
                    {hasConflict && <Badge variant="destructive" className="text-[9px]">Conflict</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <Button
            onClick={handleConfirm}
            disabled={isPending || (!targetDay && !targetEmployeeId)}
            className="h-12 text-base"
          >
            {isPending ? (mode === "move" ? "Moving..." : "Copying...") : (mode === "move" ? "Confirm Move" : "Confirm Copy")}
            <Check className="h-4 w-4 ml-1" />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
