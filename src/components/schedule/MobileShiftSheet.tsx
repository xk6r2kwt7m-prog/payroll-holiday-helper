import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Pencil, Copy, Trash2, Clock, MapPin, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MobileShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  employeeName: string;
  branch: string;
  department: string;
  isAdmin: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function MobileShiftSheet({
  open,
  onOpenChange,
  shift,
  employeeName,
  branch,
  department,
  isAdmin,
  onEdit,
  onCopy,
  onDelete,
}: MobileShiftSheetProps) {
  if (!shift) return null;

  const totalInfo = useMemo(() => {
    const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
    const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const hours = totalMinutes / 60;
    return {
      hours,
      hoursStr: `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`,
    };
  }, [shift]);

  const shiftDate = new Date(shift.shift_date + "T00:00:00");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
              shift.employee_id ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            )}>
              {employeeName?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-left">{employeeName || "Open Shift"}</DrawerTitle>
              <DrawerDescription className="text-left">
                {format(shiftDate, "EEE d MMM")} · {totalInfo.hoursStr}
              </DrawerDescription>
            </div>
            <Badge
              variant={shift.is_published ? "default" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {shift.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
        </DrawerHeader>

        {/* Shift details */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {shift.start_time?.slice(0, 5)} — {shift.end_time?.slice(0, 5)}
            </span>
            <span className="text-muted-foreground ml-auto">{totalInfo.hoursStr}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{branch} · {department}</span>
          </div>
          {shift.notes && (
            <div className="flex items-start gap-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{shift.notes}</span>
            </div>
          )}
        </div>

        {/* Action buttons — large touch targets */}
        {isAdmin && (
          <DrawerFooter className="pt-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="h-12 flex-col gap-1"
                onClick={() => { onOpenChange(false); onEdit(); }}
              >
                <Pencil className="h-4 w-4" />
                <span className="text-[10px]">Edit</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-col gap-1"
                onClick={() => { onOpenChange(false); onCopy(); }}
              >
                <Copy className="h-4 w-4" />
                <span className="text-[10px]">Copy</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-col gap-1 text-destructive hover:text-destructive"
                onClick={() => { onOpenChange(false); onDelete(); }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-[10px]">Delete</span>
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
