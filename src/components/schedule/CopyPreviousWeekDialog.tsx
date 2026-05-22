import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from "date-fns";

interface CopyPreviousWeekDialogProps {
  currentWeekStart: Date;
  branch: string;
  department: string;
  existingShiftCount: number;
  onCopy: (prevWeekStart: string, prevWeekEnd: string) => Promise<void>;
  isPending: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CopyPreviousWeekDialog({
  currentWeekStart,
  branch,
  department,
  existingShiftCount,
  onCopy,
  isPending,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CopyPreviousWeekDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [copyMode, setCopyMode] = useState<"from_previous" | "to_next">("from_previous");

  const prevWeekStart = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
  const hasExisting = existingShiftCount > 0;
  const [confirmedAddAlongside, setConfirmedAddAlongside] = useState(false);

  const handleCopy = async () => {
    if (hasExisting && !confirmedAddAlongside) return; // explicit confirmation required
    if (copyMode === "from_previous") {
      await onCopy(
        format(prevWeekStart, "yyyy-MM-dd"),
        format(prevWeekEnd, "yyyy-MM-dd")
      );
    }
    setConfirmedAddAlongside(false);
    setOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Copy shifts</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy {department} shifts for {branch}.
              </p>
              <RadioGroup value={copyMode} onValueChange={(v) => setCopyMode(v as any)} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="from_previous" id="from_previous" />
                  <Label htmlFor="from_previous" className="text-sm font-normal cursor-pointer">
                    Copy from previous week
                    <span className="block text-[11px] text-muted-foreground">
                      {format(prevWeekStart, "d MMM")} – {format(prevWeekEnd, "d MMM")}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              {existingShiftCount > 0 && (
                <p className="text-xs text-destructive font-medium">
                  ⚠ Current week already has {existingShiftCount} shifts. Copied shifts will be added alongside existing ones.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCopy} disabled={isPending}>
            {isPending ? "Copying..." : "Copy"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
