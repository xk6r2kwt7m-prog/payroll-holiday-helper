import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, FileText, Pencil, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import type { ReactNode } from "react";

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
  children: ReactNode;
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
  children,
}: ShiftDetailPopoverProps) {
  // Calculate total hours
  const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const totalHours = totalMinutes / 60;

  const shiftDate = new Date(shift.shift_date + "T00:00:00");

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {employeeName?.[0] || "?"}
            </div>
            <span className="font-semibold text-sm">
              {employeeName || "Open Shift"}
            </span>
          </div>
          <Badge
            variant={shift.is_published ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {shift.is_published ? "LOCKED" : "DRAFT"}
          </Badge>
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{format(shiftDate, "EEE d MMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {shift.start_time?.slice(0, 5)} — {shift.end_time?.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{branch} ({department})</span>
          </div>
          {shift.notes && (
            <div className="flex items-start gap-2.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="text-xs">{shift.notes}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground font-medium">
            Total: {totalHours.toFixed(1)}h
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1">
              {onCopy && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
