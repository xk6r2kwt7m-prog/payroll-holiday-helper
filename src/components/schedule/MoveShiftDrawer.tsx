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
import { CalendarDays, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";

interface MoveShiftDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  weekDays: Date[];
  employees: Employee[];
  existingShifts: any[];
  onMove: (shiftId: string, updates: { shift_date: string }) => Promise<void>;
  isPending: boolean;
}

export function MoveShiftDrawer({
  open,
  onOpenChange,
  shift,
  weekDays,
  employees,
  existingShifts,
  onMove,
  isPending,
}: MoveShiftDrawerProps) {
  const [targetDay, setTargetDay] = useState<Date | null>(null);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setTargetDay(null), 300);
  };

  const handleConfirm = async () => {
    if (!shift || !targetDay) return;
    await onMove(shift.id, { shift_date: format(targetDay, "yyyy-MM-dd") });
    handleClose();
  };

  if (!shift) return null;

  const currentEmp = employees.find((e) => e.id === shift.employee_id);
  const currentName = currentEmp ? `${currentEmp.forename} ${currentEmp.surname}` : "Open Shift";

  // Check if moving creates a conflict (same employee already scheduled on target day)
  const hasConflict = targetDay && shift.employee_id
    ? existingShifts.some(
        (s: any) =>
          s.employee_id === shift.employee_id &&
          isSameDay(new Date(s.shift_date + "T00:00:00"), targetDay) &&
          s.id !== shift.id
      )
    : false;

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Move to Another Day
          </DrawerTitle>
          <p className="text-xs text-muted-foreground text-left">
            {currentName} · {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
          </p>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Select day
          </h4>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isCurrent = shift.shift_date === format(day, "yyyy-MM-dd");
              const isSelected = targetDay && isSameDay(targetDay, day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isCurrent && setTargetDay(isSelected ? null : day)}
                  disabled={isCurrent}
                  className={cn(
                    "flex flex-col items-center py-2 rounded-lg border text-center transition-all",
                    isCurrent
                      ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/30 active:scale-95"
                  )}
                >
                  <span className="text-[9px] font-medium uppercase text-muted-foreground">{format(day, "EEE")}</span>
                  <span className="text-sm font-bold">{format(day, "d")}</span>
                  {isCurrent && <span className="text-[8px] text-muted-foreground">Current</span>}
                </button>
              );
            })}
          </div>

          {hasConflict && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                {currentName} already has a shift on {targetDay ? format(targetDay, "EEEE") : "this day"}. Moving will create a double booking.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          <Button
            onClick={handleConfirm}
            disabled={isPending || !targetDay}
            variant={hasConflict ? "destructive" : "default"}
            className="h-12 text-base"
          >
            {isPending ? "Moving..." : hasConflict ? "Move Anyway" : "Confirm Move"}
            <Check className="h-4 w-4 ml-1" />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
