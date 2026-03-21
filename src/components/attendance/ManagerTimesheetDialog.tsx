import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useManagerAddTimeEntry, useManagerEditTimeEntry } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";

interface ManagerTimesheetDialogProps {
  open: boolean;
  onClose: () => void;
  /** If provided, we're editing; otherwise adding */
  entry?: any;
}

export function ManagerTimesheetDialog({ open, onClose, entry }: ManagerTimesheetDialogProps) {
  const isEdit = !!entry;

  const [employeeId, setEmployeeId] = useState(entry?.employee_id || "");
  const [branch, setBranch] = useState(entry?.branch || "");
  const [clockInDate, setClockInDate] = useState(
    entry?.clock_in_time ? format(new Date(entry.clock_in_time), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [clockInTime, setClockInTime] = useState(
    entry?.clock_in_time ? format(new Date(entry.clock_in_time), "HH:mm") : ""
  );
  const [clockOutTime, setClockOutTime] = useState(
    entry?.clock_out_time ? format(new Date(entry.clock_out_time), "HH:mm") : ""
  );
  const [breakMinutes, setBreakMinutes] = useState(String(entry?.break_minutes || "0"));
  const [reason, setReason] = useState("");

  const addEntry = useManagerAddTimeEntry();
  const editEntry = useManagerEditTimeEntry();
  const { data: branches = [] } = useBranchLocations();
  const { data: employees = [] } = useEmployees();

  const canSubmit = reason.trim().length > 0 && (isEdit || (employeeId && branch && clockInTime));

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Adjustment reason is required");
      return;
    }

    try {
      if (isEdit) {
        const updates: Record<string, any> = {};
        const clockInIso = `${clockInDate}T${clockInTime}:00`;
        if (clockInTime) updates.clock_in_time = clockInIso;
        if (clockOutTime) {
          updates.clock_out_time = `${clockInDate}T${clockOutTime}:00`;
        }
        updates.break_minutes = Math.max(0, parseInt(breakMinutes) || 0);
        if (branch) updates.branch = branch;

        await editEntry.mutateAsync({
          entryId: entry.id,
          updates,
          reason: reason.trim(),
          oldValues: {
            clock_in_time: entry.clock_in_time,
            clock_out_time: entry.clock_out_time,
            break_minutes: entry.break_minutes,
            branch: entry.branch,
          },
        });
        toast.success("Timesheet entry updated");
      } else {
        const clockInIso = `${clockInDate}T${clockInTime}:00`;
        const clockOutIso = clockOutTime ? `${clockInDate}T${clockOutTime}:00` : undefined;

        await addEntry.mutateAsync({
          employeeId,
          branch,
          clockInTime: clockInIso,
          clockOutTime: clockOutIso,
          breakMinutes: Math.max(0, parseInt(breakMinutes) || 0),
          reason: reason.trim(),
        });
        toast.success("Timesheet entry added");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Timesheet Entry" : "Add Timesheet Entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e: any) => e.status === "active").map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.forename} {e.surname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b: any) => (
                  <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={clockInDate} onChange={(e) => setClockInDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Clock-in time</Label>
              <Input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Clock-out time</Label>
              <Input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Break (minutes)</Label>
            <Input type="number" min="0" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-destructive">Reason for adjustment *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this entry is being added or changed"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || addEntry.isPending || editEntry.isPending}>
            {addEntry.isPending || editEntry.isPending ? "Saving..." : isEdit ? "Save changes" : "Add entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
