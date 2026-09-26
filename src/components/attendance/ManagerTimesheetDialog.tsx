import { useEffect, useState } from "react";
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
import { useTenant } from "@/hooks/useTenant";
import { timesheetWallParts, timesheetWallToIso } from "@/lib/timesheet-wall-time";

interface ManagerTimesheetDialogProps {
  open: boolean;
  onClose: () => void;
  /** If provided, we're editing; otherwise adding */
  entry?: any;
}

export function ManagerTimesheetDialog({ open, onClose, entry }: ManagerTimesheetDialogProps) {
  const isEdit = !!entry;
  const { tenantTimezone } = useTenant();
  const initialIn = entry?.clock_in_time && tenantTimezone ? timesheetWallParts(entry.clock_in_time, tenantTimezone) : null;
  const initialOut = entry?.clock_out_time && tenantTimezone ? timesheetWallParts(entry.clock_out_time, tenantTimezone) : null;
  const today = tenantTimezone ? timesheetWallParts(new Date(), tenantTimezone).date : "";

  const [employeeId, setEmployeeId] = useState(entry?.employee_id || "");
  const [branch, setBranch] = useState(entry?.branch || "");
  const [clockInDate, setClockInDate] = useState(initialIn?.date || today);
  const [clockInTime, setClockInTime] = useState(initialIn?.time || "");
  const [clockOutDate, setClockOutDate] = useState(initialOut?.date || initialIn?.date || today);
  const [clockOutTime, setClockOutTime] = useState(initialOut?.time || "");
  const [breakMinutes, setBreakMinutes] = useState(String(entry?.break_minutes || "0"));
  const [reason, setReason] = useState("");

  // The same dialog can be reopened for a different entry.
  useEffect(() => {
    if (!open) return;
    setEmployeeId(entry?.employee_id || "");
    setBranch(entry?.branch || "");
    setClockInDate(initialIn?.date || today);
    setClockInTime(initialIn?.time || "");
    setClockOutDate(initialOut?.date || initialIn?.date || today);
    setClockOutTime(initialOut?.time || "");
    setBreakMinutes(String(entry?.break_minutes ?? 0));
    setReason("");
  }, [open, entry?.id, tenantTimezone]);

  const addEntry = useManagerAddTimeEntry();
  const editEntry = useManagerEditTimeEntry();
  const { data: branches = [] } = useBranchLocations();
  const { data: employees = [] } = useEmployees();

  const canSubmit = Boolean(tenantTimezone && clockInDate && clockInTime && reason.trim() &&
    (!clockOutTime || clockOutDate) && (isEdit || (employeeId && branch)));

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Adjustment reason is required");
      return;
    }

    try {
      if (!tenantTimezone) throw new Error("Workspace timezone is unavailable. Please try again later.");
      if (initialOut && !clockOutTime) {
        throw new Error("A recorded clock-out cannot be cleared here. Contact an administrator to review this entry.");
      }
      // Preserve an existing exact instant if its visible wall time was not edited,
      // including the repeated hour at the end of British Summer Time.
      const clockInIso = initialIn?.date === clockInDate && initialIn?.time === clockInTime
        ? entry.clock_in_time
        : timesheetWallToIso(clockInDate, clockInTime, tenantTimezone);
      const clockOutIso = clockOutTime
        ? initialOut?.date === clockOutDate && initialOut?.time === clockOutTime
          ? entry.clock_out_time
          : timesheetWallToIso(clockOutDate, clockOutTime, tenantTimezone)
        : undefined;
      if (clockOutIso && new Date(clockOutIso) <= new Date(clockInIso)) {
        throw new Error("Clock-out must be after clock-in. For an overnight shift, choose the next date for clock-out.");
      }
      if (isEdit) {
        const updates: Record<string, any> = {};
        updates.clock_in_time = clockInIso;
        if (clockOutIso) updates.clock_out_time = clockOutIso;
        updates.break_minutes = Math.max(0, parseInt(breakMinutes) || 0);
        if (branch) updates.branch = branch;

        await editEntry.mutateAsync({
          entryId: entry.id,
          updates,
          reason: reason.trim(),
        });
        toast.success("Timesheet entry updated");
      } else {
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
            <Label htmlFor="manager-clock-in-date">Clock-in date</Label>
            <Input id="manager-clock-in-date" type="date" value={clockInDate} onChange={(e) => setClockInDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manager-clock-in-time">Clock-in time</Label>
              <Input id="manager-clock-in-time" type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manager-clock-out-date">Clock-out date</Label>
              <Input id="manager-clock-out-date" type="date" value={clockOutDate} onChange={(e) => setClockOutDate(e.target.value)} />
              <Label htmlFor="manager-clock-out-time">Clock-out time (optional)</Label>
              <Input id="manager-clock-out-time" type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Times shown in {tenantTimezone || "workspace timezone loading"}. For overnight work, set the clock-out date to the following day.</p>

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
