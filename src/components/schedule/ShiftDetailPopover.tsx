import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Clock, MapPin, FileText,
  Pencil, Trash2, Copy, ArrowRightLeft,
  UserPlus, UserMinus, Check,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { Employee } from "@/hooks/useEmployees";

interface ShiftDetailPopoverProps {
  shift: any;
  employeeName?: string;
  branch: string;
  department: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
  onUpdate?: (id: string, updates: any) => Promise<void>;
  children: ReactNode;
  // For inline reassignment
  employees?: Employee[];
  existingShifts?: any[];
}

export function ShiftDetailPopover({
  shift,
  employeeName,
  branch,
  department,
  isAdmin,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onCopy,
  onMove,
  onUpdate,
  children,
  employees = [],
  existingShifts = [],
}: ShiftDetailPopoverProps) {
  const [isReassigning, setIsReassigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate total hours
  const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const totalHours = totalMinutes / 60;

  const shiftDate = new Date(shift.shift_date + "T00:00:00");
  const isOpenShift = !shift.employee_id;

  // Department employees for reassignment
  const deptEmployees = useMemo(
    () => employees.filter((e) => e.department === department && e.status === "active"),
    [employees, department]
  );

  // Employees available (no conflict on this day)
  const availableEmployees = useMemo(() => {
    return deptEmployees.map((emp) => {
      const hasConflict = existingShifts.some(
        (s: any) =>
          s.employee_id === emp.id &&
          isSameDay(new Date(s.shift_date + "T00:00:00"), shiftDate) &&
          s.branch === branch &&
          s.department === department &&
          s.id !== shift.id
      );
      return { ...emp, hasConflict, isCurrent: emp.id === shift.employee_id };
    });
  }, [deptEmployees, existingShifts, shiftDate, branch, department, shift.id, shift.employee_id]);

  const handleReassign = async (empId: string | null) => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(shift.id, {
        employee_id: empId,
        status: empId ? "scheduled" : "open",
      });
      setIsReassigning(false);
      onOpenChange(false);
    } catch {
      // handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (shift.is_published) {
      if (!confirm("This shift is published and visible to staff. Delete it?")) return;
    }
    onDelete?.();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) setIsReassigning(false);
        onOpenChange(o);
      }}
    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
              shift.employee_id ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            )}>
              {employeeName?.[0] || "?"}
            </div>
            <div>
              <span className="font-semibold text-sm block">
                {employeeName || "Open Shift"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {format(shiftDate, "EEE d MMM")} · {totalHours.toFixed(1)}h
              </span>
            </div>
          </div>
          <Badge
            variant={shift.is_published ? "default" : "secondary"}
            className={cn(
              "text-[10px] px-1.5 py-0",
              shift.is_published
                ? "bg-success text-success-foreground"
                : "bg-primary/15 text-primary border border-primary/25"
            )}
          >
            {shift.is_published ? "Published" : "Draft"}
          </Badge>
        </div>

        {/* Reassign mode */}
        {isReassigning ? (
          <div className="px-4 py-3 space-y-2 max-h-[280px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">
              {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)} · {department}
            </p>

            {/* Unassign option */}
            {shift.employee_id && (
              <button
                onClick={() => handleReassign(null)}
                disabled={isSaving}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-accent/30 transition-colors text-left"
              >
                <UserMinus className="h-4 w-4 text-accent shrink-0" />
                <div>
                  <span className="text-sm font-medium">Unassign</span>
                  <span className="block text-[11px] text-muted-foreground">Make open shift</span>
                </div>
              </button>
            )}

            {/* Employee list */}
            {availableEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => !emp.hasConflict && !emp.isCurrent && handleReassign(emp.id)}
                disabled={emp.hasConflict || emp.isCurrent || isSaving}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left",
                  emp.isCurrent
                    ? "border-primary/20 bg-primary/5 opacity-60"
                    : emp.hasConflict
                      ? "border-border opacity-40 cursor-not-allowed"
                      : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  emp.isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {emp.forename[0]}{emp.surname?.[0] || ""}
                </div>
                <span className="text-sm flex-1">{emp.forename} {emp.surname}</span>
                {emp.isCurrent && (
                  <Badge variant="secondary" className="text-[9px]">Current</Badge>
                )}
                {emp.hasConflict && (
                  <Badge variant="destructive" className="text-[9px]">Conflict</Badge>
                )}
              </button>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground mt-1"
              onClick={() => setIsReassigning(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            {/* Details */}
            <div className="px-4 py-3 space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">
                  {shift.start_time?.slice(0, 5)} — {shift.end_time?.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{branch} · {department}</span>
              </div>
              {shift.notes && (
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="text-xs">{shift.notes}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {isAdmin && (
              <div className="px-4 py-3 border-t border-border space-y-1.5">
                {/* Primary actions */}
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setIsReassigning(true); }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isOpenShift ? "Assign" : "Reassign"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Times
                  </Button>
                </div>
                {/* Secondary actions */}
                <div className="flex gap-1.5">
                  {onMove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 gap-1.5 text-[11px] text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onMove(); }}
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      Move Day
                    </Button>
                  )}
                  {onCopy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 gap-1.5 text-[11px] text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onCopy(); }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 gap-1.5 text-[11px] text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
