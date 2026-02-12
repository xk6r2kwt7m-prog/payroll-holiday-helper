import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { Employee } from "@/hooks/useEmployees";

interface ShiftCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  branch: string;
  department: string;
  employees: Employee[];
  defaultStart: string;
  defaultEnd: string;
  // For editing existing shifts
  existingShift?: {
    id: string;
    employee_id: string | null;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
  };
  onSave: (data: {
    employee_id: string | null;
    start_time: string;
    end_time: string;
    notes: string;
  }) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  isPending?: boolean;
}

export function ShiftCellDialog({
  open,
  onOpenChange,
  date,
  branch,
  department,
  employees,
  defaultStart,
  defaultEnd,
  existingShift,
  onSave,
  onDelete,
  onApprove,
  isPending,
}: ShiftCellDialogProps) {
  const [employeeId, setEmployeeId] = useState<string>("open");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingShift) {
      setEmployeeId(existingShift.employee_id || "open");
      setStartTime(existingShift.start_time?.slice(0, 5) || defaultStart);
      setEndTime(existingShift.end_time?.slice(0, 5) || defaultEnd);
      setNotes(existingShift.notes || "");
    } else {
      setEmployeeId("open");
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setNotes("");
    }
  }, [existingShift, defaultStart, defaultEnd, open]);

  const handleSave = () => {
    onSave({
      employee_id: employeeId === "open" ? null : employeeId,
      start_time: startTime,
      end_time: endTime,
      notes,
    });
  };

  const isEditing = !!existingShift;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditing ? "Edit Shift" : "Add Shift"} — {date}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {branch} · {department}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Open Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Shift</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.forename} {e.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                className="h-9"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                className="h-9"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              className="h-9"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={isPending} className="flex-1" size="sm">
              {isPending ? "Saving..." : isEditing ? "Update" : "Add Shift"}
            </Button>
            {isEditing && existingShift?.status === "scheduled" && onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(existingShift.id)}
                className="text-success border-success/30"
              >
                Approve
              </Button>
            )}
            {isEditing && onDelete && (
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                onClick={() => onDelete(existingShift!.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
