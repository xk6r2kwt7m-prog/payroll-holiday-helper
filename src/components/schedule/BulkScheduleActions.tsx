import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreVertical, Trash2, UserX, Clock } from "lucide-react";

type BulkAction = "delete_all" | "clear_assignments" | "bulk_update_times";

interface BulkScheduleActionsProps {
  branch: string;
  department: string;
  shiftCount: number;
  assignedCount: number;
  onDeleteAll: () => Promise<void>;
  onClearAssignments: () => Promise<void>;
  onBulkUpdateTimes: (startTime: string, endTime: string) => Promise<void>;
  isPending: boolean;
}

export function BulkScheduleActions({
  branch,
  department,
  shiftCount,
  assignedCount,
  onDeleteAll,
  onClearAssignments,
  onBulkUpdateTimes,
  isPending,
}: BulkScheduleActionsProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [bulkStart, setBulkStart] = useState("11:30");
  const [bulkEnd, setBulkEnd] = useState("22:30");

  const handleConfirm = async () => {
    try {
      if (confirmAction === "delete_all") {
        await onDeleteAll();
      } else if (confirmAction === "clear_assignments") {
        await onClearAssignments();
      } else if (confirmAction === "bulk_update_times") {
        await onBulkUpdateTimes(bulkStart, bulkEnd);
      }
    } finally {
      setConfirmAction(null);
    }
  };

  const titles: Record<BulkAction, string> = {
    delete_all: "Delete All Shifts",
    clear_assignments: "Clear All Assignments",
    bulk_update_times: "Bulk Update Times",
  };

  const descriptions: Record<BulkAction, string> = {
    delete_all: `This will permanently delete all ${shiftCount} shifts for ${department} at ${branch} this week. This cannot be undone.`,
    clear_assignments: `This will remove employee assignments from all ${assignedCount} assigned shifts for ${department} at ${branch} this week, turning them into open shifts.`,
    bulk_update_times: `This will update the start and end times for all ${shiftCount} shifts for ${department} at ${branch} this week.`,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={() => setConfirmAction("bulk_update_times")}
            disabled={shiftCount === 0}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Bulk Update Times
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction("clear_assignments")}
            disabled={assignedCount === 0}
            className="gap-2"
          >
            <UserX className="h-4 w-4" />
            Clear All Assignments
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmAction("delete_all")}
            disabled={shiftCount === 0}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete All Shifts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? titles[confirmAction] : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? descriptions[confirmAction] : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction === "bulk_update_times" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div>
                <Label className="text-xs">New Start Time</Label>
                <Input
                  type="time"
                  className="h-9"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">New End Time</Label>
                <Input
                  type="time"
                  className="h-9"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className={confirmAction === "delete_all" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
