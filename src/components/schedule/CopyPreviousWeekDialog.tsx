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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";

interface CopyPreviousWeekDialogProps {
  currentWeekStart: Date;
  branch: string;
  department: string;
  existingShiftCount: number;
  onCopy: (prevWeekStart: string, prevWeekEnd: string) => Promise<void>;
  isPending: boolean;
}

export function CopyPreviousWeekDialog({
  currentWeekStart,
  branch,
  department,
  existingShiftCount,
  onCopy,
  isPending,
}: CopyPreviousWeekDialogProps) {
  const [open, setOpen] = useState(false);

  const prevWeekStart = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });

  const handleCopy = async () => {
    await onCopy(
      format(prevWeekStart, "yyyy-MM-dd"),
      format(prevWeekEnd, "yyyy-MM-dd")
    );
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Copy Last Week
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Copy Previous Week's Rota</AlertDialogTitle>
          <AlertDialogDescription>
            This will copy all {department} shifts from {branch} for the week of{" "}
            <strong>{format(prevWeekStart, "d MMM")} – {format(prevWeekEnd, "d MMM")}</strong>{" "}
            into the current week as draft shifts.
            {existingShiftCount > 0 && (
              <span className="block mt-2 text-destructive font-medium">
                ⚠ The current week already has {existingShiftCount} shifts for this department.
                Copied shifts will be added alongside existing ones.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCopy} disabled={isPending}>
            {isPending ? "Copying..." : "Copy Shifts"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
